// telegram.js - COMPLETE FIXED VERSION
const { Telegraf } = require('telegraf');
const axios = require('axios');
const config = require('./config');

console.log('🤖 Starting TRAGICAL Telegram Bot...');
console.log(`📱 Bot username: @${config.telegramBotUsername}`);

const YOUR_TELEGRAM_ID = 8037798660;
let connectedUsers = [];

// Initialize bot
const bot = new Telegraf(config.telegramToken, {
    telegram: {
        apiRoot: 'https://api.telegram.org',
        timeout: 30000,
        webhookReply: false
    }
});

// Track connected users
bot.use((ctx, next) => {
    const userId = ctx.from?.id;
    if (userId && !connectedUsers.includes(userId)) {
        connectedUsers.push(userId);
        // Update server
        axios.post(`http://localhost:${config.port}/update-users`, {
            telegram: connectedUsers
        }).catch(() => {});
    }
    return next();
});

// Error handler
bot.catch((err, ctx) => {
    console.error('❌ Telegram Error:', err);
    ctx?.reply('❌ An error occurred').catch(() => {});
});

// Start command
bot.start(async (ctx) => {
    await ctx.reply(`👋 *Welcome to TRAGICAL Bot!*\n\nI'm your WhatsApp companion bot. Use /help to see commands.`, {
        parse_mode: 'Markdown'
    });
});

// Help command
bot.help(async (ctx) => {
    const helpText = `
🤖 *TRAGICAL Bot Commands*

/start - Start the bot
/help - Show this help
/id - Get your Telegram ID
/pair [number] - Get WhatsApp pairing code
/code - Check your pairing code
/status - Bot status
/info - Bot information
/ping - Check response
/owner - Contact owner
/stats - Show connected users

*Examples:*
/pair 254787031145 - Get WhatsApp pairing code
    `;
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ID command
bot.command('id', async (ctx) => {
    await ctx.reply(`🆔 *Your ID:* \`${ctx.from.id}\``, {
        parse_mode: 'Markdown'
    });
});

// Stats command
bot.command('stats', async (ctx) => {
    try {
        const response = await axios.get(`http://localhost:${config.port}/status`);
        const data = response.data;
        
        await ctx.reply(
            `📊 *Connection Stats*\n\n` +
            `📱 WhatsApp Users: ${data.whatsapp_users || 0}\n` +
            `🤖 Telegram Users: ${data.telegram_users || 0}\n` +
            `🔄 Total: ${(data.whatsapp_users || 0) + (data.telegram_users || 0)}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        await ctx.reply('❌ Could not fetch stats');
    }
});

// PAIRING COMMAND
bot.command('pair', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const phoneNumber = args[0];
    
    if (!phoneNumber) {
        return ctx.reply('❌ Please provide phone number\nExample: /pair 254787031145');
    }
    
    await ctx.reply('⏳ Requesting WhatsApp pairing code...');
    
    try {
        const response = await axios.post(`http://localhost:${config.port}/pair`, {
            phoneNumber: phoneNumber
        });
        
        if (response.data.success) {
            await ctx.reply(`✅ Pairing initiated for ${phoneNumber}\n⏳ Use /code in 10 seconds to get your code`);
        } else {
            await ctx.reply(`❌ ${response.data.message}`);
        }
    } catch (error) {
        await ctx.reply('❌ Failed to request pairing code');
    }
});

// Check code command
bot.command('code', async (ctx) => {
    try {
        const response = await axios.get(`http://localhost:${config.port}/pairing-status`);
        
        if (response.data.pending?.code) {
            await ctx.reply(
                `🔐 *Your WhatsApp Pairing Code*\n\n` +
                `\`${response.data.pending.code}\`\n\n` +
                `*How to use:*\n` +
                `1️⃣ Open WhatsApp on your phone\n` +
                `2️⃣ Tap 3 dots (⋮) → Linked Devices\n` +
                `3️⃣ Tap "Link a Device"\n` +
                `4️⃣ Enter this code: *${response.data.pending.code}*\n\n` +
                `⏱️ Code expires in 5 minutes`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply('❌ No pending pairing code. Use /pair first.');
        }
    } catch (error) {
        await ctx.reply('❌ Failed to check code');
    }
});

// Status command
bot.command('status', async (ctx) => {
    try {
        const response = await axios.get(`http://localhost:${config.port}/status`);
        const data = response.data;
        
        const uptime = data.uptime;
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        await ctx.reply(
            `📊 *Bot Status*\n\n` +
            `🤖 WhatsApp: ${data.status === 'active' ? '✅ Online' : '⏳ Connecting'}\n` +
            `📱 Users: ${data.whatsapp_users || 0}\n` +
            `⏱️ Uptime: ${hours}h ${minutes}m\n` +
            `🌐 Mode: ${data.botName}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        await ctx.reply('❌ Failed to get status');
    }
});

// Info command
bot.command('info', async (ctx) => {
    await ctx.reply(
        `ℹ️ *TRAGICAL Bot Info*\n\n` +
        `Version: ${config.version}\n` +
        `Platform: Telegram + WhatsApp\n` +
        `Status: ✅ Online\n` +
        `Owner: @xx2six\n` +
        `WhatsApp: ${config.ownerNumber.split('@')[0]}`,
        { parse_mode: 'Markdown' }
    );
});

// Ping command
bot.command('ping', async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply('🏓 Pong!');
    const end = Date.now();
    await ctx.telegram.editMessageText(
        msg.chat.id,
        msg.message_id,
        undefined,
        `🏓 *Pong!*\n📡 Response: ${end - start}ms`,
        { parse_mode: 'Markdown' }
    );
});

// Owner command
bot.command('owner', async (ctx) => {
    await ctx.reply(
        `👑 *Bot Owner*\n\n` +
        `Telegram: @xx2six\n` +
        `Telegram ID: ${YOUR_TELEGRAM_ID}\n` +
        `WhatsApp: ${config.ownerNumber.split('@')[0]}`,
        { parse_mode: 'Markdown' }
    );
});

// Handle messages (for debugging)
bot.on('text', async (ctx) => {
    // Only reply to owner
    if (ctx.from.id === YOUR_TELEGRAM_ID) {
        if (!ctx.message.text.startsWith('/')) {
            await ctx.reply(`📨 Echo: ${ctx.message.text}`);
        }
    }
});

// Launch bot with retry
async function launchBot() {
    try {
        await bot.launch();
        console.log('✅ Telegram Bot is running!');
        console.log(`🔗 https://t.me/${config.telegramBotUsername}`);
        
        // Test connection
        const botInfo = await bot.telegram.getMe();
        console.log(`🤖 Bot ID: ${botInfo.id}`);
    } catch (error) {
        console.error('❌ Failed to launch Telegram bot:', error.message);
        console.log('🔄 Retrying in 5 seconds...');
        setTimeout(launchBot, 5000);
    }
}

// Start the bot
launchBot();

// Graceful shutdown
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    process.exit(0);
});

module.exports = bot;
