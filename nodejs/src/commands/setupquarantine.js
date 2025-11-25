import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setupQuarantineChannel } from '../modules/channels.js';

export const data = new SlashCommandBuilder()
    .setName('setupquarantine')
    .setDescription('Setup quarantine channel (auto-bans non-moderators who post)')
    .addStringOption(option =>
        option.setName('category')
            .setDescription('The category name for the channel')
            .setRequired(false));

export async function execute(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({
            content: "❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a quarantine channel!",
            ephemeral: true
        });
        return;
    }

    const categoryName = interaction.options.getString('category') || 'Moderation';

    await setupQuarantineChannel(
        interaction.guild,
        interaction.user,
        (options) => interaction.reply(options),
        categoryName,
        true
    );
}
