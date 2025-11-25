import { Events, EmbedBuilder } from 'discord.js';
import { isQuarantineChannel, incrementBanCounter, getLogChannel } from '../modules/quarantine.js';
import { handleCountingMessage } from '../modules/countingLogic.js';
import { checkChannel, checkUser, isChannelInGame, getChannelMode } from '../modules/noitu/index.js';
import { getWordStartingWith, normalizeVietnamese } from '../modules/noitu/index.js';
import { RESPONSE_CODES, GAME_MODES } from '../modules/noitu/constants.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Handle counting messages first
    await handleCountingMessage(message);

    // Handle noitu game messages
    await handleNoituMessage(message);

    // Check if message is in a quarantine channel
    if (message.guild && isQuarantineChannel(message.guild.id, message.channel.id)) {
        // Check if user is a moderator (has kick_members permission)
        if (!message.member.permissions.has('KickMembers')) {
            try {
                // Delete the message first
                await message.delete();

                // Clear all messages in the channel from this user
                const messages = await message.channel.messages.fetch({ limit: 100 });
                const userMessages = messages.filter(msg => 
                    msg.author.id === message.author.id && !msg.author.bot
                );
                
                for (const [, msg] of userMessages) {
                    try {
                        await msg.delete();
                    } catch (e) {
                        // Ignore delete errors
                    }
                }

                // Ban the user
                await message.member.ban({ reason: 'Posted in quarantine channel' });

                // Increment ban counter
                const banCount = incrementBanCounter(message.guild.id);

                // Create detailed log embed
                const embed = new EmbedBuilder()
                    .setTitle('🚫 User Auto-Banned')
                    .setDescription(`${message.author} was automatically banned for posting in quarantine channel`)
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .addFields(
                        { name: '👤 User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: '📝 Display Name', value: message.member.displayName, inline: true },
                        { name: '🏷️ Username', value: `@${message.author.username}`, inline: true },
                        { name: '📅 Account Created', value: `<t:${Math.floor(message.author.createdTimestamp / 1000)}:F>`, inline: true },
                        { name: '📥 Joined Server', value: message.member.joinedAt ? `<t:${Math.floor(message.member.joinedTimestamp / 1000)}:F>` : 'Unknown', inline: true },
                        { name: '🆔 User ID', value: `\`${message.author.id}\``, inline: true },
                        { name: '📍 Channel', value: `${message.channel}`, inline: true },
                        { name: '🏠 Guild', value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true },
                        { name: '🕒 Message Time', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`, inline: true },
                    );

                // Message content
                let messageContent = message.content || '*No text content*';
                if (messageContent.length > 1000) {
                    messageContent = messageContent.substring(0, 1000) + '...';
                }
                embed.addFields({ name: '💬 Message Content', value: `\`\`\`${messageContent}\`\`\``, inline: false });

                // User roles
                const userRoles = message.member.roles.cache
                    .filter(role => role.id !== message.guild.id)
                    .map(role => role.toString())
                    .slice(0, 10);
                
                if (userRoles.length > 0) {
                    let rolesText = userRoles.join(', ');
                    if (message.member.roles.cache.size > 11) {
                        rolesText += ` and ${message.member.roles.cache.size - 11} more...`;
                    }
                    embed.addFields({ name: '🎭 Roles', value: rolesText, inline: false });
                } else {
                    embed.addFields({ name: '🎭 Roles', value: 'No roles', inline: false });
                }

                embed.addFields({ name: '🤖 Bot Account', value: message.author.bot ? 'Yes' : 'No', inline: true });
                embed.setFooter({ text: `Auto-ban executed • Message ID: ${message.id}` });

                if (message.author.avatar) {
                    embed.setThumbnail(message.author.displayAvatarURL());
                }

                // Send to log channel if set
                const logChannelId = getLogChannel(message.guild.id);
                if (logChannelId) {
                    const logChannel = message.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed] });
                    }
                }

                // Update ban counter in quarantine channel
                const counterEmbed = new EmbedBuilder()
                    .setTitle('📊 Auto-Ban Counter Updated')
                    .setDescription(`**Total Auto-Bans: ${banCount}**`)
                    .setColor(0x8B0000)
                    .setTimestamp()
                    .addFields({ name: 'Latest Ban', value: `${message.author} (\`${message.author.id}\`)`, inline: false })
                    .setFooter({ text: `Ban #${banCount}` });

                await message.channel.send({ embeds: [counterEmbed] });

            } catch (error) {
                if (error.code === 50013) {
                    // Missing permissions
                    const embed = new EmbedBuilder()
                        .setTitle('⚠️ Quarantine Channel Alert')
                        .setDescription(`${message.author} posted in quarantine channel but I couldn't ban them!`)
                        .setColor(0xFFA500);
                    await message.channel.send({ embeds: [embed] });
                } else {
                    console.error('Error in quarantine channel handler:', error);
                }
            }
        }
    }
}

/**
 * Handle noitu (word chain) game messages
 */
