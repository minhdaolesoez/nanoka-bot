import { createStore } from '../utils/database.js';

// Create store with caching and debounced writes
const store = createStore('warnings', {});

/**
 * Load warnings data (returns cached data)
 */
export function loadWarnings() {
    return store.data;
}

/**
 * Save warnings data (schedules debounced write)
 */
export function saveWarnings() {
    store.save();
}

/**
 * Get warning count for a specific user
 */
export function getUserWarnings(userId) {
    return store.data[String(userId)] || [];
}

/**
 * Add a warning to a user
 */
export function addWarning(userId, moderatorId, reason, guildId) {
    const userIdStr = String(userId);

    if (!store.data[userIdStr]) {
        store.data[userIdStr] = [];
    }

    const warning = {
        moderator_id: moderatorId,
        reason: reason,
        timestamp: new Date().toISOString(),
        guild_id: guildId,
    };

    store.data[userIdStr].push(warning);
    store.save();
    return store.data[userIdStr].length;
}

/**
 * Remove a specific amount of warnings from a user
 */
export function removeWarnings(userId, amount) {
    const userIdStr = String(userId);

    if (!store.data[userIdStr] || !store.data[userIdStr].length) {
        return { removed: 0, remaining: 0 };
    }

    const currentWarnings = store.data[userIdStr];
    const originalCount = currentWarnings.length;

    // Remove the specified amount (from the end, removing most recent first)
    const removedCount = Math.min(amount, originalCount);
    store.data[userIdStr] = removedCount > 0 
        ? currentWarnings.slice(0, -removedCount) 
        : currentWarnings;

    store.save();
    return { removed: removedCount, remaining: store.data[userIdStr].length };
}

/**
 * Clear all warnings for a user
 */
export function clearWarnings(userId) {
    const userIdStr = String(userId);

    if (!store.data[userIdStr] || !store.data[userIdStr].length) {
        return 0;
    }

    const count = store.data[userIdStr].length;
    store.data[userIdStr] = [];
    store.save();
    return count;
}
