// English Word Chain Database (JSON file storage)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORDCHAIN_FILE = join(__dirname, '..', '..', '..', 'data', 'wordchain_data.json');

function ensureDataDir() {
    const dataDir = dirname(WORDCHAIN_FILE);
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}

function getDefaultData() {
    return {
        matches: {},      // Active matches by channelId
        players: {},      // Player stats by odayerId
        history: []       // Match history
    };
}

/**
 * Load wordchain data from JSON file
 */
export function loadData() {
    ensureDataDir();

    if (!existsSync(WORDCHAIN_FILE)) {
        const defaultData = getDefaultData();
        writeFileSync(WORDCHAIN_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }

    try {
        const data = readFileSync(WORDCHAIN_FILE, 'utf8');
        if (!data.trim()) {
            return getDefaultData();
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading wordchain data:', error);
        return getDefaultData();
    }
}

/**
 * Save wordchain data to JSON file
 */
export function saveData(data) {
    ensureDataDir();
    writeFileSync(WORDCHAIN_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get match by channel ID
 */
export function getMatch(channelId) {
    const data = loadData();
    return data.matches[String(channelId)] || null;
}

/**
 * Save/update match
 */
export function saveMatch(channelId, match) {
    const data = loadData();
    data.matches[String(channelId)] = match;
    saveData(data);
}

/**
 * Delete match
 */
export function deleteMatch(channelId) {
    const data = loadData();
    delete data.matches[String(channelId)];
    saveData(data);
}

/**
 * Get player stats
 */
export function getPlayer(playerId) {
    const data = loadData();
    return data.players[String(playerId)] || {
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
    const data = loadData();
    const playerStr = String(playerId);
    if (!data.players[playerStr]) {
        data.players[playerStr] = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWords: 0,
            totalPoints: 0,
            bestStreak: 0
        };
    }
    Object.assign(data.players[playerStr], updates);
    saveData(data);
}

/**
 * Get all active matches
 */
export function getAllMatches() {
    const data = loadData();
    return data.matches;
}
