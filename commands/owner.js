// commands/owner.js
const config = require('../config');

module.exports = {
    shutdown: async (sock, chat, sender) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can use this' });
            return;
        }
        
        await sock.sendMessage(chat, { text: '🔻 *Shutting down...*' });
        setTimeout(() => process.exit(0), 2000);
    },

    setprefix: async (sock, chat, sender, args) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can use this' });
            return;
        }
        
        const newPrefix = args[0];
        if (!newPrefix) {
            await sock.sendMessage(chat, { 
                text: '❌ Provide new prefix\nExample: .setprefix !' 
            });
            return;
        }
        
        config.prefix = newPrefix;
        await sock.sendMessage(chat, { 
            text: `✅ Prefix changed to: ${newPrefix}` 
        });
    },

    mode: async (sock, chat, sender, args) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can use this' });
            return;
        }
        
        const newMode = args[0]?.toLowerCase();
        if (!newMode || !['public', 'private'].includes(newMode)) {
            await sock.sendMessage(chat, { 
                text: '❌ Use: .mode public or .mode private' 
            });
            return;
        }
        
        config.mode = newMode;
        await sock.sendMessage(chat, { 
            text: `✅ Mode: ${newMode.toUpperCase()}` 
        });
    },

    promote: async (sock, chat, sender, args, groupMetadata) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can use this' });
            return;
        }
        
        const target = args[0]?.replace(/[^0-9]/g, '');
        if (!target) {
            await sock.sendMessage(chat, { 
                text: '❌ Provide number to promote' 
            });
            return;
        }
        
        let formattedNumber = target;
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '254' + formattedNumber.slice(1);
        } else if (!formattedNumber.startsWith('254')) {
            formattedNumber = '254' + formattedNumber;
        }
        
        try {
            const jid = formattedNumber + '@s.whatsapp.net';
            await sock.groupParticipantsUpdate(chat, [jid], 'promote');
            await sock.sendMessage(chat, { 
                text: `✅ Promoted @${formattedNumber}`,
                mentions: [jid]
            });
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed. Bot needs to be admin.' 
            });
        }
    },

    demote: async (sock, chat, sender, args, groupMetadata) => {
        const ownerNum = config.ownerNumber.split('@')[0];
        const senderNum = sender.split('@')[0];
        
        if (senderNum !== ownerNum) {
            await sock.sendMessage(chat, { text: '❌ Only owner can use this' });
            return;
        }
        
        const target = args[0]?.replace(/[^0-9]/g, '');
        if (!target) {
            await sock.sendMessage(chat, { 
                text: '❌ Provide number to demote' 
            });
            return;
        }
        
        let formattedNumber = target;
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '254' + formattedNumber.slice(1);
        } else if (!formattedNumber.startsWith('254')) {
            formattedNumber = '254' + formattedNumber;
        }
        
        try {
            const jid = formattedNumber + '@s.whatsapp.net';
            await sock.groupParticipantsUpdate(chat, [jid], 'demote');
            await sock.sendMessage(chat, { 
                text: `✅ Demoted @${formattedNumber}`,
                mentions: [jid]
            });
        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Failed.' 
            });
        }
    }
};
