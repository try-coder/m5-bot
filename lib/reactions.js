// lib/reactions.js
module.exports = {
    // Command reactions
    async reactWithProcessing(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '🕑', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithSuccess(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '✅', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithError(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '❌', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithDownload(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '🔥', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithFound(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '✔️', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithKick(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '👢', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithAdd(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '➕', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithTag(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '🏷️', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithShutdown(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '💤', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithPrefix(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '🔤', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    },

    async reactWithMode(sock, chat, messageId) {
        if (!messageId) return;
        await sock.sendMessage(chat, { 
            react: { 
                text: '🌍', 
                key: { remoteJid: chat, id: messageId } 
            } 
        });
    }
};
