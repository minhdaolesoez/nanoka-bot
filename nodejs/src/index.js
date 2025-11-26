import { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { checkTimeouts, checkAborts, knockOutPlayer, abortMatch, getMatchState } from './modules/wordchain/index.js';
import { GAME_STATUS } from './modules/wordchain/constants.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
    ],
    partials: [Partials.Message, Partials.Channel],
});

// Command collection
client.commands = new Collection();

// Load commands
async function loadCommands() {
    const commandsPath = join(__dirname, 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const command = await import(`file://${filePath}`);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        }
    }
}

// Load events
async function loadEvents() {
    const eventsPath = join(__dirname, 'events');
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        const event = await import(`file://${filePath}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`Loaded event: ${event.name}`);
    }
}

// Word Chain timeout checker
async function wordChainTimeoutChecker() {
    // Check for timeouts
    const timedOut = checkTimeouts();
    for (const { channelId, playerId } of timedOut) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) continue;

            const result = knockOutPlayer(channelId, playerId);
            if (!result) continue;

            const user = await client.users.fetch(playerId);
            await channel.send(`${user} was knocked out! ⏱️`);

            if (result.gameOver) {
                if (result.winner) {
                    const winner = await client.users.fetch(result.winner.id);
                    const embed = new EmbedBuilder()
                        .setTitle('🏆 Game Over!')
                        .setDescription(`**${winner.displayName}** wins!`)
                        .addFields(
                            { name: 'Points', value: `${result.winner.points}`, inline: true },
                            { name: 'Words Played', value: `${result.winner.wordsPlayed}`, inline: true }
                        )
                        .setColor(0xFFD700)
                        .setTimestamp();
                    await channel.send({ embeds: [embed] });
                }
            } else if (result.nextPlayer) {
                const match = getMatchState(channelId);
                const embed = new EmbedBuilder()
                    .setTitle(`${result.nextPlayer.name}'s turn!`)
                    .addFields({ name: 'Previous Word', value: match?.lastWord || '-' })
                    .setColor(0x5865F2)
                    .setFooter({ text: `Next word must start with "${match?.lastLetter || '?'}"` })
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in timeout checker:', error);
        }
    }

    // Check for aborts
    const toAbort = checkAborts();
    for (const channelId of toAbort) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) {
                abortMatch(channelId);
                await channel.send('⚠️ Game aborted - not enough players joined.');
            }
        } catch (error) {
            console.error('Error aborting match:', error);
        }
    }
}

// Initialize bot
async function init() {
    await loadCommands();
    await loadEvents();
    
    // Start Word Chain timeout checker (every second)
    setInterval(wordChainTimeoutChecker, 1000);
    
    // Login
    client.login(process.env.DISCORD_TOKEN);
}

init().catch(console.error);

export { client };
