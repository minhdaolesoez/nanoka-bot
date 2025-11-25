import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { checkWarningsLogic } from '../modules/warnLogic.js';

export const data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warnings for a user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to check (defaults to yourself)')
            .setRequired(false));

export async function execute(interaction) {
    let user = interaction.options.getUser('user');
    
    // Default to command user if no user specified
    if (!user) {
        user = interaction.user;
    }

    // Check permissions - users can check their own warnings, moderators can check anyone's
    if (user.id !== interaction.user.id && 
        !interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        await interaction.reply({
            content: "❌ You can only check your own warnings, or you need moderator permissions to check other users' warnings!",
            ephemeral: true
        });
        return;
    }

    await checkWarningsLogic(
        user,
        interaction.user,
        (options) => interaction.reply(options),
        true
    );
}
