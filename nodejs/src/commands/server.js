/**
 * /server status - View status of all servers or a specific server
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import {
    getConfigStatus,
    listMinecraftServers,
    getMinecraftStats,
    getDebianStats,
    createMinecraftEmbed,
    createDebianEmbed,
    createServerListEmbed,
    RESPONSE_CODES,
    STATUS_COLORS,
    ICONS
} from '../modules/server/index.js';

export const data = new SlashCommandBuilder()
    .setName('server')
    .setDescription('Server monitoring commands')
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('View server status')
            .addStringOption(option =>
                option
                    .setName('type')
                    .setDescription('Server type to check')
                    .setRequired(false)
                    .addChoices(
                        { name: 'All', value: 'all' },
                        { name: 'Minecraft', value: 'minecraft' },
                        { name: 'Debian', value: 'debian' }
                    )
            )
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('Specific Minecraft server ID (use /server list to see IDs)')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List all Minecraft servers')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('minecraft')
            .setDescription('Minecraft server actions')
            .addStringOption(option =>
                option
                    .setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Start', value: 'start' },
                        { name: 'Stop', value: 'stop' },
                        { name: 'Restart', value: 'restart' }
                    )
            )
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('Server ID (use /server list to see IDs)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('command')
            .setDescription('Send a command to Minecraft server')
            .addStringOption(option =>
                option
                    .setName('server_id')
                    .setDescription('Server ID')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('cmd')
                    .setDescription('Command to send (without leading /)')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Check configuration
    const config = getConfigStatus();
    
    switch (subcommand) {
        case 'status':
            await handleStatus(interaction, config);
            break;
        case 'list':
            await handleList(interaction, config);
            break;
        case 'minecraft':
            await handleMinecraftAction(interaction, config);
            break;
        case 'command':
            await handleCommand(interaction, config);
            break;
    }
}

/**
 * Handle /server status
 */
async function handleStatus(interaction, config) {
    await interaction.deferReply();
    
    const type = interaction.options.getString('type') || 'all';
    const serverId = interaction.options.getString('server_id');
    
    const embeds = [];
    let hasError = false;
    
    // Specific Minecraft server
    if (serverId) {
        if (!config.crafty.configured) {
            return interaction.editReply({ 
                content: '❌ Crafty Controller is not configured.' 
            });
        }
        
        const { getMinecraftStats, createMinecraftEmbed, RESPONSE_CODES } = await import('../modules/server/index.js');
        const stats = await getMinecraftStats(serverId);
        
        if (stats.code !== RESPONSE_CODES.OK) {
            return interaction.editReply({ 
                content: `❌ Failed to get server stats: ${stats.error}` 
            });
        }
        
        embeds.push(createMinecraftEmbed(stats));
    } else {
        // Get all servers based on type
        if ((type === 'all' || type === 'minecraft') && config.crafty.configured) {
            const serversResult = await listMinecraftServers();
            
            if (serversResult.code === RESPONSE_CODES.OK && serversResult.data) {
                // Get stats for each server
                for (const server of serversResult.data.slice(0, 5)) { // Limit to 5
                    const stats = await getMinecraftStats(server.server_id);
                    if (stats.code === RESPONSE_CODES.OK) {
                        embeds.push(createMinecraftEmbed(stats));
                    }
                }
            } else if (type === 'minecraft') {
                hasError = true;
            }
        } else if (type === 'minecraft' && !config.crafty.configured) {
            return interaction.editReply({ 
                content: '❌ Crafty Controller is not configured.' 
            });
        }
        
        if ((type === 'all' || type === 'debian') && config.dashdot.configured) {
            const debianStats = await getDebianStats();
            
            if (debianStats.code === RESPONSE_CODES.OK) {
                embeds.push(createDebianEmbed(debianStats));
            } else if (type === 'debian') {
                hasError = true;
            }
        } else if (type === 'debian' && !config.dashdot.configured) {
            return interaction.editReply({ 
                content: '❌ Dashdot is not configured.' 
            });
        }
    }
    
    if (embeds.length === 0) {
        const notConfigured = [];
        if (!config.crafty.configured) notConfigured.push('Crafty');
        if (!config.dashdot.configured) notConfigured.push('Dashdot');
        
        return interaction.editReply({ 
            content: hasError 
                ? '❌ Failed to fetch server status.' 
                : `❌ No server monitoring configured. Missing: ${notConfigured.join(', ')}`
        });
    }
    
    await interaction.editReply({ embeds });
}

