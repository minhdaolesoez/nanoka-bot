import { listWords, wordPairs, normalizeVietnamese } from './wordProcessing.js';
import { GAME_CONSTANTS, GAME_MODES, RESPONSE_CODES, RESPONSE_TYPES } from './constants.js';

/**
 * Get last word from a phrase
 */
function lastWord(word) {
    return word.split(' ').slice(-1)[0];
}

/**
 * Get first word from a phrase
 */
function firstWord(word) {
    return word.split(' ')[0];
}

/**
 * Format stats line for display
 */
function formatStatsLine(userId, { currentStreak = 0, bestStreak = 0, wins = 0, isDM = false, showWins = false }) {
    const heading = isDM ? 'Chuỗi hiện tại' : `<@${userId}> trả lời đúng! Chuỗi hiện tại`;
    const parts = [`${heading}: **${currentStreak}**`, `Kỷ lục: **${bestStreak}**`];
    if (showWins) parts.push(`Thắng: **${wins}**`);
    return `${parts.join(' | ')}`;
}

/**
 * Get a word starting with given prefix that hasn't been used
 */
export function getWordStartingWith(start, history = []) {
    const possibleWords = wordPairs[start] || [];

    if (possibleWords.length === 0) {
        return false;
    }

    // Filter unused words
    const availableWords = possibleWords.filter(secondWord => {
        const fullWord = `${start} ${secondWord}`;
        return !history.includes(fullWord);
    });

    if (availableWords.length === 0) {
        return false;
    }

    // Filter words that have continuations
    const validWords = availableWords.filter(secondWord => {
        return wordPairs[secondWord] && wordPairs[secondWord].length > 0;
    });

    if (validWords.length === 0) {
        return false;
    }

    // Avoid repeating words
    const nonRepeatingWords = validWords.filter(secondWord => secondWord !== start);
    const wordsToChoose = nonRepeatingWords.length > 0 ? nonRepeatingWords : validWords;

    const secondWord = wordsToChoose[Math.floor(Math.random() * wordsToChoose.length)];
    return `${start} ${secondWord}`;
}

/**
 * Check if a word leads to dead end
 */
function uniqueWord(start) {
    const possibleWords = wordPairs[start] || [];
    if (possibleWords.length === 0) return true;

    const validContinuations = possibleWords.filter(word => {
        if (word === start) return false;
        const nextPossible = wordPairs[word] || [];
        return nextPossible.length > 0;
    });

    return validContinuations.length === 0;
}

/**
 * Generate a new random word that has continuations
 */
function newWord() {
    let word;
    do {
        word = listWords[Math.floor(Math.random() * listWords.length)];
    } while (uniqueWord(lastWord(word)));
    return word;
}

/**
 * Validate word has correct format (2 syllables)
 */
function validateWordFormat(playerWord) {
    const normalized = normalizeVietnamese(playerWord);
    return normalized.split(' ').length === GAME_CONSTANTS.WORD_LENGTH;
}

/**
 * Validate word matches (player's first word = current's last word)
 */
function validateWordMatch(currentWord, playerWord) {
    const normalizedPlayer = normalizeVietnamese(playerWord);
    return lastWord(currentWord) === firstWord(normalizedPlayer);
}

/**
 * Validate word exists in dictionary
 */
function validateWordInDictionary(playerWord) {
    const normalized = normalizeVietnamese(playerWord);
    return listWords.includes(normalized);
}

/**
 * Validate word hasn't been used before
 */
function validateWordNotRepeated(history, playerWord) {
    const normalized = normalizeVietnamese(playerWord);
    return !history.includes(normalized);
}

/**
 * Process a game move
 */
