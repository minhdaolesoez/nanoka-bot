import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { removeWarningsLogic } from '../modules/warnLogic.js';

export const data = new SlashCommandBuilder()
    .setName('removewarnings')
    .setDescription('Remove a specific amount of warnings from a user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to remove warnings from')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('amount')
            .setDescription('The number of warnings to remove')
            .setRequired(true)
            .setMinValue(1));

export async function execute(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        await interaction.reply({
            content: "❌ You need to be a moderator to remove warnings!",
            ephemeral: true
        });
        return;
    }

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    await removeWarningsLogic(
        user,
        interaction.user,
        interaction.guild,
        amount,
        (options) => interaction.reply(options),
        true
    );
}
