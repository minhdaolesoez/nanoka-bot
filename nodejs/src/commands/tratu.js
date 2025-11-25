import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { tratu, getCurrentWord } from '../modules/noitu/index.js';

export const data = new SlashCommandBuilder()
    .setName('tratu')
    .setDescription('Tra cứu từ điển tiếng Việt')
    .addStringOption(option =>
        option.setName('word')
            .setDescription('Từ cần tra cứu')
            .setRequired(true));

export async function execute(interaction) {
    const word = interaction.options.getString('word');

    try {
        await interaction.deferReply();

        const response = await tratu(word);

        const embed = new EmbedBuilder()
            .setTitle('📖 Từ điển Tiếng Việt')
            .setDescription(response)
            .setFooter({ text: 'Nguồn: minhqnd.com/api/dictionary/lookup' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Show current word if in noitu channel
        if (interaction.guild) {
            const currentWord = getCurrentWord(interaction.channel.id, null, false);
            if (currentWord) {
                await interaction.channel.send(`Từ hiện tại: **${currentWord}**`);
            }
        }
    } catch (error) {
        const errorMessage = 'Không thể tra từ lúc này, vui lòng thử lại sau.';
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage });
        } else {
            await interaction.reply({ content: errorMessage });
        }
        console.error(`Tratu failed: ${error.message}`);
    }
}