export function processMove(gameData, playerWord, userId, isDM = false) {
    if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid gameData parameter');
    }
    if (!playerWord || typeof playerWord !== 'string') {
        throw new Error('Invalid playerWord parameter');
    }
    if (!userId) {
        throw new Error('Invalid userId parameter');
    }

    const normalizedPlayer = normalizeVietnamese(playerWord.trim());

    // Validate format
    if (!validateWordFormat(playerWord)) {
        const currentWord = gameData.word;
        const lw = currentWord ? lastWord(currentWord) : 'từ';
        return {
            type: RESPONSE_TYPES.ERROR,
            code: RESPONSE_CODES.INVALID_FORMAT,
            message: `Từ bắt buộc phải gồm ${GAME_CONSTANTS.WORD_LENGTH} âm tiết và bắt đầu bằng **"${lw}"**`,
            currentWord: currentWord
        };
    }

    let { word: currentWord, history = [], players = {}, mode = GAME_MODES.BOT } = gameData;
    let userStats = (isDM ? gameData : players[userId]) || {
        currentStreak: 0,
        bestStreak: 0,
        wins: 0,
        wrongCount: 0
    };

    // Initialize game if no current word
    if (!currentWord) {
        currentWord = newWord();
        const newGameData = {
            word: currentWord,
            history: [currentWord],
            ...(isDM ? {
                currentStreak: 0,
                bestStreak: 0,
                wins: 0,
                wrongCount: 0
            } : { players: { ...players } })
        };

        return { type: RESPONSE_TYPES.INFO, message: '', currentWord: currentWord, gameData: newGameData };
    }

    // Validate word match
    if (!validateWordMatch(currentWord, playerWord)) {
        return {
            type: RESPONSE_TYPES.ERROR,
            code: RESPONSE_CODES.MISMATCH,
            message: `Từ đầu của bạn phải là **"${lastWord(currentWord)}"!** Vui lòng thử lại.`,
            currentWord: currentWord
        };
    }

    // Validate not repeated
    if (!validateWordNotRepeated(history, playerWord)) {
        userStats.wrongCount = (userStats.wrongCount || 0) + 1;

        if (userStats.wrongCount >= GAME_CONSTANTS.MAX_WRONG_COUNT) {
            const preserved = {
                bestStreak: userStats.bestStreak || 0,
                wins: userStats.wins || 0
            };

            if (mode === GAME_MODES.PVP && !isDM) {
                const newGameData = {
                    word: currentWord,
                    history: history,
                    mode: mode,
                    players: {
                        ...players,
                        [userId]: {
                            currentStreak: 0,
                            bestStreak: preserved.bestStreak,
                            wins: preserved.wins,
                            wrongCount: 0
                        }
                    }
                };

                return {
                    type: RESPONSE_TYPES.ERROR,
                    code: RESPONSE_CODES.REPEATED,
                    streakReset: true,
                    message: `Chuỗi của <@${userId}> đã **bị reset** (từ đã được trả lời). Chuỗi đạt được: **${userStats.currentStreak}**, kỷ lục: **${userStats.bestStreak}**`,
                    currentWord: currentWord,
                    gameData: newGameData
                };
            }

            const newWordVal = newWord();
            const newGameData = {
                word: newWordVal,
                history: [],
                mode: mode,
                ...(isDM ? {
                    currentStreak: 0,
                    bestStreak: preserved.bestStreak,
                    wins: preserved.wins,
                    wrongCount: 0
                } : {
                    players: {
                        ...players,
                        [userId]: {
                            currentStreak: 0,
                            bestStreak: preserved.bestStreak,
                            wins: preserved.wins,
                            wrongCount: 0
                        }
                    }
                })
            };

            return {
                type: RESPONSE_TYPES.ERROR,
                code: RESPONSE_CODES.REPEATED,
                message: `Thua cuộc, từ đã được trả lời trước đó!\nChuỗi đạt được: **${userStats.currentStreak}**, kỷ lục: **${userStats.bestStreak}**`,
                currentWord: newWordVal,
                gameData: newGameData
            };
        } else {
            const newGameData = {
                ...gameData,
                ...(isDM ? { wrongCount: userStats.wrongCount } : {
                    players: { ...players, [userId]: userStats }
                })
            };

            return {
                type: RESPONSE_TYPES.ERROR,
                code: RESPONSE_CODES.REPEATED,
                message: `**Từ này đã được trả lời trước đó!**. Bạn còn **${GAME_CONSTANTS.MAX_WRONG_COUNT - userStats.wrongCount}** lần đoán.`,
                currentWord: currentWord,
                gameData: newGameData
            };
        }
    }

    // Validate in dictionary
    if (!validateWordInDictionary(playerWord)) {
        userStats.wrongCount = (userStats.wrongCount || 0) + 1;

        if (userStats.wrongCount >= GAME_CONSTANTS.MAX_WRONG_COUNT) {
            const preserved = {
                bestStreak: userStats.bestStreak || 0,
                wins: userStats.wins || 0
            };

            if (mode === GAME_MODES.PVP && !isDM) {
                const newGameData = {
                    word: currentWord,
                    history: history,
                    mode: mode,
                    players: {
                        ...players,
                        [userId]: {
                            currentStreak: 0,
                            bestStreak: preserved.bestStreak,
                            wins: preserved.wins,
                            wrongCount: 0
                        }
                    }
                };

                return {
                    type: RESPONSE_TYPES.ERROR,
                    code: RESPONSE_CODES.NOT_IN_DICT,
                    streakReset: true,
                    message: `Chuỗi của <@${userId}> **bị reset** (không có trong bộ từ).\nChuỗi đạt được: **${userStats.currentStreak}**, kỷ lục: **${userStats.bestStreak}**`,
                    currentWord: currentWord,
                    gameData: newGameData
                };
            }

            const newWordVal = newWord();
            const newGameData = {
                word: newWordVal,
                history: [],
                mode: mode,
                ...(isDM ? {
                    currentStreak: 0,
                    bestStreak: preserved.bestStreak,
                    wins: preserved.wins,
                    wrongCount: 0
                } : {
                    players: {
                        ...players,
                        [userId]: {
                            currentStreak: 0,
                            bestStreak: preserved.bestStreak,
                            wins: preserved.wins,
                            wrongCount: 0
                        }
                    }
                })
            };

            return {
                type: RESPONSE_TYPES.ERROR,
                code: RESPONSE_CODES.NOT_IN_DICT,
                message: `Thua cuộc, từ không có trong bộ từ điển! Chuỗi: **${userStats.currentStreak}**, kỷ lục: **${userStats.bestStreak}**`,
                currentWord: newWordVal,
                gameData: newGameData
            };
        } else {
            const newGameData = {
                ...gameData,
                ...(isDM ? { wrongCount: userStats.wrongCount } : {
                    players: { ...players, [userId]: userStats }
                })
            };

            return {
                type: RESPONSE_TYPES.ERROR,
                code: RESPONSE_CODES.NOT_IN_DICT,
                message: `**Từ không có trong bộ từ điển!** Bạn còn **${GAME_CONSTANTS.MAX_WRONG_COUNT - userStats.wrongCount}** lần đoán.`,
                currentWord: currentWord,
                gameData: newGameData
            };
        }
    }

    // Valid move - process based on mode
    return processValidMove(gameData, normalizedPlayer, userId, isDM);
}

