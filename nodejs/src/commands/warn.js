import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { warnUserLogic } from '../modules/warnLogic.js';

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to warn')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('The reason for the warning')
            .setRequired(true));

export async function execute(interaction) {
    // Check if user has permission to warn
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        await interaction.reply({
            content: "❌ You don't have permission to warn users!",
            ephemeral: true
        });
        return;
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    await warnUserLogic(
        user,
        interaction.user,
        reason,
        interaction.guild,
        (options) => interaction.reply(options)
    );
}
