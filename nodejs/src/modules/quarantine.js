import { createStore } from '../utils/database.js';

// Create store with caching and debounced writes
const store = createStore('quarantine_channels', {});

/**
 * Ensure guild data structure exists and is in new format
 */
function ensureGuildData(guildId) {
    const guildStr = String(guildId);
    
    if (!store.data[guildStr]) {
        store.data[guildStr] = {
            channels: [],
            log_channel: null,
            ban_count: 0,
        };
    } else if (Array.isArray(store.data[guildStr])) {
        // Convert old format to new format
        store.data[guildStr] = {
            channels: store.data[guildStr],
            log_channel: null,
            ban_count: 0,
        };
    }
    
    return store.data[guildStr];
}

/**
 * Load quarantine channels data (returns cached data)
 */
export function loadQuarantineChannels() {
    return store.data;
}

/**
 * Save quarantine channels data (schedules debounced write)
 */
export function saveQuarantineChannels() {
    store.save();
}

/**
 * Increment the auto-ban counter for a guild
 */
export function incrementBanCounter(guildId) {
    const guildData = ensureGuildData(guildId);
    
    if (!('ban_count' in guildData)) {
        guildData.ban_count = 0;
    }

    guildData.ban_count += 1;
    store.save();
    return guildData.ban_count;
}

/**
 * Get the current auto-ban count for a guild
 */
export function getBanCount(guildId) {
    const guildStr = String(guildId);

    if (store.data[guildStr] && typeof store.data[guildStr] === 'object') {
        return store.data[guildStr].ban_count || 0;
    }
    return 0;
}

/**
 * Set the log channel for a guild
 */
export function setLogChannel(guildId, channelId) {
    const guildData = ensureGuildData(guildId);
    guildData.log_channel = channelId;
    store.save();
}

/**
 * Get the log channel for a guild
 */
export function getLogChannel(guildId) {
    const guildStr = String(guildId);

    if (store.data[guildStr]) {
        if (typeof store.data[guildStr] === 'object' && !Array.isArray(store.data[guildStr])) {
            return store.data[guildStr].log_channel;
        }
    }
    return null;
}

/**
 * Add a channel as quarantine channel for a guild
 */
export function addQuarantineChannel(guildId, channelId) {
    const guildData = ensureGuildData(guildId);

    if (!guildData.channels.includes(channelId)) {
        guildData.channels.push(channelId);
        store.save();
        return true;
    }
    return false;
}

/**
 * Check if a channel is a quarantine channel
 */
export function isQuarantineChannel(guildId, channelId) {
    const guildStr = String(guildId);

    if (store.data[guildStr]) {
        if (typeof store.data[guildStr] === 'object' && !Array.isArray(store.data[guildStr])) {
            return store.data[guildStr].channels.includes(channelId);
        } else if (Array.isArray(store.data[guildStr])) {
            return store.data[guildStr].includes(channelId);
        }
    }
    return false;
}
