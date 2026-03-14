// commands/group.js
const config = require('../config');
const warnDB = new Map();

const BAD_WORDS = [
    'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'shitting', 'shitted', 'ass', 'asses', 'asshole',
    'bitch', 'bitches', 'bitching', 'damn', 'damned', 'hell', 'hellish', 'cunt', 'cunts',
    'dick', 'dicks', 'dickhead', 'pussy', 'pussies', 'motherfucker', 'mf', 'motherfucking',
    'bastard', 'bastards', 'whore', 'whores', 'slut', 'sluts', 'slutty', 'twat', 'twats',
    'piss', 'pissing', 'pissed', 'cock', 'cocks', 'ballsack', 'balls', 'nutsack', 'nuts',
    'douche', 'douchebag', 'fag', 'faggot', 'fags', 'faggots', 'retard', 'retarded',
    'nigga', 'nigger', 'niggas', 'niggers', 'hoe', 'hoes', 'skank', 'skanks',
    'finger', 'arsehole', 'bloody', 'bollocks', 'bugger', 'crap', 'crapper', 'crapped',
    'sod', 'sodding', 'tosser', 'wanker', 'git', 'chav', 'numpty', 'plonker',
    'prick', 'prat', 'pillock', 'daft', 'muppet', 'div', 'divvy', 'drongo',
    'galah', 'bogan', 'yobbo', 'reject', 'loser', 'losers', 'dumb', 'dumbass',
    'dumbfuck', 'stupid', 'idiot', 'moron', 'imbecile', 'cretin', 'dimwit', 'nitwit',
    'jackass', 'jackasses', 'bullshit', 'bullshitting', 'horseshit', 'crap', 'crappy',
    'sucks', 'sucker', 'suckers', 'suck', 'blow', 'blowjob', 'blowjobs', 'handjob',
    'rimjob', 'tits', 'titties', 'boobs', 'boobies', 'asscheeks', 'buttcheeks'
];