/**
 * Process a valid move
 */
function processValidMove(gameData, normalizedPlayer, userId, isDM) {
    let { word: currentWord, history = [], players = {}, mode = GAME_MODES.BOT } = gameData;
    let userStats = (isDM ? gameData : players[userId]) || {
        currentStreak: 0,
        bestStreak: 0,
        wins: 0,
        wrongCount: 0
    };

    // PvP mode: just accept and update
    if (mode === GAME_MODES.PVP && !isDM) {
        history.push(normalizedPlayer);
        userStats.currentStreak = (userStats.currentStreak || 0) + 1;
        userStats.bestStreak = Math.max(userStats.bestStreak || 0, userStats.currentStreak);
        userStats.wrongCount = 0;

        // Check if this is an endword
        const nextWordAvailable = getWordStartingWith(lastWord(normalizedPlayer), history);

        if (!nextWordAvailable) {
            const wins = (userStats.wins || 0) + 1;
            userStats.wins = wins;

            const newWordVal = newWord();
            const newGameData = {
                word: newWordVal,
                history: [],
                players: {
                    ...players,
                    [userId]: {
                        ...userStats,
                        wins: wins,
                        wrongCount: 0
                    }
                },
                mode: mode
            };

            const statsLine = formatStatsLine(userId, {
                currentStreak: userStats.currentStreak || 0,
                bestStreak: userStats.bestStreak || 0,
                wins: wins,
                showWins: true
            });

            return {
                type: RESPONSE_TYPES.SUCCESS,
                code: RESPONSE_CODES.WIN,
                message: `${statsLine}\n🏆 **THẮNG!** Từ "${lastWord(normalizedPlayer)}" không còn từ nào để nối tiếp!`,
                currentWord: newWordVal,
                gameData: newGameData
            };
        }

        const newGameData = {
            word: normalizedPlayer,
            history: history,
            players: { ...players, [userId]: userStats },
            mode: mode
        };

        const statsLine = formatStatsLine(userId, {
            currentStreak: userStats.currentStreak || 0,
            bestStreak: userStats.bestStreak || 0
        });

        return {
            type: RESPONSE_TYPES.SUCCESS,
            code: RESPONSE_CODES.OK,
            message: statsLine,
            gameData: newGameData
        };
    }

    // Bot mode: find next word
    const nextWord = getWordStartingWith(lastWord(normalizedPlayer), history);
    currentWord = nextWord;

    if (!nextWord) {
        // User wins
        const nextStreak = (userStats.currentStreak || 0) + 1;
        const best = Math.max(userStats.bestStreak || 0, nextStreak);
        const wins = (userStats.wins || 0) + 1;

        const newWordVal = newWord();
        const newGameData = {
            word: newWordVal,
            history: [],
            mode: mode,
            ...(isDM ? {
                currentStreak: nextStreak,
                bestStreak: best,
                wins: wins,
                wrongCount: 0
            } : {
                players: {
                    ...players,
                    [userId]: {
                        currentStreak: nextStreak,
                        bestStreak: best,
                        wins: wins,
                        wrongCount: 0
                    }
                }
            })
        };

        const statsLine = formatStatsLine(userId, {
            currentStreak: nextStreak,
            bestStreak: best,
            isDM: isDM
        });

        return {
            type: RESPONSE_TYPES.SUCCESS,
            code: RESPONSE_CODES.OK,
            message: `${statsLine}\n**BẠN ĐÃ THẮNG!** Từ cuối "${lastWord(normalizedPlayer)}" không còn từ nào để nối tiếp.`,
            currentWord: newWordVal,
            gameData: newGameData
        };
    }

    if (uniqueWord(lastWord(nextWord))) {
        // User loses - bot's word ends the chain
        const preserved = {
            bestStreak: userStats.bestStreak || 0,
            wins: userStats.wins || 0
        };

        const newWordVal = newWord();
        const newGameData = {
            word: newWordVal,
            history: [],
            mode: mode,
            ...(isDM ? {
                currentStreak: 0,
                bestStreak: preserved.bestStreak,
                wins: preserved.wins,
                wrongCount: 0
            } : {
                players: {
                    ...players,
                    [userId]: {
                        currentStreak: 0,
                        bestStreak: preserved.bestStreak,
                        wins: preserved.wins,
                        wrongCount: 0
                    }
                }
            })
        };

        const statsLine = formatStatsLine(userId, {
            currentStreak: userStats.currentStreak || 0,
            bestStreak: preserved.bestStreak,
            isDM: isDM
        });

        return {
            type: RESPONSE_TYPES.ERROR,
            code: RESPONSE_CODES.LOSS,
            message: `${statsLine}\n**Thua cuộc!** Từ tiếp theo: **"${nextWord}"** không còn từ nào để nối tiếp.`,
            currentWord: newWordVal,
            gameData: newGameData
        };
    }

    // Normal move
    history.push(normalizedPlayer, currentWord);
    userStats.currentStreak = (userStats.currentStreak || 0) + 1;
    userStats.bestStreak = Math.max(userStats.bestStreak || 0, userStats.currentStreak);
    userStats.wrongCount = 0;

    const newGameData = {
        word: currentWord,
        history: history,
        mode: mode,
        ...(isDM ? {
            currentStreak: userStats.currentStreak,
            bestStreak: userStats.bestStreak,
            wins: userStats.wins,
            wrongCount: 0
        } : {
            players: { ...players, [userId]: userStats }
        })
    };

    const statsLine = formatStatsLine(userId, {
        currentStreak: userStats.currentStreak,
        bestStreak: userStats.bestStreak,
        isDM: isDM
    });

    return {
        type: RESPONSE_TYPES.SUCCESS,
        code: RESPONSE_CODES.OK,
        message: statsLine,
        currentWord: currentWord,
        gameData: newGameData
    };
}

/**
 * Reset game and return new word
 */
export function resetGame(gameData, isDM = false) {
    const currentWord = newWord();
    const newGameData = {
        word: currentWord,
        history: [currentWord],
        mode: gameData.mode || GAME_MODES.BOT,
        ...(isDM ? {
            currentStreak: 0,
            bestStreak: gameData.bestStreak || 0,
            wins: gameData.wins || 0,
            wrongCount: 0
        } : {
            players: gameData.players || {}
        })
    };

    return { word: currentWord, gameData: newGameData };
}
