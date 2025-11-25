import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { resetChannelGame, resetUserGame, isNoituChannel, GAME_CONSTANTS } from '../modules/noitu/index.js';

// Track pending new game requests
const pendingNewGame = new Set();

export const data = new SlashCommandBuilder()
    .setName('newgame')
    .setDescription('Reset nối từ - bắt đầu game mới');

export async function execute(interaction) {
    const userId = interaction.user.id;

    // Check if DM
    if (!interaction.guild) {
        const newWord = resetUserGame(userId);
        await interaction.reply({
            content: `🎮 **Game mới đã bắt đầu!**\nTừ hiện tại: **${newWord}**`
        });
        return;
    }

    const channelId = interaction.channel.id;

    if (!isNoituChannel(channelId)) {
        await interaction.reply({
            content: '> **Channel này chưa được thêm vào game nối từ!**',
            ephemeral: true
        });
        return;
    }

    if (pendingNewGame.has(channelId)) {
        await interaction.reply({
            content: '⚠️ Đang có yêu cầu reset đang chờ xác nhận trong channel này.',
            ephemeral: true
        });
        return;
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
            await i.update({
                content: `Reset bị hủy bởi **${i.user}**.`,
                components: []
            });
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

export { pendingNewGame };
