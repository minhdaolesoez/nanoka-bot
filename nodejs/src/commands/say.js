import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addStringOption(option =>
        option.setName('content')
            .setDescription('What you want the bot to say')
            .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const content = interaction.options.getString('content');
    
    // Delete the command message by replying ephemerally first
    await interaction.reply({ content: '✅', flags: MessageFlags.Ephemeral });
    
    // Send the message as the bot
    await interaction.channel.send(content);
}
