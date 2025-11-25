import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QUARANTINE_FILE = join(__dirname, '..', '..', '..', 'data', 'quarantine_channels.json');

function ensureDataDir() {
    const dataDir = dirname(QUARANTINE_FILE);
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}

/**
 * Load quarantine channels data from JSON file
 */
export function loadQuarantineChannels() {
    ensureDataDir();
    
    if (!existsSync(QUARANTINE_FILE)) {
        try {
            writeFileSync(QUARANTINE_FILE, JSON.stringify({}, null, 2));
            console.log(`File created: ${QUARANTINE_FILE} initialized with {}.`);
            return {};
        } catch (error) {
            console.error(`Error creating file ${QUARANTINE_FILE}:`, error);
            return {};
        }
    }

    try {
        const data = readFileSync(QUARANTINE_FILE, 'utf8');
        if (!data.trim()) {
            writeFileSync(QUARANTINE_FILE, JSON.stringify({}, null, 2));
            return {};
        }
        return JSON.parse(data);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.log('Warning: Quarantine data file is corrupt. Overwriting with empty data.');
            writeFileSync(QUARANTINE_FILE, JSON.stringify({}, null, 2));
            return {};
        }
        throw error;
    }
}

/**
 * Save quarantine channels data to JSON file
 */
export function saveQuarantineChannels(quarantineData) {
    ensureDataDir();
    writeFileSync(QUARANTINE_FILE, JSON.stringify(quarantineData, null, 2));
}

/**
 * Increment the auto-ban counter for a guild
 */
export function incrementBanCounter(guildId) {
    const quarantineData = loadQuarantineChannels();
    const guildStr = String(guildId);

    if (!quarantineData[guildStr]) {
        quarantineData[guildStr] = {
            channels: [],
            log_channel: null,
            ban_count: 0,
        };
    } else if (Array.isArray(quarantineData[guildStr])) {
        // Convert old format to new format
        quarantineData[guildStr] = {
            channels: quarantineData[guildStr],
            log_channel: null,
            ban_count: 0,
        };
    } else if (!('ban_count' in quarantineData[guildStr])) {
        quarantineData[guildStr].ban_count = 0;
    }

    quarantineData[guildStr].ban_count += 1;
    saveQuarantineChannels(quarantineData);
    return quarantineData[guildStr].ban_count;
}

/**
 * Get the current auto-ban count for a guild
 */
export function getBanCount(guildId) {
    const quarantineData = loadQuarantineChannels();
    const guildStr = String(guildId);

    if (quarantineData[guildStr] && typeof quarantineData[guildStr] === 'object') {
        return quarantineData[guildStr].ban_count || 0;
    }
    return 0;
}

/**
 * Set the log channel for a guild
 */
export function setLogChannel(guildId, channelId) {
    const quarantineData = loadQuarantineChannels();
    const guildStr = String(guildId);

    if (!quarantineData[guildStr]) {
        quarantineData[guildStr] = { channels: [], log_channel: null };
    } else if (Array.isArray(quarantineData[guildStr])) {
        quarantineData[guildStr] = {
            channels: quarantineData[guildStr],
            log_channel: null,
        };
    }

    quarantineData[guildStr].log_channel = channelId;
    saveQuarantineChannels(quarantineData);
}

/**
 * Get the log channel for a guild
 */
export function getLogChannel(guildId) {
    const quarantineData = loadQuarantineChannels();
    const guildStr = String(guildId);

    if (quarantineData[guildStr]) {
        if (typeof quarantineData[guildStr] === 'object' && !Array.isArray(quarantineData[guildStr])) {
            return quarantineData[guildStr].log_channel;
        }
    }
    return null;
}

/**
 * Add a channel as quarantine channel for a guild
 */
export function addQuarantineChannel(guildId, channelId) {
    const quarantineData = loadQuarantineChannels();
    const guildStr = String(guildId);

    if (!quarantineData[guildStr]) {
        quarantineData[guildStr] = { channels: [], log_channel: null };
    } else if (Array.isArray(quarantineData[guildStr])) {
        quarantineData[guildStr] = {
            channels: quarantineData[guildStr],
            log_channel: null,
        };
    }

    if (!quarantineData[guildStr].channels.includes(channelId)) {
        quarantineData[guildStr].channels.push(channelId);
        saveQuarantineChannels(quarantineData);
        return true;
    }
    return false;
}

/**
 * Check if a channel is a quarantine channel
 */
export function isQuarantineChannel(guildId, channelId) {
    const quarantineData = loadQuarantineChannels();
    const guildStr = String(guildId);

    if (quarantineData[guildStr]) {
        if (typeof quarantineData[guildStr] === 'object' && !Array.isArray(quarantineData[guildStr])) {
            return quarantineData[guildStr].channels.includes(channelId);
        } else if (Array.isArray(quarantineData[guildStr])) {
            return quarantineData[guildStr].includes(channelId);
        }
    }
    return false;
}
