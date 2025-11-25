import * as db from './db.js';
import { processMove, resetGame } from './gameEngine.js';
import { tratu as tratuWord } from './wordProcessing.js';

/**
 * Check channel game move
 */
export function checkChannel(channelId, userId, playerWord) {
    if (!playerWord || !channelId || !userId) {
        throw new Error('Missing required parameters: playerWord, channelId, userId');
    }

    channelId = channelId.toString();
    userId = userId.toString();

    try {
        const channels = db.read('channels') || {};
        const channelData = channels[channelId] || {};

        const result = processMove({ ...channelData, id: channelId }, playerWord, userId, false);

        // Save updated game data if present
        if (result.gameData) {
            db.store('channels', { [channelId]: result.gameData });
        }

        return result;
    } catch (error) {
        console.error(`Error in checkChannel for channel ${channelId}:`, error);
        throw error;
    }
}

/**
 * Check user (DM) game move
 */
export function checkUser(userId, playerWord, isBot = false) {
    if (!playerWord || !userId) {
        throw new Error('Missing required parameters: playerWord, userId');
    }

    userId = userId.toString();

    try {
        const users = db.read('users') || {};
        const userData = users[userId] || {};

        const result = processMove({ ...userData, id: userId }, playerWord, userId, true);

        // Save updated game data if present
        if (result.gameData) {
            db.store('users', { [userId]: result.gameData });
        }

        return result;
    } catch (error) {
        console.error(`Error in checkUser for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Reset user (DM) game
 */
export function resetUserGame(userId) {
    if (!userId) {
        throw new Error('Missing required parameter: userId');
    }

    userId = userId.toString();

    try {
        const users = db.read('users') || {};
        const userData = users[userId] || {};

        const { word, gameData } = resetGame({ ...userData, id: userId }, true);
        db.store('users', { [userId]: gameData });

        return word;
    } catch (error) {
        console.error(`Error resetting user game for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Reset channel game
 */
export function resetChannelGame(channelId) {
    if (!channelId) {
        throw new Error('Missing required parameter: channelId');
    }

    channelId = channelId.toString();

    try {
        const channels = db.read('channels') || {};
        const channelData = channels[channelId] || {};

        const { word, gameData } = resetGame({ ...channelData, id: channelId }, false);
        db.store('channels', { [channelId]: gameData });

        return word;
    } catch (error) {
        console.error(`Error resetting channel game for channel ${channelId}:`, error);
        throw error;
    }
}

/**
 * Get current word for channel or user
 */
export function getCurrentWord(channelId, userId, isDM = false) {
    if (isDM) {
        const users = db.read('users') || {};
        const userData = users[userId] || {};
        return userData.word;
    } else {
        const channels = db.read('channels') || {};
        const channelData = channels[channelId.toString()] || {};
        return channelData.word;
    }
}

/**
 * Get user stats
 */
export function getUserStats(channelId, userId, isDM = false) {
    if (isDM) {
        const users = db.read('users') || {};
        const userData = users[userId] || {};
        return {
            currentStreak: userData.currentStreak || 0,
            bestStreak: userData.bestStreak || 0,
            wins: userData.wins || 0,
            word: userData.word
        };
    } else {
        const channels = db.read('channels') || {};
        const channelData = channels[channelId.toString()] || {};
        const players = channelData.players || {};
        const userStats = players[userId] || {};
        return {
            currentStreak: userStats.currentStreak || 0,
            bestStreak: userStats.bestStreak || 0,
            wins: userStats.wins || 0,
            word: channelData.word
        };
    }
}

// Re-export utilities
export { tratu } from './wordProcessing.js';
export { isNoituChannel, isChannelInGame, addNoituChannel, removeNoituChannel, getChannelMode, setChannelMode } from './db.js';
