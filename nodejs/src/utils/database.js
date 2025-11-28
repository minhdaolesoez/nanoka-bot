/**
 * Shared Database Utility
 * Provides in-memory caching with debounced writes for all JSON data stores.
 * 
 * Features:
 * - In-memory caching (data loaded once, kept in memory)
 * - Debounced writes (batches saves, writes every 5 seconds max)
 * - Lazy loading (only loads when first accessed)
 * - Graceful shutdown (flushes all pending writes)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Data directory path
const DATA_DIR = join(__dirname, '..', '..', 'data');

// Configuration
const DEBOUNCE_MS = 5000; // Write to disk every 5 seconds max

// In-memory cache for all stores
const cache = new Map();

// Pending write timers
const pendingWrites = new Map();

// Dirty flags (tracks which stores need saving)
const dirtyFlags = new Map();

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
}

/**
 * Get file path for a store
 */
function getFilePath(storeName) {
    return join(DATA_DIR, `${storeName}.json`);
}

/**
 * Load data from disk (internal)
 */
function loadFromDisk(storeName, defaultData = {}) {
    ensureDataDir();
    const filePath = getFilePath(storeName);

    if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return structuredClone(defaultData);
    }

    try {
        const data = readFileSync(filePath, 'utf8');
        if (!data.trim()) {
            return structuredClone(defaultData);
        }
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading ${storeName}:`, error);
        return structuredClone(defaultData);
    }
}

/**
 * Save data to disk (internal)
 */
function saveToDisk(storeName) {
    if (!cache.has(storeName)) return;
    
    ensureDataDir();
    const filePath = getFilePath(storeName);
    const data = cache.get(storeName);
    
    try {
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        dirtyFlags.set(storeName, false);
    } catch (error) {
        console.error(`Error saving ${storeName}:`, error);
    }
}

/**
 * Schedule a debounced write
 */
function scheduleWrite(storeName) {
    dirtyFlags.set(storeName, true);
    
    // Clear existing timer if any
    if (pendingWrites.has(storeName)) {
        return; // Already scheduled
    }
    
    // Schedule new write
    const timer = setTimeout(() => {
        pendingWrites.delete(storeName);
        if (dirtyFlags.get(storeName)) {
            saveToDisk(storeName);
        }
    }, DEBOUNCE_MS);
    
    pendingWrites.set(storeName, timer);
}

/**
 * Get or initialize a data store
 * @param {string} storeName - Name of the store (becomes filename without .json)
 * @param {object} defaultData - Default data if store doesn't exist
 * @returns {object} The data object (mutable reference)
 */
export function getStore(storeName, defaultData = {}) {
    if (!cache.has(storeName)) {
        cache.set(storeName, loadFromDisk(storeName, defaultData));
        dirtyFlags.set(storeName, false);
    }
    return cache.get(storeName);
}

/**
 * Mark a store as modified (schedules write)
 * @param {string} storeName - Name of the store
 */
export function markDirty(storeName) {
    if (cache.has(storeName)) {
        scheduleWrite(storeName);
    }
}

/**
 * Force immediate save of a store
 * @param {string} storeName - Name of the store
 */
export function forceSave(storeName) {
    // Clear pending timer
    if (pendingWrites.has(storeName)) {
        clearTimeout(pendingWrites.get(storeName));
        pendingWrites.delete(storeName);
    }
    saveToDisk(storeName);
}

/**
 * Force immediate save of all dirty stores
 */
export function flushAll() {
    for (const [storeName, timer] of pendingWrites) {
        clearTimeout(timer);
        pendingWrites.delete(storeName);
    }
    
    for (const [storeName, isDirty] of dirtyFlags) {
        if (isDirty) {
            saveToDisk(storeName);
        }
    }
}

/**
 * Reload a store from disk (discards in-memory changes)
 * @param {string} storeName - Name of the store
 * @param {object} defaultData - Default data if store doesn't exist
 */
export function reloadStore(storeName, defaultData = {}) {
    // Clear pending write
    if (pendingWrites.has(storeName)) {
        clearTimeout(pendingWrites.get(storeName));
        pendingWrites.delete(storeName);
    }
    
    cache.set(storeName, loadFromDisk(storeName, defaultData));
    dirtyFlags.set(storeName, false);
    return cache.get(storeName);
}

/**
 * Clear a store from cache (will reload on next access)
 * @param {string} storeName - Name of the store
 */
export function clearCache(storeName) {
    // Save if dirty before clearing
    if (dirtyFlags.get(storeName)) {
        forceSave(storeName);
    }
    
    cache.delete(storeName);
    dirtyFlags.delete(storeName);
}

/**
 * Create a store helper with bound methods
 * @param {string} storeName - Name of the store
 * @param {object} defaultData - Default data structure
 * @returns {object} Helper object with get, save, and data methods
 */
export function createStore(storeName, defaultData = {}) {
    return {
        /**
         * Get the data object (mutable reference)
         */
        get data() {
            return getStore(storeName, defaultData);
        },
        
        /**
         * Mark as modified (schedules debounced write)
         */
        save() {
            markDirty(storeName);
        },
        
        /**
         * Force immediate write to disk
         */
        forceSave() {
            forceSave(storeName);
        },
        
        /**
         * Reload from disk
         */
        reload() {
            return reloadStore(storeName, defaultData);
        }
    };
}

// Graceful shutdown - flush all pending writes
process.on('SIGINT', () => {
    console.log('Flushing database cache...');
    flushAll();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Flushing database cache...');
    flushAll();
    process.exit(0);
});

// Also flush on uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception, flushing database:', error);
    flushAll();
    throw error;
});
