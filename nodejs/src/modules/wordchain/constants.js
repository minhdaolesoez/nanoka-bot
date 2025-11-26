// English Word Chain Game Constants

export const GAME_CONSTANTS = {
    TURN_TIMEOUT: 10000, // 10 seconds per turn
    ABORT_TIMEOUT: 60000, // 60 seconds to abort if no second player
    MIN_PLAYERS: 2,
    PREFIX: ';' // Words must start with semicolon
};

export const GAME_STATUS = {
    WAITING: 'waiting', // Waiting for players to join
    PLAYING: 'playing', // Game in progress
    ENDED: 'ended'
};

export const RESPONSE_CODES = {
    OK: 'ok',
    INVALID_WORD: 'invalid_word',
    WRONG_LETTER: 'wrong_letter',
    REPEATED: 'repeated',
    NOT_YOUR_TURN: 'not_your_turn',
    NOT_ENOUGH_PLAYERS: 'not_enough_players',
    TIMEOUT: 'timeout',
    WIN: 'win'
};

export const REACTIONS = {
    VALID: '✅',
    INVALID_WORD: '🚫',
    WRONG_LETTER: '❌',
    REPEATED: '🔄',
    NOT_YOUR_TURN: '🖐️',
    NOT_ENOUGH_PLAYERS: ['🖐️', '1️⃣', '🅿️'],
    TIMEOUT: '⏱️'
};
