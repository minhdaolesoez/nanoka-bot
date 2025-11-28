import { Events } from 'discord.js';
import { client } from '../index.js';
import { initClients, getConfigStatus } from '../modules/server/index.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute() {
    console.log(`Bot logged in as ${client.user.tag}!`);
    
    try {
        // Sync slash commands globally
        const commands = [...client.commands.values()].map(cmd => cmd.data.toJSON());
        const data = await client.application.commands.set(commands);
        console.log(`Synced ${data.size} command(s)`);
    } catch (error) {
        console.error('Failed to sync commands:', error);
    }
    
    // Initialize server monitoring clients
    const serverStatus = initClients();
    const config = getConfigStatus();
    
    if (serverStatus.crafty) {
        console.log(`✅ Crafty Controller connected: ${config.crafty.url}`);
    } else if (config.crafty.url) {
        console.log(`⚠️ Crafty Controller configured but failed to connect`);
    }
    
    if (serverStatus.dashdot) {
        console.log(`✅ Dashdot connected: ${config.dashdot.url}`);
    } else if (config.dashdot.url) {
        console.log(`⚠️ Dashdot configured but failed to connect`);
    }
}
