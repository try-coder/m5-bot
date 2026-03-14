// lib/settings.js
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../database/settings.json');

// Default settings
const defaultSettings = {
    prefix: '.',
    mode: 'public',
    botName: 'TRAGICAL',
    autoread: false,
    anticall: true,
    antidelete: true,
    welcome: false,
    goodbye: false,
    antilink: false,
    antibadword: false,
    badwords: ["fuck", "pussy", "dick", "nyonga", "baby"]
};

// Ensure database directory exists
if (!fs.existsSync(path.join(__dirname, '../database'))) {
    fs.mkdirSync(path.join(__dirname, '../database'), { recursive: true });
}

// Load settings
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return { ...defaultSettings };
}

// Save settings
function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

// Get setting
function getSetting(key) {
    const settings = loadSettings();
    return settings[key];
}

// Update setting
function updateSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    return saveSettings(settings);
}

// Reset to defaults
function resetSettings() {
    return saveSettings({ ...defaultSettings });
}

// Add bad word
function addBadword(word) {
    const settings = loadSettings();
    if (!settings.badwords.includes(word.toLowerCase())) {
        settings.badwords.push(word.toLowerCase());
        saveSettings(settings);
        return true;
    }
    return false;
}

// Remove bad word
function removeBadword(word) {
    const settings = loadSettings();
    const index = settings.badwords.indexOf(word.toLowerCase());
    if (index > -1) {
        settings.badwords.splice(index, 1);
        saveSettings(settings);
        return true;
    }
    return false;
}

// Get all settings
function getAllSettings() {
    return loadSettings();
}

module.exports = {
    loadSettings,
    saveSettings,
    getSetting,
    updateSetting,
    resetSettings,
    addBadword,
    removeBadword,
    getAllSettings,
    defaultSettings
};
