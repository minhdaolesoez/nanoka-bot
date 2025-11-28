import { createStore } from '../../utils/database.js';

// Default data structure
const DEFAULT_DATA = {
    channels: {},
    users: {},
    channelAllowlist: []
};

// Create store with caching and debounced writes
const store = createStore('noitu_data', DEFAULT_DATA);

/**
 * Load noitu data (returns cached data)
 */
export function loadNoituData() {
    return store.data;
}

/**
 * Save noitu data (schedules debounced write)
 */
export function saveNoituData() {
    store.save();
}

/**
 * Read specific key from data
 */
export function read(key) {
    return store.data[key];
}

/**
 * Store/update specific key in data
 */
export function storeData(key, newData) {
    const data = store.data;
    if (!data[key] || typeof data[key] !== 'object') {
        data[key] = {};
    }
    Object.assign(data[key], newData);
    store.save();
}

// Re-export as 'store' for backwards compatibility
export { storeData as store };

/**
 * Get all data
 */
export function getAll() {
    return store.data;
}

/**
 * Check if channel is in allowlist
 */
export function isNoituChannel(channelId) {
    return store.data.channelAllowlist.includes(String(channelId));
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
    const data = store.data;
    const channelStr = String(channelId);
    if (!data.channelAllowlist.includes(channelStr)) {
        data.channelAllowlist.push(channelStr);
        store.save();
        return true;
    }
    return false;
}

/**
 * Remove channel from allowlist
 */
export function removeNoituChannel(channelId) {
    const data = store.data;
    const channelStr = String(channelId);
    const index = data.channelAllowlist.indexOf(channelStr);
    if (index !== -1) {
        data.channelAllowlist.splice(index, 1);
        // Also remove channel data
        if (data.channels && data.channels[channelStr]) {
            delete data.channels[channelStr];
        }
        store.save();
        return true;
    }
    return false;
}

/**
 * Get channel mode (bot or pvp)
 */
export function getChannelMode(channelId) {
    const data = store.data;
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
    const data = store.data;
    const channelStr = String(channelId);
    if (!data.channels) data.channels = {};
    if (!data.channels[channelStr]) {
        data.channels[channelStr] = {};
    }
    data.channels[channelStr].mode = mode;
    store.save();
}
