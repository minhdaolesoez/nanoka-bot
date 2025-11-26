// English Word Chain Game Engine
import { GAME_CONSTANTS, GAME_STATUS, RESPONSE_CODES } from './constants.js';
import * as db from './db.js';

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

/**
 * Validate word using Free Dictionary API
 */
export async function validateWord(word) {
    try {
        const response = await fetch(`${DICTIONARY_API}${encodeURIComponent(word)}`);
        if (!response.ok) {
            return { valid: false, definitions: [] };
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            const meanings = data.flatMap(entry => entry.meanings || []);
            return { valid: true, definitions: meanings };
        }
        return { valid: false, definitions: [] };
    } catch (error) {
        console.error('Dictionary API error:', error);
        return { valid: false, definitions: [] };
    }
}

/**
 * Calculate score for a word (based on length)
 */
export function calculateScore(word) {
    return word.length;
}

/**
 * Start a new match in a channel
 */
export function startMatch(channelId, starterId, starterName) {
    const existingMatch = db.getMatch(channelId);
    if (existingMatch && existingMatch.status !== GAME_STATUS.ENDED) {
        return { success: false, error: 'Match already ongoing in this channel!' };
    }

    const match = {
        channelId: String(channelId),
        status: GAME_STATUS.WAITING,
        players: [{
            id: String(starterId),
            name: starterName,
            points: 0,
            wordsPlayed: 0,
            isOut: false
        }],
        currentPlayerIndex: 0,
        lastWord: null,
        lastLetter: null,
        usedWords: [],
        turnNumber: 1,
        startedAt: Date.now(),
        lastTurnAt: null
    };

    db.saveMatch(channelId, match);
    return { success: true, match };
}

/**
 * Join an existing match
 */
export function joinMatch(channelId, playerId, playerName) {
    const match = db.getMatch(channelId);
    
    if (!match || match.status === GAME_STATUS.ENDED) {
        return { success: false, error: 'No ongoing match in this channel!' };
    }

    if (match.players.some(p => p.id === String(playerId))) {
        return { success: false, error: 'You are already in this match!' };
    }

    match.players.push({
        id: String(playerId),
        name: playerName,
        points: 0,
        wordsPlayed: 0,
        isOut: false
    });

    db.saveMatch(channelId, match);
    return { success: true, match, playerCount: match.players.length };
}

/**
 * Process a word submission
 */
export async function processWord(channelId, playerId, word) {
    const match = db.getMatch(channelId);
    
    if (!match || match.status === GAME_STATUS.ENDED) {
        return { success: false, code: null }; // No active game, ignore
    }

    const playerIdStr = String(playerId);
    const playerIndex = match.players.findIndex(p => p.id === playerIdStr && !p.isOut);
    
    if (playerIndex === -1) {
        return { success: false, code: null }; // Player not in game, ignore
    }

    // Check if it's this player's turn
    const activePlayers = match.players.filter(p => !p.isOut);
    if (activePlayers.length < GAME_CONSTANTS.MIN_PLAYERS) {
        return { success: false, code: RESPONSE_CODES.NOT_ENOUGH_PLAYERS };
    }

    const currentPlayer = activePlayers[match.currentPlayerIndex % activePlayers.length];
    if (currentPlayer.id !== playerIdStr) {
        return { success: false, code: RESPONSE_CODES.NOT_YOUR_TURN };
    }

    // Normalize word
    const normalizedWord = word.toLowerCase().trim();

    // Check starting letter
    if (match.lastLetter && normalizedWord[0] !== match.lastLetter) {
        return { 
            success: false, 
            code: RESPONSE_CODES.WRONG_LETTER,
            expected: match.lastLetter
        };
    }

    // Check if word was already used
    if (match.usedWords.includes(normalizedWord)) {
        return { success: false, code: RESPONSE_CODES.REPEATED };
    }

    // Validate word in dictionary
    const validation = await validateWord(normalizedWord);
    if (!validation.valid) {
        return { success: false, code: RESPONSE_CODES.INVALID_WORD };
    }

    // Valid word! Update match state
    const score = calculateScore(normalizedWord);
    const player = match.players.find(p => p.id === playerIdStr);
    player.points += score;
    player.wordsPlayed += 1;

    match.usedWords.push(normalizedWord);
    match.lastWord = normalizedWord;
    match.lastLetter = normalizedWord[normalizedWord.length - 1];
    match.currentPlayerIndex = (match.currentPlayerIndex + 1) % activePlayers.length;
    match.turnNumber += 1;
    match.lastTurnAt = Date.now();
    
    if (match.status === GAME_STATUS.WAITING) {
        match.status = GAME_STATUS.PLAYING;
    }

    db.saveMatch(channelId, match);

    // Get next player
    const nextActivePlayers = match.players.filter(p => !p.isOut);
    const nextPlayer = nextActivePlayers[match.currentPlayerIndex % nextActivePlayers.length];

    return { 
        success: true, 
        code: RESPONSE_CODES.OK,
        score,
        nextPlayer,
        turnNumber: match.turnNumber,
        lastWord: normalizedWord
    };
}

