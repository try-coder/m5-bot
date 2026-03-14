// commands/utilities.js
const config = require('../config');

module.exports = {
    menuWithImage: async (sock, chat, sender, args, config, uptime, groupMetadata) => {
        const uptimeString = formatUptime(uptime);
        
        const menuText = `┌──⌈ *M5 BOT* ⌋
┃ Driver: ${sender.split('@')[0]}
┃ Owner: ${config.ownerNumber.split('@')[0]}
┃ Mode: ${config.mode === 'public' ? '🌍 Public' : '🔒 Private'}
┃ Prefix: [ ${config.prefix} ]
┃ Version: ${config.version}
┃ Fuel: ${uptimeString}
└────────────────

╭─── *GROUP*
│ ✦ kick @user
│ ✦ add 2547xxx
│ ✦ rvn
│ ✦ tagall
│ ✦ groupinfo
│ ✦ warnings
│ ✦ resetwarns
╰────────

╭─── *ADMIN*
│ ✦ botstatus
│ ✦ requestadmin
│ ✦ forcepromote
╰────────

╭─── *OWNER*
│ ✦ setprefix
│ ✦ mode
│ ✦ shutdown
│ ✦ promote
│ ✦ demote
╰────────

╭─── *DOWNLOAD*
│ ✦ play [song]
│ ✦ ytmp3 [url]
╰────────

╭─── *UTILS*
│ ✦ ping
│ ✦ uptime
│ ✦ alive
│ ✦ info @user
╰────────

⚡ *M5 BOT v${config.version}* ⚡`;

        await sock.sendMessage(chat, { 
            image: { url: 'https://i.pinimg.com/736x/51/51/fe/5151fe121f248a3a4ec38c3ef84a7108.jpg' },
            caption: menuText
        });
    },

    info: async (sock, chat, sender, args, msg, groupMetadata) => {
        let target = sender;
        let targetNumber = sender.split('@')[0];
        
        if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
            targetNumber = target.split('@')[0];
        } else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            targetNumber = target.split('@')[0];
        } else if (args.length > 0) {
            const number = args[0].replace(/[^0-9]/g, '');
            if (number) {
                let formattedNumber = number;
                if (formattedNumber.startsWith('0')) {
                    formattedNumber = '254' + formattedNumber.slice(1);
                } else if (!formattedNumber.startsWith('254')) {
                    formattedNumber = '254' + formattedNumber;
                }
                target = formattedNumber + '@s.whatsapp.net';
                targetNumber = formattedNumber;
            }
        }

        try {
            let pushName = targetNumber;
            try {
                const contact = await sock.getContact(target);
                pushName = contact.name || contact.notify || targetNumber;
            } catch {}

            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(target, 'image');
            } catch {
                ppUrl = 'https://i.pinimg.com/736x/51/51/fe/5151fe121f248a3a4ec38c3ef84a7108.jpg';
            }

            let isInGroup = 'N/A';
            let isAdmin = 'N/A';
            if (chat.endsWith('@g.us') && groupMetadata) {
                const participant = groupMetadata.participants.find(p => p.id === target);
                isInGroup = participant ? '✅ Yes' : '❌ No';
                isAdmin = participant?.admin ? '✅ Yes' : '❌ No';
            }

            const infoText = `👤 *User Info*
            
📱 *Number:* ${targetNumber}
📛 *Name:* ${pushName}
👥 In Group: ${isInGroup}
👑 Admin: ${isAdmin}`;

            await sock.sendMessage(chat, { 
                image: { url: ppUrl },
                caption: infoText,
                mentions: [target]
            });

        } catch (error) {
            await sock.sendMessage(chat, { 
                text: `❌ Could not get info for @${targetNumber}`,
                mentions: [target]
            });
        }
    },

    ping: async (sock, chat) => {
        const start = Date.now();
        await sock.sendPresenceUpdate('composing', chat);
        const end = Date.now();
        await sock.sendMessage(chat, { 
            text: `⚡ *Pong!*\n📡 ${end - start}ms` 
        });
    },

    uptime: async (sock, chat, config, uptime) => {
        const uptimeString = formatUptime(uptime);
        await sock.sendMessage(chat, { 
            text: `⏱️ *Uptime*\n\n${uptimeString}` 
        });
    },

    alive: async (sock, chat, config, uptime) => {
        const uptimeString = formatUptime(uptime);
        await sock.sendMessage(chat, { 
            text: `🔥 *M5 BOT Alive!*\n\n⏱️ ${uptimeString}\n🌍 Mode: ${config.mode}` 
        });
    }
};

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
