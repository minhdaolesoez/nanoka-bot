import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { removeTimeoutLogic } from '../modules/warnLogic.js';

export const data = new SlashCommandBuilder()
    .setName('removetimeout')
    .setDescription('Remove timeout from a user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to remove timeout from')
            .setRequired(true));

export async function execute(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        await interaction.reply({
            content: "❌ You need to be a moderator to remove timeouts!",
            ephemeral: true
        });
        return;
    }

    const user = interaction.options.getUser('user');

    await removeTimeoutLogic(
        user,
        interaction.member,
        (options) => interaction.reply(options),
        true
    );
}
