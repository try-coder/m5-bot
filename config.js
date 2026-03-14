// config.js
require('dotenv').config();

module.exports = {
    botName: process.env.BOT_NAME || "M5 BOT",
    ownerNumber: process.env.OWNER_NUMBER || "254787031145@s.whatsapp.net",
    prefix: process.env.PREFIX || ".",
    mode: process.env.MODE || "public",
    version: "1.0.0",
    
    rapidApiKey: process.env.RAPIDAPI_KEY,
    rapidApiHost: process.env.RAPIDAPI_HOST,
    
    port: process.env.PORT || 3000
};
