import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { clearWarningsLogic } from '../modules/warnLogic.js';

export const data = new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all warnings for a user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to clear warnings for')
            .setRequired(true));

export async function execute(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        await interaction.reply({
            content: "❌ You need to be a moderator to clear warnings!",
            ephemeral: true
        });
        return;
    }

    const user = interaction.options.getUser('user');

    await clearWarningsLogic(
        user,
        interaction.user,
        interaction.guild,
        (options) => interaction.reply(options),
        true
    );
}
