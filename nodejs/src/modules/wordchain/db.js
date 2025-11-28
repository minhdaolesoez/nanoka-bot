// English Word Chain Database
import { createStore } from '../../utils/database.js';

// Default data structure
const DEFAULT_DATA = {
    matches: {},      // Active matches by channelId
    players: {},      // Player stats by playerId
    history: []       // Match history
};

// Create store with caching and debounced writes
const store = createStore('wordchain_data', DEFAULT_DATA);

/**
 * Load wordchain data (returns cached data)
 */
export function loadData() {
    return store.data;
}

/**
 * Save wordchain data (schedules debounced write)
 */
export function saveData() {
    store.save();
}

/**
 * Get match by channel ID
 */
export function getMatch(channelId) {
    return store.data.matches[String(channelId)] || null;
}

/**
 * Save/update match
 */
export function saveMatch(channelId, match) {
    store.data.matches[String(channelId)] = match;
    store.save();
}

/**
 * Delete match
 */
export function deleteMatch(channelId) {
    delete store.data.matches[String(channelId)];
    store.save();
}

/**
 * Get player stats
 */
export function getPlayer(playerId) {
    return store.data.players[String(playerId)] || {
        gamesPlayed: 0,
        gamesWon: 0,
        totalWords: 0,
        totalPoints: 0,
        bestStreak: 0
    };
}

/**
 * Update player stats
 */
export function updatePlayer(playerId, updates) {
    const playerStr = String(playerId);
    if (!store.data.players[playerStr]) {
        store.data.players[playerStr] = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWords: 0,
            totalPoints: 0,
            bestStreak: 0
        };
    }
    Object.assign(store.data.players[playerStr], updates);
    store.save();
}

/**
 * Get all active matches
 */
export function getAllMatches() {
    return store.data.matches;
}
