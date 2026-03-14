// index.js - COMPLETE
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

const startTime = Date.now();
const logger = pino({ level: 'silent' });
global.lastSearch = null;

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
    } catch (error) {}
}

async function handlePairing(sock) {
    setInterval(async () => {
        const pending = server.getPendingPairing();
        if (pending && !pending.code) {
            if (pending.number === config.ownerNumber.split('@')[0]) {
                server.clearPendingPairing();
                return;
            }
            try {
                const code = await sock.requestPairingCode(pending.number);
                pending.code = code.match(/.{1,3}/g).join('-');
                setTimeout(() => server.clearPendingPairing(), 300000);
            } catch (error) {
                server.clearPendingPairing();
            }
        }
    }, 3000);
}

async function startBot() {
    console.log('🚀 Starting M5 BOT...');
    
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['M5 BOT', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            const qrDataURL = await QRCode.toDataURL(qr);
            server.setQR(qrDataURL);
            server.setStatus('waiting');
            console.log('\n📱 Scan QR with WhatsApp');
        }
        
        if (connection === 'open') {
            console.log('✅ Bot connected!');
            server.setStatus('active');
            server.setQR(null);
            handlePairing(sock);
            updateUserCount(sock);
            setInterval(() => updateUserCount(sock), 60000);
            
            await sock.sendMessage(config.ownerNumber, { 
                text: `✅ *M5 BOT Online*\nVersion: ${config.version}` 
            }).catch(() => {});
        }
        
        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                server.setStatus('logged_out');
                fs.rmSync('./sessions', { recursive: true, force: true });
            }
            setTimeout(startBot, 3000);
        }
    });

    sock.ev.on('creds.update', saveCreds);

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

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const chat = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        let text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption || '';
        
        if (chat.endsWith('@g.us') && text) {
            const hasBadWord = await groupCmds.checkBadWords(sock, chat, sender, text);
            if (hasBadWord) return;
        }
        
        if (global.lastSearch?.chat === chat && ['1','2','3'].includes(text)) {
            if (await downloaderCmds.handleReply(sock, chat, sender, text, msg)) return;
        }
        
        if (!text.startsWith(config.prefix)) return;
        
        const args = text.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        console.log(`📩 ${command} from ${sender.split('@')[0]}`);
        
        if (config.mode === 'private' && sender.split('@')[0] !== config.ownerNumber.split('@')[0]) {
            return sock.sendMessage(chat, { text: '🔒 Private mode' });
        }
        
        let groupMetadata = null;
        if (chat.endsWith('@g.us')) {
            groupMetadata = await sock.groupMetadata(chat).catch(() => null);
        }
        
        const uptime = (Date.now() - startTime) / 1000;
        
        try {
            switch(command) {
                // Group commands
                case 'kick': await groupCmds.kick(sock, chat, sender, null, groupMetadata, msg); break;
                case 'add': await groupCmds.add(sock, chat, sender, args); break;
                case 'rvn': await groupCmds.rvn(sock, chat, sender, args, null, msg); break;
                case 'tagall': await groupCmds.tagall(sock, chat, sender, args, null, groupMetadata); break;
                case 'groupinfo': await groupCmds.groupinfo(sock, chat, sender, args, null, groupMetadata); break;
                
                // Warn system
                case 'warnings': case 'warns': await groupCmds.warnings(sock, chat, sender, args, msg); break;
                case 'resetwarns': await groupCmds.resetWarnings(sock, chat, sender, args, msg, groupMetadata); break;
                case 'addbadword': await groupCmds.addBadWord(sock, chat, sender, args, config); break;
                case 'listbadwords': await groupCmds.listBadWords(sock, chat); break;
                
                // Admin commands
                case 'botstatus': await groupCmds.botstatus(sock, chat, sender, args, groupMetadata); break;
                case 'requestadmin': 
                    if (groupMetadata) await adminCmds.requestAdmin(sock, chat, sender, groupMetadata);
                    else await sock.sendMessage(chat, { text: '❌ Groups only' });
                    break;
                case 'forcepromote': await adminCmds.forcePromote(sock, chat, sender, args, groupMetadata); break;
                
                // Owner commands
                case 'shutdown': await ownerCmds.shutdown(sock, chat, sender); break;
                case 'setprefix': await ownerCmds.setprefix(sock, chat, sender, args); break;
                case 'mode': await ownerCmds.mode(sock, chat, sender, args); break;
                case 'promote': await ownerCmds.promote(sock, chat, sender, args, groupMetadata); break;
                case 'demote': await ownerCmds.demote(sock, chat, sender, args, groupMetadata); break;
                
                // Downloader
                case 'play': await downloaderCmds.play(sock, chat, sender, args); break;
                case 'audio': await downloaderCmds.audio(sock, chat, sender, args); break;
                case 'doc': await downloaderCmds.doc(sock, chat, sender, args); break;
                case 'ytlink': await downloaderCmds.ytlink(sock, chat, sender, args); break;
                case 'ytmp3': await downloaderCmds.ytmp3(sock, chat, sender, args); break;
                
                // Utilities
                case 'menu': case 'help': await utilsCmds.menuWithImage(sock, chat, sender, args, config, uptime, groupMetadata); break;
                case 'ping': await utilsCmds.ping(sock, chat); break;
                case 'uptime': await utilsCmds.uptime(sock, chat, config, uptime); break;
                case 'alive': await utilsCmds.alive(sock, chat, config, uptime); break;
                case 'info': case 'me': await utilsCmds.info(sock, chat, sender, args, msg, groupMetadata); break;
                
                default:
                    await sock.sendMessage(chat, { text: `❌ Unknown command. Use ${config.prefix}menu` });
            }
        } catch (error) {
            console.error('Command error:', error);
            await sock.sendMessage(chat, { text: '❌ Error occurred' });
        }
    });
}

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

server.startServer();
startBot();
