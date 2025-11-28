/**
 * Dashdot API Client
 * Handles communication with Dashdot server monitoring dashboard
 * 
 * Dashdot provides: CPU, RAM, Storage, Network stats
 * API Docs: https://getdashdot.com/docs/integration/api
 */

import { RESPONSE_CODES } from './constants.js';

/**
 * Dashdot API Client
 */
export class DashdotClient {
    /**
     * @param {string} baseUrl - Dashdot URL (e.g., https://dash.example.com)
     */
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.timeout = 10000; // 10 second timeout
    }

    /**
     * Make API request to Dashdot
     * @param {string} endpoint - API endpoint (e.g., /info)
     * @returns {Promise<object>} API response
     */
    async request(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    return { code: RESPONSE_CODES.NOT_FOUND, error: 'Endpoint not found' };
                }
                return { code: RESPONSE_CODES.ERROR, error: `HTTP ${response.status}` };
            }

            const data = await response.json();
            return { code: RESPONSE_CODES.OK, data };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { code: RESPONSE_CODES.TIMEOUT, error: 'Request timed out' };
            }
            console.error('Dashdot API error:', error);
            return { code: RESPONSE_CODES.ERROR, error: error.message };
        }
    }

    /**
     * Check if Dashdot is reachable
     * @returns {Promise<boolean>}
     */
    async isOnline() {
        const result = await this.request('/info');
        return result.code === RESPONSE_CODES.OK;
    }

    /**
     * Get system info (static data)
     * @returns {Promise<object>}
     */
    async getInfo() {
        const result = await this.request('/info');
        
        if (result.code !== RESPONSE_CODES.OK) {
            return result;
        }

        const info = result.data;
        
        return {
            code: RESPONSE_CODES.OK,
            data: {
                os: info.os || {},
                cpu: info.cpu || {},
                ram: info.ram || {},
                storage: info.storage || [],
                network: info.network || {},
                gpu: info.gpu || []
            }
        };
    }

    /**
     * Get current CPU load
     * @returns {Promise<object>}
     */
    async getCpuLoad() {
        const result = await this.request('/load/cpu');
        
        if (result.code !== RESPONSE_CODES.OK) {
            return result;
        }

        const load = result.data;
        
        // Calculate average CPU usage from all cores
        // API returns: [{load: X, temp: Y, core: Z}, ...]
        let avgUsage = 0;
        if (Array.isArray(load) && load.length > 0) {
            const totalLoad = load.reduce((sum, core) => sum + (core.load || 0), 0);
            avgUsage = totalLoad / load.length;
        }

        return {
            code: RESPONSE_CODES.OK,
            data: {
                raw: load,
                averageUsage: avgUsage.toFixed(1)
            }
        };
    }

    /**
     * Get current RAM load
     * @returns {Promise<object>}
     */
    async getRamLoad() {
        const result = await this.request('/load/ram');
        
        if (result.code !== RESPONSE_CODES.OK) {
            return result;
        }

        const load = result.data;
        
        // API returns: {load: bytes_used}
        // We need to get total RAM from /info to calculate percentage
        const usedBytes = load?.load || 0;

        return {
            code: RESPONSE_CODES.OK,
            data: {
                raw: load,
                usedBytes: usedBytes
            }
        };
    }

    /**
     * Get current storage load
     * @returns {Promise<object>}
     */
    async getStorageLoad() {
        const result = await this.request('/load/storage');
        
        if (result.code !== RESPONSE_CODES.OK) {
            return result;
        }

        return {
            code: RESPONSE_CODES.OK,
            data: result.data
        };
    }

    /**
     * Get current network load
     * @returns {Promise<object>}
     */
    async getNetworkLoad() {
        const result = await this.request('/load/network');
        
        if (result.code !== RESPONSE_CODES.OK) {
            return result;
        }

        const load = result.data;
        
        // API returns: {up: bytes/s, down: bytes/s}
        const down = load?.down || 0;
        const up = load?.up || 0;

        return {
            code: RESPONSE_CODES.OK,
            data: {
                raw: load,
                downloadSpeed: this.formatBytes(down),
                uploadSpeed: this.formatBytes(up),
                downloadRaw: down,
                uploadRaw: up
            }
        };
    }

    /**
     * Get all stats at once
     * @returns {Promise<object>}
     */
    async getAllStats() {
        const [info, cpu, ram, storage, network] = await Promise.all([
            this.getInfo(),
            this.getCpuLoad(),
            this.getRamLoad(),
            this.getStorageLoad(),
            this.getNetworkLoad()
        ]);

        // Check if any request failed
        if (info.code !== RESPONSE_CODES.OK) {
            return info; // Return first error
        }

        return {
            code: RESPONSE_CODES.OK,
            data: {
                info: info.data,
                cpu: cpu.code === RESPONSE_CODES.OK ? cpu.data : null,
                ram: ram.code === RESPONSE_CODES.OK ? ram.data : null,
                storage: storage.code === RESPONSE_CODES.OK ? storage.data : null,
                network: network.code === RESPONSE_CODES.OK ? network.data : null
            }
        };
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Bytes value
     * @returns {string} Formatted string (e.g., "1.5 MB/s")
     */
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B/s';
        
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let unitIndex = 0;
        let value = bytes;
        
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        
        return `${value.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Format storage size
     * @param {number} bytes - Bytes value
     * @returns {string} Formatted string (e.g., "500 GB")
     */
    formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let value = bytes;
        
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        
        return `${value.toFixed(1)} ${units[unitIndex]}`;
    }
}

/**
 * Create a Dashdot client from environment variables
 * @returns {DashdotClient|null}
 */
export function createDashdotClientFromEnv() {
    const url = process.env.DASHDOT_URL;
    
    if (!url) {
        console.warn('Dashdot not configured: DASHDOT_URL missing');
        return null;
    }
    
    return new DashdotClient(url);
}
