import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { startMatch, joinMatch, validateWord, getPlayerStats } from '../modules/wordchain/index.js';
import { GAME_CONSTANTS } from '../modules/wordchain/constants.js';

export const data = new SlashCommandBuilder()
    .setName('noituen')
    .setDescription('🇬🇧 English Word Chain')
    .addSubcommand(sub =>
        sub.setName('start')
            .setDescription('Start a new Word Chain match'))
    .addSubcommand(sub =>
        sub.setName('join')
            .setDescription('Join an ongoing Word Chain match'))
    .addSubcommand(sub =>
        sub.setName('define')
            .setDescription('Look up the definition of an English word')
            .addStringOption(opt =>
                opt.setName('word')
                    .setDescription('The word to define')
                    .setRequired(true)))
    .addSubcommand(sub =>
        sub.setName('stats')
            .setDescription('View Word Chain statistics')
            .addUserOption(opt =>
                opt.setName('user')
                    .setDescription('User to view stats for')
                    .setRequired(false)))
    .addSubcommand(sub =>
        sub.setName('help')
            .setDescription('Show Word Chain rules and commands'));

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'start':
            return handleStart(interaction);
        case 'join':
            return handleJoin(interaction);
        case 'define':
            return handleDefine(interaction);
        case 'stats':
            return handleStats(interaction);
        case 'help':
            return handleHelp(interaction);
    }
}

// === START ===
async function handleStart(interaction) {
    const result = startMatch(
        interaction.channel.id,
        interaction.user.id,
        interaction.user.displayName
    );

    if (!result.success) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(result.error)
                .setColor(0xFF8888)],
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🔤 Word Chain Match Started!')
        .setDescription('A new English Word Chain game has been started!')
        .addFields(
            { name: '⏱️ Time Control', value: `${GAME_CONSTANTS.TURN_TIMEOUT / 1000} seconds per turn`, inline: true },
            { name: '👥 Players', value: '1 (waiting for more...)', inline: true }
        )
        .setColor(0x88EE88)
        .setFooter({ text: `Game will abort in ${GAME_CONSTANTS.ABORT_TIMEOUT / 1000}s if no one joins. Use /noituen join to join!` })
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send turn embed
    const turnEmbed = new EmbedBuilder()
        .setTitle(`${interaction.user.displayName}'s turn!`)
        .addFields({ name: 'Previous Word', value: '-' })
        .setColor(interaction.member?.displayColor || 0x5865F2)
        .setFooter({ text: 'Turn 1 • Type ;word to play' })
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.channel.send({ embeds: [turnEmbed] });
}

// === JOIN ===
async function handleJoin(interaction) {
    const result = joinMatch(
        interaction.channel.id,
        interaction.user.id,
        interaction.user.displayName
    );

    if (!result.success) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(result.error)
                .setColor(0xFF8888)],
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Joined!')
        .setDescription(`**${interaction.user.displayName}** joined the match!`)
        .addFields({ name: '👥 Players', value: `${result.playerCount} player(s)`, inline: true })
        .setColor(0x88EE88)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// === DEFINE ===
async function handleDefine(interaction) {
    await interaction.deferReply();

    const word = interaction.options.getString('word').toLowerCase().trim();
    const result = await validateWord(word);

    if (!result.valid || result.definitions.length === 0) {
        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setTitle(word.charAt(0).toUpperCase() + word.slice(1))
                .setDescription(`"${word}" is not a valid word!`)
                .setColor(0xFF8888)
                .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(word.charAt(0).toUpperCase() + word.slice(1))
        .setColor(0xBBFFBB)
        .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() });

    let totalDefinitions = 0;
    const partOfSpeechCount = {};

    for (const meaning of result.definitions.slice(0, 5)) {
        const partOfSpeech = meaning.partOfSpeech || 'Unknown';
        partOfSpeechCount[partOfSpeech] = (partOfSpeechCount[partOfSpeech] || 0) + 1;

        const definitions = meaning.definitions?.slice(0, 3) || [];
        totalDefinitions += definitions.length;

        if (definitions.length > 0) {
            const defText = definitions.map(d => `• ${d.definition}`).join('\n');
            embed.addFields({
                name: `${partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1)} ${partOfSpeechCount[partOfSpeech]}`,
                value: defText.substring(0, 1024)
            });
        }
    }

    embed.setDescription(`${totalDefinitions} definition(s) found:`);

    if (result.definitions.length > 5) {
        embed.setFooter({ text: 'Some definitions truncated.' });
    }

    await interaction.editReply({ embeds: [embed] });
}

// === STATS ===
async function handleStats(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const stats = getPlayerStats(targetUser.id);

    const winRate = stats.gamesPlayed > 0
        ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1)
        : 0;

    const avgPoints = stats.gamesPlayed > 0
        ? (stats.totalPoints / stats.gamesPlayed).toFixed(1)
        : 0;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Word Chain Stats`)
        .setDescription(`Statistics for **${targetUser.displayName}**`)
        .addFields(
            { name: '🎮 Games Played', value: `${stats.gamesPlayed}`, inline: true },
            { name: '🏆 Games Won', value: `${stats.gamesWon}`, inline: true },
            { name: '📈 Win Rate', value: `${winRate}%`, inline: true },
            { name: '📝 Total Words', value: `${stats.totalWords}`, inline: true },
            { name: '⭐ Total Points', value: `${stats.totalPoints}`, inline: true },
            { name: '🔥 Best Streak', value: `${stats.bestStreak}`, inline: true },
            { name: '📊 Avg Points/Game', value: `${avgPoints}`, inline: true }
        )
        .setColor(0x5865F2)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// === HELP ===
async function handleHelp(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🇬🇧 English Word Chain - Help')
        .setDescription('A multiplayer word game where players take turns saying words!')
        .addFields(
            {
                name: '📜 Rules',
                value: [
                    '• Players take turns saying words that have not already been said',
                    '• Words must be valid English words (no proper nouns)',
                    '• Each word must start with the **last letter** of the previous word',
                    `• You have **${GAME_CONSTANTS.TURN_TIMEOUT / 1000} seconds** per turn`,
                    '• If you run out of time, you get knocked out!',
                    '• Last player standing wins!'
                ].join('\n')
            },
            {
                name: '🎮 How to Play',
                value: [
                    '1. Use `/noituen start` to start a match',
                    '2. Others use `/noituen join` to join',
                    '3. Type `;word` to submit your word (e.g., `;apple`)',
                    '4. Game starts when someone plays a valid word!'
                ].join('\n')
            },
            {
                name: '🔣 Reactions',
                value: [
                    '✅ - Valid word',
                    '🚫 - Invalid word (not in dictionary)',
                    '❌ - Wrong starting letter',
                    '🔄 - Word already used',
                    '🖐️ - Not your turn'
                ].join('\n')
            },
            {
                name: '💻 Commands',
                value: [
                    '`/noituen start` - Start a new match',
                    '`/noituen join` - Join an existing match',
                    '`/noituen define <word>` - Look up a word definition',
                    '`/noituen stats [user]` - View player statistics',
                    '`/noituen help` - Show this help message'
                ].join('\n')
            }
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Good luck and have fun!' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
