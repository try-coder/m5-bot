// index.js - COMPLETE FIXED WITH WORKING PAIRING
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const axios = require('axios');
const config = require('./config');
const server = require('./server');
const groupCmds = require('./commands/group');
const ownerCmds = require('./commands/owner');
const utilsCmds = require('./commands/utilities');
const downloaderCmds = require('./commands/downloader');
const adminCmds = require('./commands/admin');

// Track uptime
const startTime = Date.now();

// Logger
const logger = pino({ level: 'silent' });

// Global storage for downloads
global.lastSearch = null;

// ============ USER COUNT FUNCTION ============
async function updateUserCount(sock) {
    try {
        const chats = await sock.groupFetchAllParticipating();
        const users = new Set();
        
        Object.values(chats).forEach(group => {
            group.participants.forEach(p => users.add(p.id));
        });
        
        users.add(config.ownerNumber);
        
        await axios.post(`http://localhost:${config.port}/update-users`, {
            whatsapp: Array.from(users)
        }).catch(() => {});
        
        console.log(`📊 WhatsApp users: ${users.size}`);
    } catch (error) {
        console.log('Could not update user count');
    }
}

// ============ PAIRING HANDLER - FIXED ============
async function handlePairing(sock) {
    // Check for pending pairing every 5 seconds
    setInterval(async () => {
        try {
            const pending = server.getPendingPairing();
            
            // If there's a pending request without a code
            if (pending && !pending.code && pending.status === 'pending') {
                
                // Don't allow pairing owner number with itself
                const ownerNum = config.ownerNumber.split('@')[0];
                if (pending.number === ownerNum) {
                    console.log('❌ Cannot pair owner number with itself');
                    pending.status = 'failed';
                    pending.message = 'Cannot pair owner number';
                    setTimeout(() => server.clearPendingPairing(), 5000);
                    return;
                }
                
                console.log(`🔐 Generating pairing code for: ${pending.number}`);
                
                try {
                    // Request pairing code from WhatsApp
                    const code = await sock.requestPairingCode(pending.number);
                    
                    // Format code nicely (XXX-XXX-XXX)
                    const formattedCode = code.match(/.{1,3}/g).join('-');
                    
                    console.log(`✅ Pairing code generated: ${formattedCode}`);
                    
                    // Store the code
                    pending.code = formattedCode;
                    pending.status = 'ready';
                    
                    // Auto-clear after 5 minutes
                    setTimeout(() => {
                        if (server.getPendingPairing()?.code === formattedCode) {
                            console.log('⏰ Pairing code expired');
                            server.clearPendingPairing();
                        }
                    }, 300000);
                    
                } catch (error) {
                    console.error('❌ Pairing failed:', error.message);
                    pending.status = 'failed';
                    pending.message = error.message;
                    
                    // Clear failed request after 10 seconds
                    setTimeout(() => server.clearPendingPairing(), 10000);
                }
            }
        } catch (error) {
            console.error('Pairing handler error:', error);
        }
    }, 5000);
}

