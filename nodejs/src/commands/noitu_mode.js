import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { setChannelMode, getChannelMode, getCurrentWord } from '../modules/noitu/index.js';

export const data = new SlashCommandBuilder()
    .setName('noitu_mode')
    .setDescription('Chọn chế độ chơi cho kênh: bot hoặc pvp')
    .addStringOption(option =>
        option.setName('mode')
            .setDescription('Chế độ chơi (bot: user vs bot, pvp: user vs user)')
            .setRequired(true)
            .addChoices(
                { name: 'user vs bot', value: 'bot' },
                { name: 'user vs user (PvP)', value: 'pvp' }
            ));

export async function execute(interaction) {
    // Check if in DM
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Lệnh này chỉ dùng trong kênh server.',
            ephemeral: true
        });
        return;
    }

    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Bạn cần quyền Manage Server để đổi chế độ.',
            ephemeral: true
        });
        return;
    }

    const mode = interaction.options.getString('mode');
    const channelId = interaction.channel.id;

    setChannelMode(channelId, mode);

    const label = mode === 'pvp' ? 'user vs user (PvP)' : 'user vs bot';
    await interaction.reply({
        content: `✅ Đã đặt chế độ cho kênh này: **${label}**.`
    });

    const currentWord = getCurrentWord(channelId, null, false);
    if (currentWord) {
        await interaction.channel.send(`Từ hiện tại: **${currentWord}**`);
    }
}