async function handleNoituMessage(message) {
    // Check if this is a DM
    const isDM = !message.guild;
    
    if (isDM) {
        // Handle DM games (user vs bot)
        await handleNoituDM(message);
    } else {
        // Handle channel games
        await handleNoituChannel(message);
    }
}

/**
 * Handle noitu game in DMs
 */
async function handleNoituDM(message) {
    const word = normalizeVietnamese(message.content.trim().toLowerCase());
    
    // Only process 2-word Vietnamese phrases
    if (word.split(' ').length !== 2) return;
    
    const result = checkUser(message.author.id, word);
    
    switch (result.code) {
        case RESPONSE_CODES.NO_CURRENT_GAME:
            // No active game, ignore
            break;
            
        case RESPONSE_CODES.SUCCESS:
            // User's word is valid, bot responds with a word
            const lastSyllable = word.split(' ')[1];
            const botWord = getWordStartingWith(lastSyllable);
            
            if (botWord) {
                // Bot plays a word
                const botResult = checkUser(message.author.id, botWord, true);
                await message.reply(`${botWord}`);
            } else {
                // Bot can't find a word - user wins!
                await message.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🎉 Bạn thắng!')
                        .setDescription(`Tôi không tìm được từ bắt đầu bằng "**${lastSyllable}**".\nDùng \`/newgame\` để chơi lại!`)
                        .setColor(0x00FF00)]
                });
            }
            break;
            
        case RESPONSE_CODES.INVALID_WORD:
            await message.react('❌');
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`❌ "**${word}**" không có trong từ điển!`)
                    .setColor(0xFF0000)]
            });
            break;
            
        case RESPONSE_CODES.WRONG_START:
            await message.react('❌');
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`❌ Từ phải bắt đầu bằng "**${result.expected}**"!`)
                    .setColor(0xFF0000)]
            });
            break;
            
        case RESPONSE_CODES.ALREADY_USED:
            await message.react('🔄');
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`🔄 "**${word}**" đã được sử dụng rồi!`)
                    .setColor(0xFFA500)]
            });
            break;
    }
}

/**
 * Handle noitu game in channels
 */
async function handleNoituChannel(message) {
    // Check if channel is in game
    if (!isChannelInGame(message.channel.id)) return;
    
    const word = normalizeVietnamese(message.content.trim().toLowerCase());
    
    // Only process 2-word Vietnamese phrases
    if (word.split(' ').length !== 2) return;
    
    const mode = getChannelMode(message.channel.id);
    const result = checkChannel(message.channel.id, message.author.id, word);
    
    switch (result.code) {
        case RESPONSE_CODES.SUCCESS:
            // Valid word
            await message.react('✅');
            
            if (mode === GAME_MODES.BOT) {
                // Bot mode: bot responds with a word
                const lastSyllable = word.split(' ')[1];
                const botWord = getWordStartingWith(lastSyllable);
                
                if (botWord) {
                    // Bot plays a word
                    checkChannel(message.channel.id, message.client.user.id, botWord);
                    await message.channel.send(`🤖 ${botWord}`);
                } else {
                    // Bot can't find a word - players win!
                    await message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('🎉 Các bạn thắng!')
                            .setDescription(`Bot không tìm được từ bắt đầu bằng "**${lastSyllable}**".\nDùng \`/newgame\` để chơi lại!`)
                            .setColor(0x00FF00)]
                    });
                }
            }
            // In PvP mode, just react and wait for next player
            break;
            
        case RESPONSE_CODES.INVALID_WORD:
            await message.react('❌');
            if (result.wrongCount !== undefined) {
                await message.reply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`❌ "**${word}**" không có trong từ điển!\n⚠️ Sai ${result.wrongCount}/3 lần`)
                        .setColor(0xFF0000)],
                    allowedMentions: { repliedUser: false }
                });
                
                if (result.gameOver) {
                    await message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('💥 Game Over!')
                            .setDescription(`${message.author} đã sai 3 lần!\nDùng \`/newgame\` để chơi lại.`)
                            .setColor(0x8B0000)]
                    });
                }
            }
            break;
            
        case RESPONSE_CODES.WRONG_START:
            await message.react('❌');
            if (result.wrongCount !== undefined) {
                await message.reply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`❌ Từ phải bắt đầu bằng "**${result.expected}**"!\n⚠️ Sai ${result.wrongCount}/3 lần`)
                        .setColor(0xFF0000)],
                    allowedMentions: { repliedUser: false }
                });
                
                if (result.gameOver) {
                    await message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('💥 Game Over!')
                            .setDescription(`${message.author} đã sai 3 lần!\nDùng \`/newgame\` để chơi lại.`)
                            .setColor(0x8B0000)]
                    });
                }
            }
            break;
            
        case RESPONSE_CODES.ALREADY_USED:
            await message.react('🔄');
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`🔄 "**${word}**" đã được sử dụng rồi!`)
                    .setColor(0xFFA500)],
                allowedMentions: { repliedUser: false }
            });
            break;
    }
}