// ============ MAIN BOT FUNCTION ============
async function startBot() {
    console.log('🚀 Starting M5 BOT...');
    console.log('📁 Using sessions folder for auth');
    
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 Using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: logger,
        printQRInTerminal: false,
        browser: ['M5 BOT', 'Chrome', '1.0.0'],
        syncFullHistory: true,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        defaultQueryTimeoutMs: 60000
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 QR Code generated - scan with WhatsApp!');
            const qrDataURL = await QRCode.toDataURL(qr);
            server.setQR(qrDataURL);
            server.setStatus('waiting');
            
            console.log('\n⬇️  Scan this QR code with WhatsApp:');
            const qrTerminal = await QRCode.toString(qr, { type: 'terminal', small: true });
            console.log(qrTerminal);
        }
        
        if (connection === 'open') {
            console.log('✅ Bot connected successfully!');
            console.log(`👤 Owner: ${config.ownerNumber.split('@')[0]}`);
            console.log(`🌐 Mode: ${config.mode}`);
            console.log(`🤖 Bot Name: ${config.botName}`);
            server.setStatus('active');
            server.setQR(null);
            
            // Start pairing handler
            handlePairing(sock);
            
            // Start user count updates
            updateUserCount(sock);
            setInterval(() => updateUserCount(sock), 60000);
            
            // Send online notification to owner
            try {
                await sock.sendMessage(config.ownerNumber, { 
                    text: `✅ *${config.botName} Online*\n\n📅 Version: ${config.version}\n🌍 Mode: ${config.mode}\n⚡ Status: Active\n⏰ Time: ${new Date().toLocaleString()}` 
                });
            } catch (e) {
                console.log('⚠️ Could not send startup message');
            }
        }
        
        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log('❌ Connection closed. Reason:', statusCode || lastDisconnect?.error);
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('⚠️ Bot logged out. Delete sessions folder and restart');
                server.setStatus('logged_out');
                try {
                    fs.rmSync('./sessions', { recursive: true, force: true });
                } catch (e) {}
            } else if (statusCode === 405) {
                console.log('🔄 Version mismatch, reconnecting...');
                setTimeout(startBot, 2000);
            } else {
                console.log('🔄 Reconnecting in 3 seconds...');
                server.setStatus('reconnecting');
                setTimeout(startBot, 3000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Handle when bot is added to groups
    sock.ev.on('groups.upsert', async ({ groups }) => {
        for (const group of groups) {
            if (group.action === 'add') {
                setTimeout(async () => {
                    const groupMetadata = await sock.groupMetadata(group.id);
                    await adminCmds.autoPromoteOwner(sock, group.id, groupMetadata);
                }, 5000);
            }
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const chat = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        let text = '';
        if (msg.message.conversation) {
            text = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
            text = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage?.caption) {
            text = msg.message.imageMessage.caption;
        } else if (msg.message.videoMessage?.caption) {
            text = msg.message.videoMessage.caption;
        }
        
        // ============ BAD WORDS CHECK ============
        if (chat.endsWith('@g.us') && text) {
            const hasBadWord = await groupCmds.checkBadWords(sock, chat, sender, text);
            if (hasBadWord) return;
        }
        
        // ============ HANDLE NUMBER REPLIES FOR DOWNLOADS ============
        if (global.lastSearch && global.lastSearch.chat === chat) {
            if (text === '1' || text === '2' || text === '3') {
                const handled = await downloaderCmds.handleReply(sock, chat, sender, text, msg);
                if (handled) return;
            }
        }
        
        // Check if message starts with prefix
        if (!text || !text.startsWith(config.prefix)) return;
        
        const args = text.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        console.log(`📩 [${new Date().toLocaleTimeString()}] Command: ${command} from ${sender.split('@')[0]}`);
        
        // Check if bot is in private mode and sender is not owner
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (config.mode === 'private' && senderNum !== ownerNum) {
            await sock.sendMessage(chat, { 
                text: '🔒 Bot is in *private mode*. Only owner can use commands.' 
            });
            return;
        }
        
        // Get quoted message
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || null;
        
        // Get group metadata if in group
        let groupMetadata = null;
        if (chat.endsWith('@g.us')) {
            try {
                groupMetadata = await sock.groupMetadata(chat);
            } catch (e) {
                console.log('⚠️ Could not get group metadata');
            }
        }
        
        // Calculate uptime
        const uptime = (Date.now() - startTime) / 1000;
        
        try {
            switch(command) {
                // ==================== GROUP COMMANDS ====================
                case 'kick':
                    await groupCmds.kick(sock, chat, sender, null, groupMetadata, msg);
                    break;
                    
                case 'add':
                    await groupCmds.add(sock, chat, sender, args);
                    break;
                    
                case 'rvn':
                case 'retrieve':
                    await groupCmds.rvn(sock, chat, sender, args, quoted, msg);
                    break;
                    
                case 'tagall':
                    await groupCmds.tagall(sock, chat, sender, args, quoted, groupMetadata);
                    break;
                    
                case 'groupinfo':
                    await groupCmds.groupinfo(sock, chat, sender, args, quoted, groupMetadata);
                    break;
                
                // ==================== WARN SYSTEM COMMANDS ====================
                case 'warnings':
                case 'warns':
                    await groupCmds.warnings(sock, chat, sender, args, msg);
                    break;
                    
                case 'resetwarns':
                case 'resetwarnings':
                    await groupCmds.resetWarnings(sock, chat, sender, args, msg, groupMetadata);
                    break;
                    
                case 'addbadword':
                    await groupCmds.addBadWord(sock, chat, sender, args, config);
                    break;
                    
                case 'listbadwords':
                    await groupCmds.listBadWords(sock, chat);
                    break;
                
                // ==================== ADMIN COMMANDS ====================
                case 'botstatus':
                    await groupCmds.botstatus(sock, chat, sender, args, groupMetadata);
                    break;
                    
                case 'requestadmin':
                    if (groupMetadata) {
                        await adminCmds.requestAdmin(sock, chat, sender, groupMetadata);
                    } else {
                        await sock.sendMessage(chat, { text: '❌ This command only works in groups' });
                    }
                    break;
                    
                case 'forcepromote':
                    await adminCmds.forcePromote(sock, chat, sender, args, groupMetadata);
                    break;
                
                // ==================== OWNER COMMANDS ====================
                case 'shutdown':
                    await ownerCmds.shutdown(sock, chat, sender);
                    break;
                    
                case 'setprefix':
                    await ownerCmds.setprefix(sock, chat, sender, args);
                    break;
                    
                case 'mode':
                    await ownerCmds.mode(sock, chat, sender, args);
                    break;
                    
                case 'promote':
                    await ownerCmds.promote(sock, chat, sender, args, groupMetadata);
                    break;
                    
                case 'demote':
                    await ownerCmds.demote(sock, chat, sender, args, groupMetadata);
                    break;
                
                // ==================== DOWNLOADER COMMANDS ====================
                case 'play':
                    await downloaderCmds.play(sock, chat, sender, args);
                    break;
                    
                case 'audio':
                    await downloaderCmds.audio(sock, chat, sender, args);
                    break;
                    
                case 'doc':
                    await downloaderCmds.doc(sock, chat, sender, args);
                    break;
                    
                case 'ytlink':
                    await downloaderCmds.ytlink(sock, chat, sender, args);
                    break;
                    
                case 'ytmp3':
                    await downloaderCmds.ytmp3(sock, chat, sender, args);
                    break;
                
                // ==================== UTILITIES ====================
                case 'menu':
                case 'help':
                case 'commands':
                case 'cmd':
                    await utilsCmds.menuWithImage(sock, chat, sender, args, config, uptime, groupMetadata);
                    break;
                    
                case 'ping':
                    await utilsCmds.ping(sock, chat);
                    break;
                    
                case 'uptime':
                    await utilsCmds.uptime(sock, chat, config, uptime);
                    break;
                    
                case 'alive':
                    await utilsCmds.alive(sock, chat, config, uptime);
                    break;
                    
                case 'info':
                case 'me':
                    await utilsCmds.info(sock, chat, sender, args, msg, groupMetadata);
                    break;
                    
                case 'delete':
                case 'del':
                    if (msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
                        await sock.sendMessage(chat, { 
                            delete: { 
                                remoteJid: chat, 
                                fromMe: true, 
                                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                                participant: msg.message.extendedTextMessage.contextInfo.participant
                            } 
                        });
                    }
                    break;
                    
                default:
                    await sock.sendMessage(chat, { 
                        text: `❌ Unknown command: *${command}*\nType *${config.prefix}menu* to see available commands` 
                    });
            }
        } catch (error) {
            console.error('❌ Command error:', error);
            await sock.sendMessage(chat, { 
                text: '❌ An error occurred while executing command. Check logs.' 
            });
        }
    });

    return sock;
}

// ============ HELPER FUNCTIONS ============
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
}

// ============ PROCESS HANDLERS ============
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

// ============ START EVERYTHING ============
server.startServer();
startBot().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
