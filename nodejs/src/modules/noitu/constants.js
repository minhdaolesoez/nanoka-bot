// Game constants
export const GAME_CONSTANTS = {
    MAX_WRONG_COUNT: 3,
    WORD_LENGTH: 2, // words must have exactly 2 syllables
    PENDING_GAME_TIMEOUT: 15000, // 15 seconds
    BLOCK_MESSAGE_TIMEOUT: 3000, // 3 seconds
};

// Game modes
export const GAME_MODES = {
    BOT: 'bot',
    PVP: 'pvp'
};

// Response codes
export const RESPONSE_CODES = {
    OK: 'ok',
    MISMATCH: 'mismatch',
    REPEATED: 'repeated',
    NOT_IN_DICT: 'not_in_dict',
    INVALID_FORMAT: 'invalid_format',
    LOSS: 'loss',
    WIN: 'win',
    SAME_PLAYER: 'same_player'
};

// Response types
export const RESPONSE_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info'
};
