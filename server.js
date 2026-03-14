// server.js - COMPLETE FIXED WITH WORKING PAIRING
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

// Serve HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get status
app.get('/status', (req, res) => {
    res.json({ 
        status: botStatus,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        botName: "M5 BOT",
        whatsapp_users: connectedUsers.length,
        timestamp: new Date().toISOString()
    });
});

// Get QR code
app.get('/qr', (req, res) => {
    res.json({ 
        qr: globalQR, 
        status: botStatus,
        uptime: Math.floor((Date.now() - startTime) / 1000)
    });
});

// ============ PAIRING ENDPOINT - FIXED ============
app.post('/pair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.json({ 
                success: false, 
                message: 'Phone number required' 
            });
        }
        
        // Clean the phone number
        let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        // Format for Kenya (add 254 if needed)
        if (cleanNumber.startsWith('0')) {
            cleanNumber = '254' + cleanNumber.slice(1);
        } else if (cleanNumber.startsWith('+')) {
            cleanNumber = cleanNumber.slice(1);
        } else if (!cleanNumber.startsWith('254')) {
            cleanNumber = '254' + cleanNumber;
        }
        
        // Ensure it's exactly 12 digits (254 + 9 digits)
        if (cleanNumber.length !== 12) {
            return res.json({ 
                success: false, 
                message: 'Invalid phone number. Use format: 2547XXXXXXXX' 
            });
        }
        
        console.log(`📱 Pairing request received for: ${cleanNumber}`);
        
        // Store the pairing request
        pendingPairing = {
            number: cleanNumber,
            timestamp: Date.now(),
            code: null,
            status: 'pending'
        };
        
        // Clear any old pairing after 5 minutes
        setTimeout(() => {
            if (pendingPairing && !pendingPairing.code) {
                console.log('⏰ Pairing request expired');
                pendingPairing = null;
            }
        }, 300000);
        
        res.json({ 
            success: true, 
            message: 'Pairing initiated. Check back in 10-20 seconds.',
            phoneNumber: cleanNumber
        });
        
    } catch (error) {
        console.error('Pairing error:', error);
        res.json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// Check pairing status
app.get('/pairing-status', (req, res) => {
    res.json({ 
        pending: pendingPairing,
        status: botStatus 
    });
});

// Update connected users
app.post('/update-users', (req, res) => {
    const { whatsapp } = req.body;
    if (whatsapp !== undefined) connectedUsers = whatsapp;
    res.json({ success: true });
});

// Check session
app.get('/check-session', (req, res) => {
    const hasSession = fs.existsSync('./sessions/creds.json');
    res.json({ hasSession });
});

// Clear session
app.post('/clear-session', (req, res) => {
    try {
        fs.rmSync('./sessions', { recursive: true, force: true });
        pendingPairing = null;
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
        console.log(`📱 Pairing system ready at http://localhost:${port}`);
    });
}

module.exports = { 
    startServer, 
    setQR, 
    setStatus,
    getPendingPairing,
    clearPendingPairing
};
