import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { validateWord } from '../modules/wordchain/index.js';

export const data = new SlashCommandBuilder()
    .setName('wc_define')
    .setDescription('Look up the definition of an English word')
    .addStringOption(option =>
        option.setName('word')
            .setDescription('The word to define')
            .setRequired(true));

export async function execute(interaction) {
    await interaction.deferReply();

    const word = interaction.options.getString('word').toLowerCase().trim();
    const result = await validateWord(word);

    if (!result.valid || result.definitions.length === 0) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setTitle(word.charAt(0).toUpperCase() + word.slice(1))
                .setDescription(`"${word}" is not a valid word!`)
                .setColor(0xFF8888)
                .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(word.charAt(0).toUpperCase() + word.slice(1))
        .setColor(0xBBFFBB)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() });

    let totalDefinitions = 0;
    const partOfSpeechCount = {};

    for (const meaning of result.definitions.slice(0, 5)) { // Limit to 5 meanings
        const partOfSpeech = meaning.partOfSpeech || 'Unknown';
        partOfSpeechCount[partOfSpeech] = (partOfSpeechCount[partOfSpeech] || 0) + 1;

        const definitions = meaning.definitions?.slice(0, 3) || []; // Limit to 3 definitions per meaning
        totalDefinitions += definitions.length;

        if (definitions.length > 0) {
            const defText = definitions.map(d => `• ${d.definition}`).join('\n');
            embed.addFields({
                name: `${partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1)} ${partOfSpeechCount[partOfSpeech]}`,
                value: defText.substring(0, 1024)
            });
        }
    }

    embed.setDescription(`${totalDefinitions} definition(s) found:`);

    if (result.definitions.length > 5) {
        embed.setFooter({ text: 'Some definitions truncated.' });
    }

    await interaction.editReply({ embeds: [embed] });
}
