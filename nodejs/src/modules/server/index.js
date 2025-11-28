/**
 * Server Module - Unified Server Monitoring
 * Combines Crafty Controller (Minecraft) and Dashdot (Debian) APIs
 */

import { EmbedBuilder } from 'discord.js';
import { CraftyClient, createCraftyClientFromEnv } from './craftyClient.js';
import { DashdotClient, createDashdotClientFromEnv } from './dashdotClient.js';
import { 
    RESPONSE_CODES, 
    STATUS_COLORS, 
    ICONS, 
    MC_STATUS,
    SERVER_TYPES 
} from './constants.js';

// Cached clients
let craftyClient = null;
let dashdotClient = null;

/**
 * Initialize server clients
 */
export function initClients() {
    craftyClient = createCraftyClientFromEnv();
    dashdotClient = createDashdotClientFromEnv();
    
    return {
        crafty: craftyClient !== null,
        dashdot: dashdotClient !== null
    };
}

/**
 * Get Crafty client instance
 * @returns {CraftyClient|null}
 */
export function getCraftyClient() {
    if (!craftyClient) {
        craftyClient = createCraftyClientFromEnv();
    }
    return craftyClient;
}

/**
 * Get Dashdot client instance
 * @returns {DashdotClient|null}
 */
export function getDashdotClient() {
    if (!dashdotClient) {
        dashdotClient = createDashdotClientFromEnv();
    }
    return dashdotClient;
}

/**
 * Check if server monitoring is configured
 * @returns {object} Configuration status
 */
export function getConfigStatus() {
    return {
        crafty: {
            configured: !!(process.env.CRAFTY_URL && process.env.CRAFTY_TOKEN),
            url: process.env.CRAFTY_URL || null
        },
        dashdot: {
            configured: !!process.env.DASHDOT_URL,
            url: process.env.DASHDOT_URL || null
        }
    };
}

// ==================== MINECRAFT (CRAFTY) ====================

/**
 * Get list of all Minecraft servers
 * @returns {Promise<object>}
 */
export async function listMinecraftServers() {
    const client = getCraftyClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Crafty not configured' };
    }
    
    return await client.getServers();
}

/**
 * Get Minecraft server stats
 * @param {string} serverId - Server UUID
 * @returns {Promise<object>}
 */
export async function getMinecraftStats(serverId) {
    const client = getCraftyClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Crafty not configured' };
    }
    
    return await client.getServerStats(serverId);
}

/**
 * Start a Minecraft server
 * @param {string} serverId - Server UUID
 * @returns {Promise<object>}
 */
export async function startMinecraftServer(serverId) {
    const client = getCraftyClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Crafty not configured' };
    }
    
    return await client.startServer(serverId);
}

/**
 * Stop a Minecraft server
 * @param {string} serverId - Server UUID
 * @returns {Promise<object>}
 */
export async function stopMinecraftServer(serverId) {
    const client = getCraftyClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Crafty not configured' };
    }
    
    return await client.stopServer(serverId);
}

/**
 * Restart a Minecraft server
 * @param {string} serverId - Server UUID
 * @returns {Promise<object>}
 */
export async function restartMinecraftServer(serverId) {
    const client = getCraftyClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Crafty not configured' };
    }
    
    return await client.restartServer(serverId);
}

/**
 * Send command to Minecraft server
 * @param {string} serverId - Server UUID
 * @param {string} command - Command to send
 * @returns {Promise<object>}
 */
export async function sendMinecraftCommand(serverId, command) {
    const client = getCraftyClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Crafty not configured' };
    }
    
    return await client.sendCommand(serverId, command);
}

// ==================== DEBIAN (DASHDOT) ====================

/**
 * Get Debian server stats
 * @returns {Promise<object>}
 */
export async function getDebianStats() {
    const client = getDashdotClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Dashdot not configured' };
    }
    
    return await client.getAllStats();
}

/**
 * Get Debian server info
 * @returns {Promise<object>}
 */
export async function getDebianInfo() {
    const client = getDashdotClient();
    if (!client) {
        return { code: RESPONSE_CODES.ERROR, error: 'Dashdot not configured' };
    }
    
    return await client.getInfo();
}

// ==================== EMBED BUILDERS ====================

/**
 * Create embed for Minecraft server status
 * @param {object} stats - Server stats from getMinecraftStats
 * @returns {EmbedBuilder}
 */