module.exports = {
    checkBadWords: async (sock, chat, sender, text) => {
        if (!text) return false;
        
        const lowerText = text.toLowerCase();
        let foundWord = null;
        
        for (const word of BAD_WORDS) {
            if (lowerText.includes(word)) {
                foundWord = word;
                break;
            }
        }
        
        if (!foundWord) return false;
        
        if (!warnDB.has(chat)) {
            warnDB.set(chat, new Map());
        }
        
        const chatWarns = warnDB.get(chat);
        const currentWarns = chatWarns.get(sender) || 0;
        const newWarnCount = currentWarns + 1;
        
        chatWarns.set(sender, newWarnCount);
        
        let warnMsg = `⚠️ *WARNING!*\n\n`;
        warnMsg += `@${sender.split('@')[0]} used: *${foundWord}*\n`;
        warnMsg += `📊 Warning: ${newWarnCount}/5\n\n`;
        
        if (newWarnCount >= 5) {
            warnMsg += `❌ You have been *kicked*!`;
            try {
                await sock.groupParticipantsUpdate(chat, [sender], 'remove');
                chatWarns.delete(sender);
            } catch (e) {
                warnMsg += `\n⚠️ Could not kick (bot not admin)`;
            }
        } else {
            warnMsg += `${5 - newWarnCount} warnings remaining.`;
        }
        
        await sock.sendMessage(chat, {
            text: warnMsg,
            mentions: [sender]
        });
        
        return true;
    },

    warnings: async (sock, chat, sender, args, msg) => {
        let target = sender;
        
        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        } else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        const chatWarns = warnDB.get(chat);
        const warnCount = chatWarns?.get(target) || 0;
        
        await sock.sendMessage(chat, {
            text: `📊 *Warnings for @${target.split('@')[0]}*\n\n⚠️ Count: ${warnCount}/5`,
            mentions: [target]
        });
    },

    resetWarnings: async (sock, chat, sender, args, msg, groupMetadata) => {
        const isAdmin = groupMetadata?.participants.find(p => p.id === sender)?.admin;
        
        if (!isAdmin) {
            await sock.sendMessage(chat, { text: '❌ Only admins can reset warnings' });
            return;
        }
        
        let target = sender;
        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        }
        
        const chatWarns = warnDB.get(chat);
        if (chatWarns) {
            chatWarns.delete(target);
        }
        
        await sock.sendMessage(chat, {
            text: `✅ Warnings reset for @${target.split('@')[0]}`,
            mentions: [target]
        });
    },

    addBadWord: async (sock, chat, sender, args, config) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can add bad words' });
            return;
        }
        
        const word = args[0]?.toLowerCase();
        if (!word) {
            await sock.sendMessage(chat, { text: '❌ Provide word to add' });
            return;
        }
        
        if (!BAD_WORDS.includes(word)) {
            BAD_WORDS.push(word);
            await sock.sendMessage(chat, { text: `✅ Added "${word}"` });
        }
    },

    listBadWords: async (sock, chat) => {
        const list = BAD_WORDS.slice(0, 50).map((w, i) => `${i+1}. ${w}`).join('\n');
        await sock.sendMessage(chat, { 
            text: `📋 *Bad Words* (${BAD_WORDS.length})\n\n${list}\n\n...and more` 
        });
    },

    kick: async (sock, chat, sender, mentioned, groupMetadata, msg) => {
        let usersToKick = [];
        
        if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
            usersToKick = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            usersToKick = [msg.message.extendedTextMessage.contextInfo.participant];
        }
        
        if (usersToKick.length === 0) {
            await sock.sendMessage(chat, { 
                text: '❌ Tag user to kick\nExample: .kick @user' 
            });
            return;
        }
        
        try {
            await sock.groupParticipantsUpdate(chat, usersToKick, 'remove');
            await sock.sendMessage(chat, { 
                text: `✅ Kicked ${usersToKick.length} user(s)` 
            });
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed. Bot needs to be admin.' 
            });
        }
    },

    add: async (sock, chat, sender, args) => {
        const number = args[0]?.replace(/[^0-9]/g, '');
        if (!number) {
            await sock.sendMessage(chat, { 
                text: '❌ Provide number\nExample: .add 254787031145' 
            });
            return;
        }
        
        let formattedNumber = number;
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '254' + formattedNumber.slice(1);
        } else if (!formattedNumber.startsWith('254')) {
            formattedNumber = '254' + formattedNumber;
        }
        
        try {
            const jid = formattedNumber + '@s.whatsapp.net';
            const [result] = await sock.onWhatsApp(formattedNumber);
            
            if (!result?.exists) {
                await sock.sendMessage(chat, { 
                    text: `❌ Number ${formattedNumber} not on WhatsApp` 
                });
                return;
            }
            
            await sock.groupParticipantsUpdate(chat, [jid], 'add');
            await sock.sendMessage(chat, { 
                text: `✅ Added @${formattedNumber}`,
                mentions: [jid]
            });
            
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed to add user.' 
            });
        }
    },

    rvn: async (sock, chat, sender, args, quoted, msg) => {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
        
        if (!quotedMsg) {
            await sock.sendMessage(chat, { 
                text: '❌ Reply to a view-once message with .rvn' 
            });
            return;
        }
        
        try {
            const messageId = quotedMsg.stanzaId;
            const participant = quotedMsg.participant;
            const viewOnceMsg = quotedMsg.quotedMessage;
            
            if (!viewOnceMsg) {
                await sock.sendMessage(chat, { 
                    text: '❌ Could not retrieve message' 
                });
                return;
            }
            
            const senderNumber = participant?.split('@')[0] || sender.split('@')[0];
            const sentTime = new Date().toLocaleString();
            
            await sock.sendMessage(chat, { text: '🔓 Retrieving...' });
            
            const mediaBuffer = await sock.downloadMediaMessage({
                key: {
                    remoteJid: chat,
                    id: messageId,
                    participant: participant
                },
                message: viewOnceMsg
            });
            
            const caption = `🔓 *View-Once*\n👤 From: @${senderNumber}\n⏱️ ${sentTime}`;
            
            if (viewOnceMsg.imageMessage) {
                await sock.sendMessage(chat, { 
                    image: mediaBuffer,
                    caption: caption,
                    mentions: [participant || sender]
                });
            } else if (viewOnceMsg.videoMessage) {
                await sock.sendMessage(chat, { 
                    video: mediaBuffer,
                    caption: caption,
                    mentions: [participant || sender]
                });
            }
            
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed to retrieve media.' 
            });
        }
    },

    tagall: async (sock, chat, sender, args, quoted, groupMetadata) => {
        try {
            if (!groupMetadata) {
                groupMetadata = await sock.groupMetadata(chat);
            }
            
            const participants = groupMetadata.participants;
            const mentions = participants.map(p => p.id);
            
            let message = '👥 *Tagging all*\n\n';
            if (args.length > 0) {
                message += args.join(' ') + '\n\n';
            }
            
            const mentionText = participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
            
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(chat, 'image');
            } catch {
                ppUrl = 'https://i.pinimg.com/736x/51/51/fe/5151fe121f248a3a4ec38c3ef84a7108.jpg';
            }
            
            await sock.sendMessage(chat, { 
                image: { url: ppUrl },
                caption: message + mentionText,
                mentions: mentions.slice(0, 30)
            });
            
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed to tag all' 
            });
        }
    },

    groupinfo: async (sock, chat, sender, args, quoted, groupMetadata) => {
        try {
            if (!groupMetadata) {
                groupMetadata = await sock.groupMetadata(chat);
            }
            
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin ? '✅ Yes' : '❌ No';
            
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(chat, 'image');
            } catch {
                ppUrl = 'https://i.pinimg.com/736x/51/51/fe/5151fe121f248a3a4ec38c3ef84a7108.jpg';
            }
            
            const info = `📊 *Group Info*
            
📌 *Name:* ${groupMetadata.subject}
👥 *Members:* ${groupMetadata.participants.length}
👑 *Admins:* ${groupMetadata.participants.filter(p => p.admin).length}
🤖 *Bot Admin:* ${isBotAdmin}
📝 *Desc:* ${groupMetadata.desc || 'None'}`;

            await sock.sendMessage(chat, { 
                image: { url: ppUrl },
                caption: info
            });
            
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed to get group info' 
            });
        }
    },

    botstatus: async (sock, chat, sender, args, groupMetadata) => {
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
        const ownerJid = config.ownerNumber;
        const isOwnerAdmin = groupMetadata.participants.find(p => p.id === ownerJid)?.admin;
        
        const status = `🤖 *Bot Status*\n\n` +
                      `Bot Admin: ${isBotAdmin ? '✅ Yes' : '❌ No'}\n` +
                      `Owner Admin: ${isOwnerAdmin ? '✅ Yes' : '❌ No'}\n\n` +
                      `${!isBotAdmin ? '❌ Use .requestadmin to ask for admin' : '✅ Bot has full powers!'}`;
        
        await sock.sendMessage(chat, { text: status });
    }
};
