import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { startMatch } from '../modules/wordchain/index.js';
import { GAME_CONSTANTS } from '../modules/wordchain/constants.js';

export const data = new SlashCommandBuilder()
    .setName('wc_start')
    .setDescription('Start an English Word Chain match in this channel');

export async function execute(interaction) {
    const result = startMatch(
        interaction.channel.id,
        interaction.user.id,
        interaction.user.displayName
    );

    if (!result.success) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(result.error)
                .setColor(0xFF8888)],
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🔤 Word Chain Match Started!')
        .setDescription('A new English Word Chain game has been started!')
        .addFields(
            { name: '⏱️ Time Control', value: `${GAME_CONSTANTS.TURN_TIMEOUT / 1000} seconds per turn`, inline: true },
            { name: '👥 Players', value: '1 (waiting for more...)', inline: true }
        )
        .setColor(0x88EE88)
        .setFooter({ text: `Game will abort in ${GAME_CONSTANTS.ABORT_TIMEOUT / 1000}s if no one joins. Use /wc_join to join!` })
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send turn embed
    const turnEmbed = new EmbedBuilder()
        .setTitle(`${interaction.user.displayName}'s turn!`)
        .addFields({ name: 'Previous Word', value: '-' })
        .setColor(interaction.member?.displayColor || 0x5865F2)
        .setFooter({ text: 'Turn 1 • Type ;word to play' })
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.channel.send({ embeds: [turnEmbed] });
}
