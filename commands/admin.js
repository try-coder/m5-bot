// commands/admin.js
const config = require('../config');

module.exports = {
    // Auto promote owner when bot joins group
    autoPromoteOwner: async (sock, chat, groupMetadata) => {
        try {
            const ownerJid = config.ownerNumber;
            
            const isOwnerInGroup = groupMetadata.participants.find(p => p.id === ownerJid);
            
            if (isOwnerInGroup) {
                const isOwnerAdmin = groupMetadata.participants.find(p => p.id === ownerJid)?.admin;
                
                if (!isOwnerAdmin) {
                    await sock.groupParticipantsUpdate(chat, [ownerJid], 'promote');
                    console.log(`✅ Auto-promoted owner in ${groupMetadata.subject}`);
                    
                    await sock.sendMessage(chat, {
                        text: `👑 Auto-promoted @${ownerJid.split('@')[0]} to admin`,
                        mentions: [ownerJid]
                    });
                }
            }
        } catch (error) {
            console.log('Could not auto-promote owner:', error.message);
        }
    },

    // Request admin from group admins
    requestAdmin: async (sock, chat, sender, groupMetadata) => {
        const admins = groupMetadata.participants.filter(p => p.admin);
        const adminJids = admins.map(a => a.id);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const requestMsg = `👋 *Admin Request*\n\n@${sender.split('@')[0]} is requesting bot admin privileges.\n\nPlease promote @${botId.split('@')[0]} to admin for full functionality.\n\nUse: .promote ${botId.split('@')[0]}`;
        
        await sock.sendMessage(chat, {
            text: requestMsg,
            mentions: [...adminJids, sender, botId]
        });
    },

    // Check bot admin status
    botStatus: async (sock, chat, sender, args, groupMetadata) => {
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
        const ownerJid = config.ownerNumber;
        const isOwnerAdmin = groupMetadata.participants.find(p => p.id === ownerJid)?.admin;
        
        const status = `🤖 *Bot Status*\n\n` +
                      `Bot Admin: ${isBotAdmin ? '✅ Yes' : '❌ No'}\n` +
                      `Owner Admin: ${isOwnerAdmin ? '✅ Yes' : '❌ No'}\n\n` +
                      `${!isBotAdmin ? '❌ Bot needs to be admin to work properly!\nUse .requestadmin to ask admins.' : '✅ Bot has full admin powers!'}`;
        
        await sock.sendMessage(chat, { text: status });
    },

    // Force promote (if bot is admin)
    forcePromote: async (sock, chat, sender, args, groupMetadata) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can use this' });
            return;
        }
        
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin;
        
        if (!isBotAdmin) {
            await sock.sendMessage(chat, { 
                text: '❌ Cannot promote. Bot is not admin. Use .requestadmin first.' 
            });
            return;
        }
        
        try {
            await sock.groupParticipantsUpdate(chat, [config.ownerNumber], 'promote');
            await sock.sendMessage(chat, { 
                text: `✅ Successfully promoted @${ownerNum} to admin`,
                mentions: [config.ownerNumber]
            });
        } catch (error) {
            await sock.sendMessage(chat, { text: '❌ Failed to promote' });
        }
    }
};