export function createMinecraftEmbed(stats) {
    const data = stats.data;
    const statusIcon = data.running ? ICONS.ONLINE : ICONS.OFFLINE;
    const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
    const color = data.running ? STATUS_COLORS.ONLINE : STATUS_COLORS.OFFLINE;
    
    // Clean up version display (API may return "False" or boolean)
    const version = (data.version && data.version !== 'Unknown' && data.version !== 'False' && data.version !== false) 
        ? String(data.version) 
        : 'N/A';

    const embed = new EmbedBuilder()
        .setTitle(`${ICONS.MINECRAFT} ${data.name}`)
        .setColor(color)
        .addFields(
            { 
                name: 'Status', 
                value: `${statusIcon} ${statusText}`, 
                inline: true 
            },
            { 
                name: 'Version', 
                value: version, 
                inline: true 
            },
            { 
                name: 'Port', 
                value: String(data.port), 
                inline: true 
            }
        );

    if (data.running) {
        embed.addFields(
            { 
                name: `${ICONS.PLAYERS} Players`, 
                value: `${data.online}/${data.maxPlayers}`, 
                inline: true 
            },
            { 
                name: `${ICONS.CPU} CPU`, 
                value: `${data.cpu.toFixed(1)}%`, 
                inline: true 
            },
            { 
                name: `${ICONS.RAM} Memory`, 
                value: `${data.memory} (${data.memoryPercent}%)`, 
                inline: true 
            },
            { 
                name: `${ICONS.DISK} World Size`, 
                value: data.worldSize, 
                inline: true 
            }
        );

        if (data.players.length > 0) {
            embed.addFields({
                name: 'Online Players',
                value: data.players.join(', ') || 'None',
                inline: false
            });
        }
    }

    if (data.started) {
        embed.setFooter({ text: `Started: ${data.started}` });
    }

    return embed;
}

/**
 * Create embed for Debian server status
 * @param {object} stats - Server stats from getDebianStats
 * @returns {EmbedBuilder}
 */
export function createDebianEmbed(stats) {
    const data = stats.data;
    const info = data.info;

    const embed = new EmbedBuilder()
        .setTitle(`${ICONS.SERVER} Debian Server`)
        .setColor(STATUS_COLORS.INFO);

    // OS Info
    if (info.os) {
        embed.addFields({
            name: 'Operating System',
            value: `${info.os.distro || 'Unknown'} ${info.os.release || ''}`,
            inline: true
        });
    }

    // CPU Info
    if (info.cpu && data.cpu) {
        embed.addFields({
            name: `${ICONS.CPU} CPU`,
            value: `${info.cpu.brand || 'Unknown'}\n${data.cpu.averageUsage}% usage`,
            inline: true
        });
    }

    // RAM Info - calculate percentage from usedBytes and total size
    if (info.ram && data.ram) {
        const totalBytes = info.ram.size || 1;
        const usedBytes = data.ram.usedBytes || 0;
        const usedPercent = ((usedBytes / totalBytes) * 100).toFixed(1);
        const totalRam = `${(totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
        embed.addFields({
            name: `${ICONS.RAM} RAM`,
            value: `${usedPercent}% of ${totalRam}`,
            inline: true
        });
    }

    // Storage Info
    if (info.storage && info.storage.length > 0) {
        const storageInfo = info.storage.map(disk => {
            const total = disk.size ? `${(disk.size / 1024 / 1024 / 1024).toFixed(0)} GB` : 'Unknown';
            return `${disk.brand || 'Disk'}: ${total}`;
        }).join('\n');
        
        embed.addFields({
            name: `${ICONS.DISK} Storage`,
            value: storageInfo || 'No data',
            inline: true
        });
    }

    // Network Info (real-time)
    if (data.network) {
        embed.addFields({
            name: 'Network',
            value: `${ICONS.NETWORK_DOWN} ${data.network.downloadSpeed}\n${ICONS.NETWORK_UP} ${data.network.uploadSpeed}`,
            inline: true
        });
    }

    // Speed test results (values from Dashdot are in bps, convert to Mbps)
    if (info.network && (info.network.speedDown || info.network.speedUp)) {
        const speedDown = info.network.speedDown ? (info.network.speedDown / 1000000).toFixed(1) : 0;
        const speedUp = info.network.speedUp ? (info.network.speedUp / 1000000).toFixed(1) : 0;
        embed.addFields({
            name: 'Speed Test',
            value: `↓ ${speedDown} Mbps\n↑ ${speedUp} Mbps`,
            inline: true
        });
    }

    embed.setTimestamp();

    return embed;
}

/**
 * Create embed for server list
 * @param {object[]} servers - Array of server info
 * @returns {EmbedBuilder}
 */
export function createServerListEmbed(servers) {
    const embed = new EmbedBuilder()
        .setTitle(`${ICONS.SERVER} Minecraft Servers`)
        .setColor(STATUS_COLORS.INFO)
        .setTimestamp();

    if (servers.length === 0) {
        embed.setDescription('No servers found.');
        return embed;
    }

    for (const server of servers) {
        const statusIcon = server.running ? ICONS.ONLINE : ICONS.OFFLINE;
        const statusText = server.running ? 'Online' : 'Offline';
        const players = server.running ? `${server.online || 0}/${server.max || 20}` : '-';
        
        embed.addFields({
            name: `${statusIcon} ${server.server_name || 'Unknown Server'}`,
            value: `Status: ${statusText}\nPlayers: ${players}\nID: \`${server.server_id}\``,
            inline: true
        });
    }

    return embed;
}

// Re-export constants and response codes
export { RESPONSE_CODES, STATUS_COLORS, ICONS, MC_STATUS, SERVER_TYPES };
export { CraftyClient } from './craftyClient.js';
export { DashdotClient } from './dashdotClient.js';
