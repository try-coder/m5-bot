// server.js
const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
let globalQR = null;
let botStatus = 'starting';
let startTime = Date.now();
let pendingPairing = null;
let connectedUsers = [];

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/status', (req, res) => {
    res.json({ 
        status: botStatus,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        botName: "M5 BOT",
        whatsapp_users: connectedUsers.length,
        timestamp: new Date().toISOString()
    });
});

app.get('/qr', (req, res) => {
    res.json({ 
        qr: globalQR, 
        status: botStatus,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        pairing: pendingPairing
    });
});

app.post('/pair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.json({ success: false, message: 'Phone number required' });
        }
        
        let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        if (cleanNumber.startsWith('0')) {
            cleanNumber = '254' + cleanNumber.slice(1);
        } else if (!cleanNumber.startsWith('254')) {
            cleanNumber = '254' + cleanNumber;
        }
        
        console.log(`📱 Pairing request for: ${cleanNumber}`);
        
        pendingPairing = {
            number: cleanNumber,
            timestamp: Date.now(),
            code: null
        };
        
        res.json({ 
            success: true, 
            message: 'Pairing initiated',
            phoneNumber: cleanNumber
        });
        
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/pairing-status', (req, res) => {
    res.json({ 
        pending: pendingPairing,
        status: botStatus 
    });
});

app.post('/update-users', (req, res) => {
    const { whatsapp } = req.body;
    if (whatsapp !== undefined) connectedUsers = whatsapp;
    res.json({ success: true });
});

app.get('/check-session', (req, res) => {
    const hasSession = fs.existsSync('./sessions/creds.json');
    res.json({ hasSession });
});

app.post('/clear-session', (req, res) => {
    try {
        fs.rmSync('./sessions', { recursive: true, force: true });
        res.json({ success: true, message: 'Sessions cleared' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

function setQR(qr) {
    globalQR = qr;
}

function setStatus(status) {
    botStatus = status;
    if (status === 'active' || status === 'starting') {
        startTime = Date.now();
    }
}

function getPendingPairing() {
    return pendingPairing;
}

function clearPendingPairing() {
    pendingPairing = null;
}

function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 Web interface: http://localhost:${port}`);
    });
}

module.exports = { 
    startServer, 
    setQR, 
    setStatus,
    getPendingPairing,
    clearPendingPairing
};
