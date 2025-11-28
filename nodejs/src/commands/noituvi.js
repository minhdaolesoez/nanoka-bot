import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import {
    addNoituChannel,
    removeNoituChannel,
    isNoituChannel,
    resetChannelGame,
    resetUserGame,
    setChannelMode,
    getChannelMode,
    getCurrentWord,
    getUserStats,
    tratu,
    GAME_CONSTANTS
} from '../modules/noitu/index.js';

// Track pending new game requests
const pendingNewGame = new Set();

export const data = new SlashCommandBuilder()
    .setName('noituvi')
    .setDescription('🇻🇳 Nối Từ Tiếng Việt')
    .addSubcommand(sub =>
        sub.setName('add')
            .setDescription('Thêm kênh hiện tại vào game nối từ'))
    .addSubcommand(sub =>
        sub.setName('remove')
            .setDescription('Xóa kênh hiện tại khỏi game nối từ'))
    .addSubcommand(sub =>
        sub.setName('mode')
            .setDescription('Chọn chế độ chơi cho kênh')
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('Chế độ chơi')
                    .setRequired(true)
                    .addChoices(
                        { name: 'user vs bot', value: 'bot' },
                        { name: 'user vs user (PvP)', value: 'pvp' }
                    )))
    .addSubcommand(sub =>
        sub.setName('newgame')
            .setDescription('Reset game - bắt đầu từ mới'))
    .addSubcommand(sub =>
        sub.setName('stats')
            .setDescription('Xem thống kê nối từ'))
    .addSubcommand(sub =>
        sub.setName('tratu')
            .setDescription('Tra cứu từ điển tiếng Việt')
            .addStringOption(opt =>
                opt.setName('word')
                    .setDescription('Từ cần tra cứu')
                    .setRequired(true)))
    .addSubcommand(sub =>
        sub.setName('help')
            .setDescription('Hiển thị hướng dẫn game nối từ'));

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'add':
            return handleAdd(interaction);
        case 'remove':
            return handleRemove(interaction);
        case 'mode':
            return handleMode(interaction);
        case 'newgame':
            return handleNewGame(interaction);
        case 'stats':
            return handleStats(interaction);
        case 'tratu':
            return handleTratu(interaction);
        case 'help':
            return handleHelp(interaction);
    }
}

// === ADD ===
async function handleAdd(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '❌ Lệnh này chỉ dùng trong kênh server.', ephemeral: true });
    }

    const channelId = interaction.channel.id;
    const added = addNoituChannel(channelId);

    if (added) {
        const newWord = resetChannelGame(channelId);
        await interaction.reply({
            content: `> **Đã thêm phòng game nối từ, bot sẽ trả lời mọi tin nhắn từ phòng này!**\n\n🎮 **Game mới đã bắt đầu!**\nTừ hiện tại: **${newWord}**`
        });
    } else {
        await interaction.reply({ content: '> **Phòng hiện tại đã có trong cơ sở dữ liệu!**' });
    }
}

// === REMOVE ===
async function handleRemove(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '❌ Lệnh này chỉ dùng trong kênh server.', ephemeral: true });
    }

    const channelId = interaction.channel.id;

    if (isNoituChannel(channelId)) {
        removeNoituChannel(channelId);
        await interaction.reply({ content: '> **Đã xóa phòng game nối từ và toàn bộ dữ liệu của phòng này.**' });
    } else {
        await interaction.reply({ content: '> **Không thể xóa vì chưa thêm phòng.**' });
    }
}

// === MODE ===
async function handleMode(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '❌ Lệnh này chỉ dùng trong kênh server.', ephemeral: true });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Bạn cần quyền Manage Server để đổi chế độ.', ephemeral: true });
    }

    const mode = interaction.options.getString('type');
    const channelId = interaction.channel.id;

    setChannelMode(channelId, mode);

    const label = mode === 'pvp' ? 'user vs user (PvP)' : 'user vs bot';
    await interaction.reply({ content: `✅ Đã đặt chế độ cho kênh này: **${label}**.` });

    const currentWord = getCurrentWord(channelId, null, false);
    if (currentWord) {
        await interaction.channel.send(`Từ hiện tại: **${currentWord}**`);
    }
}

