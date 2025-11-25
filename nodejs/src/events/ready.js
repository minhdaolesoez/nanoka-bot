import { Events } from 'discord.js';
import { client } from '../index.js';

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
}
