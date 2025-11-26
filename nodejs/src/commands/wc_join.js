import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { joinMatch } from '../modules/wordchain/index.js';

export const data = new SlashCommandBuilder()
    .setName('wc_join')
    .setDescription('Join an ongoing Word Chain match in this channel');

export async function execute(interaction) {
    const result = joinMatch(
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
        .setTitle('✅ Joined!')
        .setDescription(`**${interaction.user.displayName}** joined the match!`)
        .addFields({ name: '👥 Players', value: `${result.playerCount} player(s)`, inline: true })
        .setColor(0x88EE88)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
