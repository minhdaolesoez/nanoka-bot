import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GAME_CONSTANTS } from '../modules/wordchain/constants.js';

export const data = new SlashCommandBuilder()
    .setName('wc_help')
    .setDescription('Show Word Chain game rules and commands');

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🔤 English Word Chain - Help')
        .setDescription('A multiplayer word game where players take turns saying words!')
        .addFields(
            {
                name: '📜 Rules',
                value: [
                    '• Players take turns saying words that have not already been said',
                    '• Words must be valid English words (no proper nouns)',
                    '• Each word must start with the **last letter** of the previous word',
                    `• You have **${GAME_CONSTANTS.TURN_TIMEOUT / 1000} seconds** per turn`,
                    '• If you run out of time, you get knocked out!',
                    '• Last player standing wins!'
                ].join('\n')
            },
            {
                name: '🎮 How to Play',
                value: [
                    '1. Use `/wc_start` to start a match',
                    '2. Others use `/wc_join` to join',
                    '3. Type `;word` to submit your word (e.g., `;apple`)',
                    '4. Game starts when someone plays a valid word!'
                ].join('\n')
            },
            {
                name: '🔣 Reactions',
                value: [
                    '✅ - Valid word',
                    '🚫 - Invalid word (not in dictionary)',
                    '❌ - Wrong starting letter',
                    '🔄 - Word already used',
                    '🖐️ - Not your turn'
                ].join('\n')
            },
            {
                name: '💻 Commands',
                value: [
                    '`/wc_start` - Start a new match',
                    '`/wc_join` - Join an existing match',
                    '`/wc_define <word>` - Look up a word definition',
                    '`/wc_stats [user]` - View player statistics',
                    '`/wc_help` - Show this help message'
                ].join('\n')
            }
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Good luck and have fun!' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
