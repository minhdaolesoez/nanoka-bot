import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NOITU_FILE = join(__dirname, '..', '..', '..', 'data', 'noitu_data.json');

function ensureDataDir() {
    const dataDir = dirname(NOITU_FILE);
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}

function getDefaultData() {
    return {
        channels: {},
        users: {},
        channelAllowlist: []
    };
}

/**
 * Load noitu data from JSON file
 */
export function loadNoituData() {
    ensureDataDir();

    if (!existsSync(NOITU_FILE)) {
        const defaultData = getDefaultData();
        writeFileSync(NOITU_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }

    try {
        const data = readFileSync(NOITU_FILE, 'utf8');
        if (!data.trim()) {
            return getDefaultData();
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading noitu data:', error);
        return getDefaultData();
    }
}

/**
 * Save noitu data to JSON file
 */
export function saveNoituData(data) {
    ensureDataDir();
    writeFileSync(NOITU_FILE, JSON.stringify(data, null, 2));
}

/**
 * Read specific key from data
 */
export function read(key) {
    const data = loadNoituData();
    return data[key];
}

/**
 * Store/update specific key in data
 */
export function store(key, newData) {
    const data = loadNoituData();
    if (!data[key] || typeof data[key] !== 'object') {
        data[key] = {};
    }
    Object.assign(data[key], newData);
    saveNoituData(data);
}

/**
 * Get all data
 */
export function getAll() {
    return loadNoituData();
}

/**
 * Check if channel is in allowlist
 */
export function isNoituChannel(channelId) {
    const data = loadNoituData();
    return data.channelAllowlist.includes(String(channelId));
}

/**
 * Alias for isNoituChannel
 */
export function isChannelInGame(channelId) {
    return isNoituChannel(channelId);
}

/**
 * Add channel to allowlist
 */
export function addNoituChannel(channelId) {
    const data = loadNoituData();
    const channelStr = String(channelId);
    if (!data.channelAllowlist.includes(channelStr)) {
        data.channelAllowlist.push(channelStr);
        saveNoituData(data);
        return true;
    }
    return false;
}

/**
 * Remove channel from allowlist
 */
export function removeNoituChannel(channelId) {
    const data = loadNoituData();
    const channelStr = String(channelId);
    const index = data.channelAllowlist.indexOf(channelStr);
    if (index !== -1) {
        data.channelAllowlist.splice(index, 1);
        // Also remove channel data
        if (data.channels && data.channels[channelStr]) {
            delete data.channels[channelStr];
        }
        saveNoituData(data);
        return true;
    }
    return false;
}

/**
 * Get channel mode (bot or pvp)
 */
export function getChannelMode(channelId) {
    const data = loadNoituData();
    const channelStr = String(channelId);
    if (data.channels && data.channels[channelStr]) {
        return data.channels[channelStr].mode || 'bot';
    }
    return 'bot';
}

/**
 * Set channel mode
 */
export function setChannelMode(channelId, mode) {
    const data = loadNoituData();
    const channelStr = String(channelId);
    if (!data.channels) data.channels = {};
    if (!data.channels[channelStr]) {
        data.channels[channelStr] = {};
    }
    data.channels[channelStr].mode = mode;
    saveNoituData(data);
}
