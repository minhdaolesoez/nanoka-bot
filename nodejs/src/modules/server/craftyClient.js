/**
 * Crafty Controller API Client
 * Handles communication with Crafty Controller 4 for Minecraft server management
 * 
 * Required permissions: COMMANDS, PLAYERS
 * API Docs: https://docs.craftycontrol.com/pages/developer-guide/api-reference/v2/
 */

import { RESPONSE_CODES, CRAFTY_ACTIONS, MC_STATUS } from './constants.js';

/**
 * Crafty Controller API Client
 */
export class CraftyClient {
    /**
     * @param {string} baseUrl - Crafty Controller URL (e.g., https://crafty.minhdao.icu)
     * @param {string} token - API token from Crafty settings
     */
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.token = token;
        this.timeout = 10000; // 10 second timeout
    }

    /**
     * Make authenticated API request to Crafty
     * @param {string} endpoint - API endpoint (e.g., /api/v2/servers)
     * @param {object} options - Fetch options
     * @returns {Promise<object>} API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    return { code: RESPONSE_CODES.UNAUTHORIZED, error: 'Invalid or expired API token' };
                }
                if (response.status === 404) {
                    return { code: RESPONSE_CODES.NOT_FOUND, error: 'Resource not found' };
                }
                return { code: RESPONSE_CODES.ERROR, error: `HTTP ${response.status}` };
            }

            const data = await response.json();
            return { code: RESPONSE_CODES.OK, data: data.data, status: data.status };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { code: RESPONSE_CODES.TIMEOUT, error: 'Request timed out' };
            }
            console.error('Crafty API error:', error);
            return { code: RESPONSE_CODES.ERROR, error: error.message };
        }
    }

    /**
     * Check if Crafty is reachable
     * @returns {Promise<boolean>}
     */
    async isOnline() {
        const result = await this.request('/api/v2/crafty/check');
        return result.code === RESPONSE_CODES.OK;
    }

    /**
     * Get all servers the token has access to
     * @returns {Promise<object>}
     */
    async getServers() {
        return await this.request('/api/v2/servers');
    }

    /**
     * Get server details by ID
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async getServer(serverId) {
        return await this.request(`/api/v2/servers/${serverId}`);
    }

    /**
     * Get server stats (CPU, RAM, players, etc.)
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async getServerStats(serverId) {
        // Fetch both stats and server info in parallel for complete data
        const [statsResult, serverResult] = await Promise.all([
            this.request(`/api/v2/servers/${serverId}/stats`),
            this.request(`/api/v2/servers/${serverId}`)
        ]);
        
        if (statsResult.code !== RESPONSE_CODES.OK) {
            return statsResult;
        }

        const stats = statsResult.data;
        const serverInfo = serverResult.code === RESPONSE_CODES.OK ? serverResult.data : {};
        
        // Get server name from server info or stats
        const serverName = serverInfo.server_name || stats.server_name || 'Unknown Server';
        
        // Parse and normalize the stats
        return {
            code: RESPONSE_CODES.OK,
            data: {
                serverId: stats.server_id || serverId,
                name: serverName,
                status: this.parseServerStatus(stats),
                running: stats.running === true,
                cpu: parseFloat(stats.cpu) || 0,
                memory: stats.mem || '0MB',
                memoryPercent: parseFloat(stats.mem_percent) || 0,
                worldName: stats.world_name || 'Unknown',
                worldSize: stats.world_size || '0MB',
                port: stats.server_port || serverInfo.server_port || 25565,
                online: parseInt(stats.online) || 0,
                maxPlayers: parseInt(stats.max) || 20,
                players: this.parsePlayers(stats.players),
                version: stats.version || 'Unknown',
                description: stats.desc || 'A Minecraft Server',
                started: stats.started,
                crashed: stats.crashed === true,
                updating: stats.updating === true
            }
        };
    }

    /**
     * Parse server status from stats
     * @param {object} stats - Raw stats from API
     * @returns {string} Status enum value
     */
    parseServerStatus(stats) {
        if (stats.crashed) return MC_STATUS.CRASHED;
        if (stats.waiting_start) return MC_STATUS.STARTING;
        if (stats.running) return MC_STATUS.RUNNING;
        return MC_STATUS.STOPPED;
    }

    /**
     * Parse players array from string
     * @param {string} playersString - Players string from API
     * @returns {string[]} Array of player names
     */
    parsePlayers(playersString) {
        if (!playersString || playersString === '[]') return [];
        try {
            return JSON.parse(playersString);
        } catch {
            return [];
        }
    }

    /**
     * Get server logs
     * @param {string} serverId - Server UUID
     * @param {number} lines - Number of lines (default 50)
     * @returns {Promise<object>}
     */
    async getServerLogs(serverId, lines = 50) {
        return await this.request(`/api/v2/servers/${serverId}/logs?file=false&colors=false`);
    }

    /**
     * Send action to server (start, stop, restart, etc.)
     * @param {string} serverId - Server UUID
     * @param {string} action - Action from CRAFTY_ACTIONS
     * @returns {Promise<object>}
     */
    async sendAction(serverId, action) {
        return await this.request(`/api/v2/servers/${serverId}/action/${action}`, {
            method: 'POST'
        });
    }

    /**
     * Start a server
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async startServer(serverId) {
        // Check current status first
        const stats = await this.getServerStats(serverId);
        if (stats.code !== RESPONSE_CODES.OK) {
            return stats;
        }
        
        if (stats.data.running) {
            return { code: RESPONSE_CODES.ALREADY_RUNNING, error: 'Server is already running' };
        }

        return await this.sendAction(serverId, CRAFTY_ACTIONS.START);
    }

    /**
     * Stop a server
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async stopServer(serverId) {
        // Check current status first
        const stats = await this.getServerStats(serverId);
        if (stats.code !== RESPONSE_CODES.OK) {
            return stats;
        }
        
        if (!stats.data.running) {
            return { code: RESPONSE_CODES.ALREADY_STOPPED, error: 'Server is already stopped' };
        }

        return await this.sendAction(serverId, CRAFTY_ACTIONS.STOP);
    }

    /**
     * Restart a server
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async restartServer(serverId) {
        return await this.sendAction(serverId, CRAFTY_ACTIONS.RESTART);
    }

    /**
     * Kill a server (force stop)
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async killServer(serverId) {
        return await this.sendAction(serverId, CRAFTY_ACTIONS.KILL);
    }

    /**
     * Send a command to server console
     * @param {string} serverId - Server UUID
     * @param {string} command - Command to send (without leading /)
     * @returns {Promise<object>}
     */
    async sendCommand(serverId, command) {
        return await this.request(`/api/v2/servers/${serverId}/stdin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: command
        });
    }

    /**
     * Backup a server
     * @param {string} serverId - Server UUID
     * @returns {Promise<object>}
     */
    async backupServer(serverId) {
        return await this.sendAction(serverId, CRAFTY_ACTIONS.BACKUP);
    }
}

/**
 * Create a Crafty client from environment variables
 * @returns {CraftyClient|null}
 */
export function createCraftyClientFromEnv() {
    const url = process.env.CRAFTY_URL;
    const token = process.env.CRAFTY_TOKEN;
    
    if (!url || !token) {
        console.warn('Crafty Controller not configured: CRAFTY_URL or CRAFTY_TOKEN missing');
        return null;
    }
    
    return new CraftyClient(url, token);
}