// === NEWGAME ===
async function handleNewGame(interaction) {
    const userId = interaction.user.id;

    // DM mode
    if (!interaction.guild) {
        const newWord = resetUserGame(userId);
        return interaction.reply({ content: `🎮 **Game mới đã bắt đầu!**\nTừ hiện tại: **${newWord}**` });
    }

    const channelId = interaction.channel.id;

    if (!isNoituChannel(channelId)) {
        return interaction.reply({ content: '> **Channel này chưa được thêm vào game nối từ!**', ephemeral: true });
    }

    if (pendingNewGame.has(channelId)) {
        return interaction.reply({ content: '⚠️ Đang có yêu cầu reset đang chờ xác nhận trong channel này.', ephemeral: true });
    }

    const customId = `cancel_newgame_${channelId}_${Date.now()}`;
    const cancelButton = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel('Hủy')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(cancelButton);
    pendingNewGame.add(channelId);

    const gameMsg = await interaction.reply({
        content: `**${interaction.user}** muốn bỏ qua từ hiện tại. Nếu không ai hủy, game sẽ reset sau ${GAME_CONSTANTS.PENDING_GAME_TIMEOUT / 1000}s.`,
        components: [row],
        fetchReply: true
    });

    let cancelled = false;

    const collector = gameMsg.createMessageComponentCollector({
        filter: (i) => i.customId === customId,
        time: GAME_CONSTANTS.PENDING_GAME_TIMEOUT
    });

    collector.on('collect', async (i) => {
        cancelled = true;
        try {
            await i.update({ content: `Reset bị hủy bởi **${i.user}**.`, components: [] });
        } catch (e) {
            console.error(`Failed to update cancel: ${e.message}`);
        }
        pendingNewGame.delete(channelId);
        collector.stop('cancelled');
    });

    collector.on('end', async (collected, reason) => {
        if (!cancelled) {
            try {
                const newWord = resetChannelGame(channelId);
                await gameMsg.edit({
                    content: `> **${interaction.user}** đã yêu cầu bỏ qua từ hiện tại. Bắt đầu từ mới!\n\n🔤 Từ mới: **${newWord}**`,
                    components: []
                });
            } catch (e) {
                console.error(`Failed to reset game: ${e.message}`);
            }
        }
        pendingNewGame.delete(channelId);
    });
}

// === STATS ===
async function handleStats(interaction) {
    const userId = interaction.user.id;
    const isDM = !interaction.guild;
    const channelId = isDM ? null : interaction.channel.id;

    const stats = getUserStats(channelId, userId, isDM);

    const heading = isDM
        ? `Thống kê của ${interaction.user}`
        : `Thống kê của ${interaction.user} trong kênh này`;

    const statsText = `> Chuỗi hiện tại: **${stats.currentStreak}** | Cao nhất: **${stats.bestStreak}** | Thắng: **${stats.wins}**`;

    await interaction.reply({ content: `${heading}\n${statsText}` });

    if (stats.word) {
        await interaction.channel.send(`Từ hiện tại: **${stats.word}**`);
    }
}

// === TRATU ===
async function handleTratu(interaction) {
    const word = interaction.options.getString('word');

    try {
        await interaction.deferReply();

        const response = await tratu(word);

        const embed = new EmbedBuilder()
            .setTitle('📖 Từ điển Tiếng Việt')
            .setDescription(response)
            .setFooter({ text: 'Nguồn: minhqnd.com/api/dictionary/lookup' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Show current word if in noitu channel
        if (interaction.guild) {
            const currentWord = getCurrentWord(interaction.channel.id, null, false);
            if (currentWord) {
                await interaction.channel.send(`Từ hiện tại: **${currentWord}**`);
            }
        }
    } catch (error) {
        const errorMessage = 'Không thể tra từ lúc này, vui lòng thử lại sau.';
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage });
        } else {
            await interaction.reply({ content: errorMessage });
        }
        console.error(`Tratu failed: ${error.message}`);
    }
}

// === HELP ===
async function handleHelp(interaction) {
    const helpEmbed = new EmbedBuilder()
        .setTitle('🇻🇳 Nối Từ Tiếng Việt - Hướng dẫn')
        .setDescription('Bot game nối từ Tiếng Việt với từ gồm 2 chữ')
        .setColor(0x00ff00)
        .addFields(
            {
                name: '🎯 Commands',
                value: [
                    '`/noituvi add` - Thêm phòng game nối từ',
                    '`/noituvi remove` - Xóa phòng game nối từ',
                    '`/noituvi mode` - Đặt chế độ chơi (bot/pvp)',
                    '`/noituvi newgame` - Bắt đầu game mới',
                    '`/noituvi stats` - Xem thống kê cá nhân',
                    '`/noituvi tratu [từ]` - Tra cứu từ điển',
                    '`/noituvi help` - Hiển thị hướng dẫn này'
                ].join('\n'),
                inline: false
            },
            {
                name: '🎮 Cách chơi',
                value: 'Nhập từ gồm 2 chữ.\n• Chế độ bot: bot sẽ đưa ra từ tiếp theo.\n• Chế độ PvP: bot chỉ kiểm tra và thả reaction (✅ đúng, ❌ sai/ko có từ, 🔴 đã lặp, ⚠️ sai format).\n• Từ không có trong từ điển sẽ được coi là sai.',
                inline: false
            },
            {
                name: '📖 Ví dụ',
                value: '```\nBot: thế chân\nUser: chân trời\nBot: trời xanh\nUser: xanh lục\n...```',
                inline: false
            }
        )
        .setFooter({ text: 'Game nối từ Tiếng Việt - 60,000+ từ' })
        .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });

    if (interaction.guild) {
        const currentWord = getCurrentWord(interaction.channel.id, null, false);
        if (currentWord) {
            await interaction.channel.send(`Từ hiện tại: **${currentWord}**`);
        }
    }
}

export { pendingNewGame };