/**
 * Handle /server list
 */
async function handleList(interaction, config) {
    if (!config.crafty.configured) {
        return interaction.reply({ 
            content: '❌ Crafty Controller is not configured.', 
            ephemeral: true 
        });
    }
    
    await interaction.deferReply();
    
    const result = await listMinecraftServers();
    
    if (result.code !== RESPONSE_CODES.OK) {
        return interaction.editReply({ 
            content: `❌ Failed to list servers: ${result.error}` 
        });
    }
    
    const servers = result.data || [];
    
    // Get stats for each server to show current status
    const serversWithStats = await Promise.all(
        servers.map(async (server) => {
            const stats = await getMinecraftStats(server.server_id);
            return {
                ...server,
                running: stats.code === RESPONSE_CODES.OK ? stats.data.running : false,
                online: stats.code === RESPONSE_CODES.OK ? stats.data.online : 0,
                max: stats.code === RESPONSE_CODES.OK ? stats.data.maxPlayers : 20
            };
        })
    );
    
    const embed = createServerListEmbed(serversWithStats);
    await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /server minecraft start|stop|restart
 */
async function handleMinecraftAction(interaction, config) {
    if (!config.crafty.configured) {
        return interaction.reply({ 
            content: '❌ Crafty Controller is not configured.', 
            ephemeral: true 
        });
    }
    
    const action = interaction.options.getString('action');
    const serverId = interaction.options.getString('server_id');
    
    await interaction.deferReply();
    
    const { 
        startMinecraftServer, 
        stopMinecraftServer, 
        restartMinecraftServer,
        RESPONSE_CODES 
    } = await import('../modules/server/index.js');
    
    let result;
    let actionText;
    
    switch (action) {
        case 'start':
            result = await startMinecraftServer(serverId);
            actionText = 'Starting';
            break;
        case 'stop':
            result = await stopMinecraftServer(serverId);
            actionText = 'Stopping';
            break;
        case 'restart':
            result = await restartMinecraftServer(serverId);
            actionText = 'Restarting';
            break;
    }
    
    if (result.code === RESPONSE_CODES.OK) {
        const embed = new EmbedBuilder()
            .setTitle(`${ICONS.MINECRAFT} Server Action`)
            .setDescription(`✅ ${actionText} server...`)
            .setColor(STATUS_COLORS.INFO)
            .addFields({ name: 'Server ID', value: `\`${serverId}\`` })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    } else if (result.code === RESPONSE_CODES.ALREADY_RUNNING) {
        await interaction.editReply({ content: '⚠️ Server is already running.' });
    } else if (result.code === RESPONSE_CODES.ALREADY_STOPPED) {
        await interaction.editReply({ content: '⚠️ Server is already stopped.' });
    } else {
        await interaction.editReply({ 
            content: `❌ Failed to ${action} server: ${result.error}` 
        });
    }
}

/**
 * Handle /server command
 */
async function handleCommand(interaction, config) {
    if (!config.crafty.configured) {
        return interaction.reply({ 
            content: '❌ Crafty Controller is not configured.', 
            ephemeral: true 
        });
    }
    
    const serverId = interaction.options.getString('server_id');
    const command = interaction.options.getString('cmd');
    
    await interaction.deferReply();
    
    const { sendMinecraftCommand, RESPONSE_CODES } = await import('../modules/server/index.js');
    
    const result = await sendMinecraftCommand(serverId, command);
    
    if (result.code === RESPONSE_CODES.OK) {
        const embed = new EmbedBuilder()
            .setTitle(`${ICONS.MINECRAFT} Command Sent`)
            .setDescription(`✅ Command sent to server.`)
            .setColor(STATUS_COLORS.INFO)
            .addFields(
                { name: 'Command', value: `\`${command}\`` },
                { name: 'Server ID', value: `\`${serverId}\`` }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.editReply({ 
            content: `❌ Failed to send command: ${result.error}` 
        });
    }
}
