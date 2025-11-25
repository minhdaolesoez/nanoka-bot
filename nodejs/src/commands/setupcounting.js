import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { setupCountingChannel, setupCountingInExistingChannel } from '../modules/countingSetup.js';
import { getCountingStats } from '../modules/countingLogic.js';

export const data = new SlashCommandBuilder()
    .setName('setupcounting')
    .setDescription('Setup a counting channel for the server')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('An existing channel to use for counting (optional)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('category')
            .setDescription('The category name for the new channel')
            .setRequired(false));

export async function execute(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({
            content: "❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a counting channel!",
            ephemeral: true
        });
        return;
    }

    const channel = interaction.options.getChannel('channel');
    const categoryName = interaction.options.getString('category') || 'Fun';

    if (channel) {
        // Setup counting in the specified existing channel
        await setupCountingInExistingChannel(
            channel,
            interaction.user,
            (options) => interaction.reply(options),
            true
        );
    } else {
        // Create a new counting channel
        await setupCountingChannel(
            interaction.guild,
            interaction.user,
            (options) => interaction.reply(options),
            categoryName,
            true
        );
    }
}
