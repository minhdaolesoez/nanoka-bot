/**
 * Server Monitoring Constants
 */

// Response codes for server operations
export const RESPONSE_CODES = {
    OK: 'OK',
    ERROR: 'ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    TIMEOUT: 'TIMEOUT',
    SERVER_OFFLINE: 'SERVER_OFFLINE',
    ALREADY_RUNNING: 'ALREADY_RUNNING',
    ALREADY_STOPPED: 'ALREADY_STOPPED',
    NO_PERMISSION: 'NO_PERMISSION'
};

// Server types
export const SERVER_TYPES = {
    MINECRAFT: 'minecraft',
    DEBIAN: 'debian'
};

// Minecraft server status
export const MC_STATUS = {
    RUNNING: 'running',
    STOPPED: 'stopped',
    STARTING: 'starting',
    STOPPING: 'stopping',
    CRASHED: 'crashed',
    UNKNOWN: 'unknown'
};

// Crafty API actions
export const CRAFTY_ACTIONS = {
    START: 'start_server',
    STOP: 'stop_server',
    RESTART: 'restart_server',
    KILL: 'kill_server',
    BACKUP: 'backup_server'
};

// Status colors for embeds
export const STATUS_COLORS = {
    ONLINE: 0x00FF00,     // Green
    OFFLINE: 0xFF0000,    // Red
    WARNING: 0xFFFF00,    // Yellow
    INFO: 0x0099FF,       // Blue
    STARTING: 0xFFA500,   // Orange
    ERROR: 0xFF0000       // Red
};

// Refresh intervals (in ms)
export const REFRESH_INTERVALS = {
    STATUS_CHECK: 60000,      // 1 minute
    STATS_UPDATE: 30000       // 30 seconds
};

// Embed icons/emojis
export const ICONS = {
    CPU: '🔲',
    RAM: '💾',
    DISK: '💿',
    NETWORK_UP: '📤',
    NETWORK_DOWN: '📥',
    PLAYERS: '👥',
    SERVER: '🖥️',
    MINECRAFT: '⛏️',
    ONLINE: '🟢',
    OFFLINE: '🔴',
    WARNING: '🟡',
    STARTING: '🟠'
};