/**
 * Knock out a player (timeout)
 */
export function knockOutPlayer(channelId, playerId) {
    const match = db.getMatch(channelId);
    if (!match) return null;

    const player = match.players.find(p => p.id === String(playerId));
    if (player) {
        player.isOut = true;
    }

    const activePlayers = match.players.filter(p => !p.isOut);
    
    if (activePlayers.length <= 1) {
        // Game over
        match.status = GAME_STATUS.ENDED;
        const winner = activePlayers[0] || null;
        
        // Update player stats
        match.players.forEach(p => {
            const stats = db.getPlayer(p.id);
            db.updatePlayer(p.id, {
                gamesPlayed: stats.gamesPlayed + 1,
                gamesWon: stats.gamesWon + (winner && winner.id === p.id ? 1 : 0),
                totalWords: stats.totalWords + p.wordsPlayed,
                totalPoints: stats.totalPoints + p.points,
                bestStreak: Math.max(stats.bestStreak, p.wordsPlayed)
            });
        });

        db.saveMatch(channelId, match);
        return { gameOver: true, winner, knockedOut: player };
    }

    // Adjust current player index if needed
    if (match.currentPlayerIndex >= activePlayers.length) {
        match.currentPlayerIndex = 0;
    }

    db.saveMatch(channelId, match);

    const nextPlayer = activePlayers[match.currentPlayerIndex];
    return { gameOver: false, knockedOut: player, nextPlayer };
}

/**
 * Abort a match (not enough players)
 */
export function abortMatch(channelId) {
    db.deleteMatch(channelId);
    return { success: true };
}

/**
 * Get current match state
 */
export function getMatchState(channelId) {
    return db.getMatch(channelId);
}

/**
 * Get player statistics
 */
export function getPlayerStats(playerId) {
    return db.getPlayer(playerId);
}

/**
 * Check for timed out players in all matches
 * Returns array of { channelId, playerId } that timed out
 */
export function checkTimeouts() {
    const matches = db.getAllMatches();
    const timedOut = [];

    for (const [channelId, match] of Object.entries(matches)) {
        if (match.status !== GAME_STATUS.PLAYING) continue;
        if (!match.lastTurnAt) continue;

        const elapsed = Date.now() - match.lastTurnAt;
        if (elapsed >= GAME_CONSTANTS.TURN_TIMEOUT) {
            const activePlayers = match.players.filter(p => !p.isOut);
            const currentPlayer = activePlayers[match.currentPlayerIndex % activePlayers.length];
            if (currentPlayer) {
                timedOut.push({ channelId, playerId: currentPlayer.id });
            }
        }
    }

    return timedOut;
}

/**
 * Check for matches to abort (waiting too long with only 1 player)
 */
export function checkAborts() {
    const matches = db.getAllMatches();
    const toAbort = [];

    for (const [channelId, match] of Object.entries(matches)) {
        if (match.status !== GAME_STATUS.WAITING) continue;
        
        const elapsed = Date.now() - match.startedAt;
        const activePlayers = match.players.filter(p => !p.isOut);
        
        if (elapsed >= GAME_CONSTANTS.ABORT_TIMEOUT && activePlayers.length < GAME_CONSTANTS.MIN_PLAYERS) {
            toAbort.push(channelId);
        }
    }

    return toAbort;
}
