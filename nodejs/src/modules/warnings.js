import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WARNINGS_FILE = join(__dirname, '..', '..', '..', 'data', 'warnings.json');

function ensureDataDir() {
    const dataDir = dirname(WARNINGS_FILE);
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}

/**
 * Load warnings data from JSON file
 */
export function loadWarnings() {
    ensureDataDir();
    
    if (!existsSync(WARNINGS_FILE)) {
        return {};
    }

    try {
        const data = readFileSync(WARNINGS_FILE, 'utf8');
        if (!data.trim()) {
            return {};
        }
        return JSON.parse(data);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return {};
        }
        throw error;
    }
}

/**
 * Save warnings data to JSON file
 */
export function saveWarnings(warningsData) {
    ensureDataDir();
    writeFileSync(WARNINGS_FILE, JSON.stringify(warningsData, null, 2));
}

/**
 * Get warning count for a specific user
 */
export function getUserWarnings(userId) {
    const warningsData = loadWarnings();
    return warningsData[String(userId)] || [];
}

/**
 * Add a warning to a user
 */
export function addWarning(userId, moderatorId, reason, guildId) {
    const warningsData = loadWarnings();
    const userIdStr = String(userId);

    if (!warningsData[userIdStr]) {
        warningsData[userIdStr] = [];
    }

    const warning = {
        moderator_id: moderatorId,
        reason: reason,
        timestamp: new Date().toISOString(),
        guild_id: guildId,
    };

    warningsData[userIdStr].push(warning);
    saveWarnings(warningsData);
    return warningsData[userIdStr].length;
}

/**
 * Remove a specific amount of warnings from a user
 */
export function removeWarnings(userId, amount) {
    const warningsData = loadWarnings();
    const userIdStr = String(userId);

    if (!warningsData[userIdStr] || !warningsData[userIdStr].length) {
        return { removed: 0, remaining: 0 };
    }

    const currentWarnings = warningsData[userIdStr];
    const originalCount = currentWarnings.length;

    // Remove the specified amount (from the end, removing most recent first)
    const removedCount = Math.min(amount, originalCount);
    warningsData[userIdStr] = removedCount > 0 
        ? currentWarnings.slice(0, -removedCount) 
        : currentWarnings;

    saveWarnings(warningsData);
    const remainingCount = warningsData[userIdStr].length;

    return { removed: removedCount, remaining: remainingCount };
}

/**
 * Clear all warnings for a user
 */
export function clearWarnings(userId) {
    const warningsData = loadWarnings();
    const userIdStr = String(userId);

    if (!warningsData[userIdStr] || !warningsData[userIdStr].length) {
        return 0;
    }

    const count = warningsData[userIdStr].length;
    warningsData[userIdStr] = [];
    saveWarnings(warningsData);
    return count;
}
