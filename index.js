const keepAlive = require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
const EventEmitter = require('events');

global.botEmitter = new EventEmitter();

const client = new Client();
const CONFIG_FILE = './bot_config.json';

const defaultConfig = {
    token: process.env.token || "",
    guildId: process.env.GUILD_ID || "",
    afkChannelId: process.env.AFK_CHANNEL_ID || "1496645738086531194",
    targetGuildId: process.env.TARGET_GUILD_ID || "1264561928034975775",

    task1Channel: "1507460885583626351",
    task1Msg: "!ذكريات",
    task1Count: 10,
    task1MessageGap: 5,
    task1RepeatMin: 30,
    task1RepeatMax: 35,

    task2Channel: "1497214787493433545",
    task2Msg: "بخشيش",
    task2RepeatMin: 30,
    task2RepeatMax: 32,

    task3Channel: "1505231947574546472",
    task3Msgs: ["!عمل", "!جريمة", "!رصيد"],
    task3RepeatMin: 50,
    task3RepeatMax: 52,

    task4Channel: "1505231949629882508",
    task4Msg: "!هجوم <@998040612047691827>",
    task4TargetId: "998040612047691827",
    task4TargetIds: ["998040612047691827"],
    task4TargetMode: "fixed",
    task4RepeatMin: 30,
    task4RepeatMax: 32,

    planBChannel: "1503150255594799205",
    planBMsg: "يا شباب جمعو نقاط",
    planBRepeat: 2.5,

    task5Channel: "1505231951731097610",
    task5Games: ["بلاكجاك", "روليت", "عملة", "عمل", "سلوت", "فامبيرز"],
    task5BetMin: 5000,
    task5BetMax: 10000,
    task5GapMin: 10,
    task5GapMax: 12
};

let config = { ...defaultConfig };

if (fs.existsSync(CONFIG_FILE)) {
    try {
        const savedData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        config = { ...defaultConfig, ...savedData };
    } catch (e) {
        console.error("❌ خطأ قراءة الملف:", e);
    }
}

const saveConfig = () => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error("❌ خطأ حفظ الملف:", e);
    }
};

const timingKeys = [
    'task1MessageGap', 'task1RepeatMin', 'task1RepeatMax',
    'task2RepeatMin', 'task2RepeatMax', 'task3RepeatMin', 'task3RepeatMax',
    'task4RepeatMin', 'task4RepeatMax', 'planBRepeat'
];

let isChatActive = true;
let isVoiceActive = false;
let isBotRunning = true;
let isTaskRunning = true;
const taskStates = { task1: false, task2: false, task3: false, task4: false, task5: false };
let planBInterval = null;
let isPlanBRunning = false;
let task3Index = 0;

let stats = {
    totalSent: 0,
    task1CountLog: 0,
    task2CountLog: 0,
    task3CountLog: 0,
    task4CountLog: 0,
    task5CountLog: 0,
    planBCountLog: 0,
    lastActiveTime: "لا يوجد نشاط"
};

const syncState = () => {
    keepAlive.updateBotState({
        isRunning: isBotRunning,
        isChatActive,
        isVoiceActive,
        isPlanBRunning,
        isTaskRunning,
        taskStates,
        stats,
        config
    });
};

const connectToVoice = (targetChannelId = null) => {
    if (!isVoiceActive || !config.guildId) return;
    const channelToJoin = targetChannelId || config.afkChannelId;
    if (!channelToJoin) return;

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    try {
        const existingConnection = getVoiceConnection(guild.id);
        if (existingConnection) existingConnection.destroy();

        joinVoiceChannel({
            channelId: channelToJoin,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: false
        });
        console.log(`🔊 تم الاتصال بالروم: ${channelToJoin}`);
    } catch (e) { console.error("❌ خطأ اتصال صوتي:", e); }
};

global.botEmitter.on('control', (action) => {
    if (action === 'bot') {
        isBotRunning = !isBotRunning;
        if (!isBotRunning) {
            isChatActive = false;
            isVoiceActive = false;
            isTaskRunning = false;
            task5Stopped = true;
            Object.keys(taskTimers).forEach(taskName => {
                if (taskTimers[taskName]) clearTimeout(taskTimers[taskName]);
                taskTimers[taskName] = null;
            });
            stopPlanBLoop();
            const conn = getVoiceConnection(config.guildId);
            if (conn) conn.destroy();
        } else {
            isChatActive = true;
            isVoiceActive = true;
            isTaskRunning = true;
            connectToVoice();
            startTaskLoops();
        }
    } else if (action === 'voice') {
        isVoiceActive = !isVoiceActive;
        if (isVoiceActive) {
            connectToVoice();
        } else {
            const conn = getVoiceConnection(config.guildId);
            if (conn) conn.destroy();
        }
    } else if (action === 'chat') {
        isChatActive = !isChatActive;
    } else if (action === 'tasks') {
        isTaskRunning = !isTaskRunning;
        if (isTaskRunning) {
            startTaskLoops();
        } else {
            task5Stopped = true;
        }
    } else if (action === 'planb') {
        isPlanBRunning = !isPlanBRunning;
        if (isPlanBRunning) {
            startPlanBLoop();
        }
    }
    syncState();
});

global.botEmitter.on('toggleTask', (taskName) => {
    if (!(taskName in taskStates)) return;

    taskStates[taskName] = !taskStates[taskName];
    const taskFn = taskFunctions[taskName];
    if (taskStates[taskName] && taskFn && isBotRunning && isChatActive && isTaskRunning) {
        if (taskName === 'task5') {
            runTaskInOrder(taskName, taskFn);
        } else {
            runTaskInOrder(taskName, taskFn);
            scheduleSingleTask(taskName, taskFn);
        }
    } else if (!taskStates[taskName]) {
        if (taskName === 'task5') {
            task5Stopped = true;
        } else if (taskTimers[taskName]) {
            clearTimeout(taskTimers[taskName]);
            taskTimers[taskName] = null;
        }
    }
    syncState();
});

global.botEmitter.on('togglePlanB', () => {
    isPlanBRunning = !isPlanBRunning;
    if (isPlanBRunning) startPlanBLoop();
    else stopPlanBLoop();
    syncState();
});

global.botEmitter.on('updateConfig', (newCfg) => {
    if (newCfg.afkChannelId) config.afkChannelId = newCfg.afkChannelId;
    if (newCfg.targetGuildId) config.targetGuildId = newCfg.targetGuildId;
    saveConfig();
    syncState();
});

global.botEmitter.on('updateTasksConfig', (newCfg) => {
    if (newCfg.guildId) config.guildId = newCfg.guildId;
    if (newCfg.afkChannelId) config.afkChannelId = newCfg.afkChannelId;
    if (newCfg.targetGuildId) config.targetGuildId = newCfg.targetGuildId;
    if (newCfg.task1Channel) config.task1Channel = newCfg.task1Channel;
    if (newCfg.task1Msg) config.task1Msg = newCfg.task1Msg;
    if (newCfg.task1Count) config.task1Count = parseInt(newCfg.task1Count) || 10;
    let timingChanged = false;
    timingKeys.forEach(key => {
        if (newCfg[key] !== undefined && Number.isFinite(Number(newCfg[key]))) {
            config[key] = Math.max(0.1, Number(newCfg[key]));
            timingChanged = true;
        }
    });
    if (newCfg.task2Channel) config.task2Channel = newCfg.task2Channel;
    if (newCfg.task2Msg) config.task2Msg = newCfg.task2Msg;
    if (newCfg.task3Channel) config.task3Channel = newCfg.task3Channel;
    if (newCfg.task3Msgs) config.task3Msgs = Array.isArray(newCfg.task3Msgs) ? newCfg.task3Msgs : String(newCfg.task3Msgs).split(',').map(item => item.trim());
    if (newCfg.task4Channel) config.task4Channel = newCfg.task4Channel;
    if (newCfg.task4Msg) config.task4Msg = newCfg.task4Msg;
    const normalizeTargetId = value => String(value || '').trim().replace(/^<@!?/, '').replace(/>$/, '');
    const targetId = normalizeTargetId(newCfg.task4TargetId);
    if (targetId) {
        config.task4TargetId = targetId;
    }
    if (newCfg.task4TargetIds !== undefined) {
        const targetIds = Array.isArray(newCfg.task4TargetIds)
            ? newCfg.task4TargetIds
            : String(newCfg.task4TargetIds).split(',');
        config.task4TargetIds = [...new Set(targetIds.map(normalizeTargetId).filter(Boolean))];
    }
    if (!config.task4TargetIds.includes(config.task4TargetId)) {
        config.task4TargetIds.unshift(config.task4TargetId);
    }
    if (newCfg.task4TargetMode === 'random' || newCfg.task4TargetMode === 'fixed') {
        config.task4TargetMode = newCfg.task4TargetMode;
    }
    if (newCfg.planBChannel) config.planBChannel = newCfg.planBChannel;
    if (newCfg.planBMsg) config.planBMsg = newCfg.planBMsg;
    if (newCfg.task5Channel) config.task5Channel = newCfg.task5Channel;
    if (newCfg.task5Games) {
        config.task5Games = Array.isArray(newCfg.task5Games)
            ? newCfg.task5Games
            : String(newCfg.task5Games).split(',').map(item => item.trim()).filter(Boolean);
    }
    if (newCfg.task5BetMin !== undefined && Number.isFinite(Number(newCfg.task5BetMin))) {
        config.task5BetMin = Math.max(1, Number(newCfg.task5BetMin));
    }
    if (newCfg.task5BetMax !== undefined && Number.isFinite(Number(newCfg.task5BetMax))) {
        config.task5BetMax = Math.max(config.task5BetMin || 1, Number(newCfg.task5BetMax));
    }
    if (newCfg.task5GapMin !== undefined && Number.isFinite(Number(newCfg.task5GapMin))) {
        config.task5GapMin = Math.max(0.1, Number(newCfg.task5GapMin));
    }
    if (newCfg.task5GapMax !== undefined && Number.isFinite(Number(newCfg.task5GapMax))) {
        config.task5GapMax = Math.max(config.task5GapMin || 0.1, Number(newCfg.task5GapMax));
    }
    saveConfig();
    if (timingChanged) {
        if (isBotRunning && isChatActive && isTaskRunning) {
            scheduleSingleTask('task1', runTask1Burst);
            scheduleSingleTask('task2', runTask2);
            scheduleSingleTask('task3', runTask3);
            scheduleSingleTask('task4', runTask4);
        }
        if (isPlanBRunning) startPlanBLoop();
    }
    syncState();
});

global.botEmitter.on('deleteMessages', async ({ channelId, count = 50 }) => {
    const parsedCount = Math.min(Math.max(Number(count) || 50, 1), 100);

    if (!channelId) {
        global.botEmitter.emit('deleteMessagesResult', { success: false, message: '⚠️ يجب إدخال ID الروم' });
        return;
    }

    const channel = client.channels.cache.get(channelId);
    if (!channel || !channel.messages || typeof channel.messages.fetch !== 'function') {
        global.botEmitter.emit('deleteMessagesResult', { success: false, message: '⚠️ الروم غير موجود أو لا يدعم حذف الرسائل' });
        return;
    }

    try {
        const messages = await channel.messages.fetch({ limit: parsedCount });
        const list = Array.from(messages.values());
        for (let i = 0; i < list.length; i += 5) {
            await Promise.all(list.slice(i, i + 5).map(msg => msg.delete().catch(() => {})));
        }
        const successResult = { success: true, message: `🗑️ تم حذف ${list.length} رسالة من الروم ${channelId}` };
        global.botEmitter.emit('deleteMessagesResult', successResult);
    } catch (e) {
        global.botEmitter.emit('deleteMessagesResult', { success: false, message: `❌ خطأ حذف الرسائل: ${e.message}` });
    }
});

global.sharedMonitorState = {
    active: false,
    userId: '',
    hoursBack: 24,
    startedAt: null,
    finishedAt: null,
    progress: { current: 0, total: 0, currentChannel: '' },
    result: null,
    liveMessages: []
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.botEmitter.on('monitorStart', async ({ userId, hoursBack }) => {
    if (!config.guildId) {
        global.botEmitter.emit('monitorResult', { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' });
        return;
    }

    global.sharedMonitorState.userId = String(userId).trim().replace(/^<@!?/, '').replace(/>$/, '');
    global.sharedMonitorState.hoursBack = Math.max(1, Math.min(720, Number(hoursBack) || 24));
    global.sharedMonitorState.startedAt = Date.now();
    global.sharedMonitorState.finishedAt = null;
    global.sharedMonitorState.progress = { current: 0, total: 0, currentChannel: '' };
    global.sharedMonitorState.result = null;
    global.sharedMonitorState.liveMessages = [];
    global.sharedMonitorState.active = true;

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
        global.sharedMonitorState.active = false;
        global.botEmitter.emit('monitorResult', { success: false, message: '⚠️ السيرفر غير موجود' });
        return;
    }

    const cutoff = Date.now() - (global.sharedMonitorState.hoursBack * 60 * 60 * 1000);
    const channels = guild.channels.cache.filter(c =>
        c.type === 'GUILD_TEXT' || c.type === 'GUILD_NEWS' || c.type === 0
    );
    const channelsArr = Array.from(channels.values());
    global.sharedMonitorState.progress.total = channelsArr.length;

    const channelStats = [];
    const allMessages = [];
    let scanned = 0;

    const pushLive = (msg) => {
        global.sharedMonitorState.liveMessages.unshift(msg);
        if (global.sharedMonitorState.liveMessages.length > 100) {
            global.sharedMonitorState.liveMessages.length = 100;
        }
    };

    try {
        for (const channel of channelsArr) {
            if (!global.sharedMonitorState.active) break;
            if (!channel.messages || typeof channel.messages.fetch !== 'function') {
                scanned++;
                continue;
            }

            global.sharedMonitorState.progress.currentChannel = channel.name;
            let beforeId = null;
            let channelMessages = [];
            let stop = false;
            let safety = 0;

            while (!stop && safety < 30) {
                safety++;
                try {
                    const opts = { limit: 100 };
                    if (beforeId) opts.before = beforeId;
                    const fetched = await channel.messages.fetch(opts);
                    if (fetched.size === 0) break;
                    const arr = Array.from(fetched.values());
                    const oldestInBatch = arr[arr.length - 1];

                    for (const msg of arr) {
                        if (msg.author && msg.author.id === global.sharedMonitorState.userId && msg.createdTimestamp >= cutoff) {
                            const msgData = {
                                id: msg.id,
                                content: msg.content || '',
                                timestamp: msg.createdTimestamp,
                                time: new Date(msg.createdTimestamp).toISOString(),
                                channelId: channel.id,
                                channelName: channel.name
                            };
                            channelMessages.push(msgData);
                            pushLive(msgData);
                        }
                    }

                    if (oldestInBatch && oldestInBatch.createdTimestamp < cutoff) {
                        stop = true;
                    } else {
                        beforeId = oldestInBatch ? oldestInBatch.id : null;
                        if (!beforeId) stop = true;
                    }

                    if (fetched.size < 100) break;
                } catch (e) {
                    if (e && e.status === 429) {
                        const retry = (e.retry_after || 2) * 1000;
                        await sleep(Math.min(retry + 200, 8000));
                        continue;
                    }
                    if (e && (e.status === 403 || e.code === 50001 || e.code === 50013)) {
                        break;
                    }
                    break;
                }
            }

            scanned++;
            global.sharedMonitorState.progress.current = scanned;

            if (channelMessages.length > 0) {
                channelMessages.sort((a, b) => a.timestamp - b.timestamp);
                channelStats.push({
                    channelId: channel.id,
                    channelName: channel.name,
                    count: channelMessages.length,
                    firstAt: channelMessages[0].time,
                    lastAt: channelMessages[channelMessages.length - 1].time,
                    messages: channelMessages
                });
                allMessages.push(...channelMessages);
            }
        }
    } catch (e) {
        global.sharedMonitorState.active = false;
        global.botEmitter.emit('monitorResult', { success: false, message: `❌ خطأ: ${e.message}` });
        return;
    }

    allMessages.sort((a, b) => a.timestamp - b.timestamp);

    global.sharedMonitorState.result = {
        userId: global.sharedMonitorState.userId,
        hoursBack: global.sharedMonitorState.hoursBack,
        startedAt: new Date(global.sharedMonitorState.startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - global.sharedMonitorState.startedAt,
        totalMessages: allMessages.length,
        firstMessage: allMessages.length > 0 ? allMessages[0].time : null,
        lastMessage: allMessages.length > 0 ? allMessages[allMessages.length - 1].time : null,
        channelsScanned: channelsArr.length,
        channelsWithActivity: channelStats.length,
        channels: channelStats,
        allMessages
    };
    global.sharedMonitorState.finishedAt = Date.now();
    global.sharedMonitorState.active = false;

    global.botEmitter.emit('monitorResult', { success: true, message: '✅ اكتملت المراقبة' });
});

global.botEmitter.on('monitorStop', () => {
    global.sharedMonitorState.active = false;
});

global.sharedDMState = {
    active: false,
    userId: '',
    timeRange: 'all',
    startedAt: null,
    finishedAt: null,
    progress: { current: 0, total: 0 },
    result: null
};

global.botEmitter.on('fetchDMHistory', async ({ userId, timeRange }) => {
    if (!client.user) return;

    global.sharedDMState.userId = String(userId).trim().replace(/^<@!?/, '').replace(/>$/, '');
    global.sharedDMState.timeRange = timeRange || 'all';
    global.sharedDMState.startedAt = Date.now();
    global.sharedDMState.finishedAt = null;
    global.sharedDMState.progress = { current: 0, total: 0 };
    global.sharedDMState.result = null;
    global.sharedDMState.active = true;

    try {
        const user = await client.users.fetch(global.sharedDMState.userId);
        let dmChannel = client.channels.cache.find(ch => ch.type === 'DM' && ch.recipient && ch.recipient.id === global.sharedDMState.userId);

        if (!dmChannel) {
            dmChannel = await user.createDM();
        }

        let cutoff = null;
        if (global.sharedDMState.timeRange === 'last_hour') {
            cutoff = Date.now() - (1 * 60 * 60 * 1000);
        } else if (global.sharedDMState.timeRange === 'last_6_hours') {
            cutoff = Date.now() - (6 * 60 * 60 * 1000);
        }

        const allMessages = [];
        let lastId = null;
        let safety = 0;
        const MAX_SAFETY = 60;
        let reachedCutoff = false;

        while (safety < MAX_SAFETY && !reachedCutoff) {
            safety++;
            const opts = { limit: 100 };
            if (lastId) opts.before = lastId;

            const fetched = await dmChannel.messages.fetch(opts);
            if (fetched.size === 0) break;

            const arr = Array.from(fetched.values());

            for (const msg of arr) {
                if (cutoff && msg.createdTimestamp < cutoff) {
                    reachedCutoff = true;
                    break;
                }

                allMessages.push({
                    id: msg.id,
                    content: msg.content || '',
                    timestamp: msg.createdTimestamp,
                    time: new Date(msg.createdTimestamp).toISOString(),
                    authorId: msg.author.id,
                    authorName: msg.author.username + (msg.author.discriminator && msg.author.discriminator !== '0' ? '#' + msg.author.discriminator : ''),
                    authorAvatar: msg.author.avatarURL ? msg.author.avatarURL({ dynamic: true, size: 64 }) : null,
                    isBot: msg.author.bot || false,
                    attachments: (msg.attachments || []).map(att => ({
                        id: att.id,
                        url: att.url || att.proxyURL,
                        name: att.name,
                        size: att.size,
                        contentType: att.contentType,
                        width: att.width,
                        height: att.height
                    })),
                    embeds: (msg.embeds || []).map(embed => ({
                        title: embed.title,
                        description: embed.description,
                        url: embed.url,
                        color: embed.color ? '#' + embed.color.toString(16).padStart(6, '0') : null
                    })),
                    reactions: msg.reactions ? msg.reactions.cache.size : 0
                });
            }

            lastId = arr.length > 0 ? arr[arr.length - 1].id : null;
            if (!lastId || fetched.size < 100) break;

            global.sharedDMState.progress.current = allMessages.length;
            await new Promise(r => setTimeout(r, 500));
        }

        allMessages.sort((a, b) => a.timestamp - b.timestamp);

        global.sharedDMState.result = {
            userId: global.sharedDMState.userId,
            userName: user.username,
            timeRange: global.sharedDMState.timeRange,
            startedAt: new Date(global.sharedDMState.startedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - global.sharedDMState.startedAt,
            totalMessages: allMessages.length,
            firstMessage: allMessages.length > 0 ? allMessages[0].time : null,
            lastMessage: allMessages.length > 0 ? allMessages[allMessages.length - 1].time : null,
            messages: allMessages
        };

    } catch (e) {
        global.sharedDMState.result = {
            userId: global.sharedDMState.userId,
            error: e.message,
            messages: []
        };
    }

    global.sharedDMState.finishedAt = Date.now();
    global.sharedDMState.active = false;

    if (global.botEmitter) {
        global.botEmitter.emit('dmResult', global.sharedDMState.result);
    }
});

const replyChatStatus = () => {
    return [
        `🔹 البوت: ${isBotRunning ? 'مفعّل' : 'موقف'}`,
        `🔹 الصوت: ${isVoiceActive ? 'مفعّل' : 'موقف'}`,
        `🔹 الكتابة: ${isChatActive ? 'مفعّلة' : 'موقفة'}`,
        `🔹 المهام: ${isTaskRunning ? 'مفعّلة' : 'موقفة'}`,
        `🔹 الخطة ب: ${isPlanBRunning ? 'مفعّلة' : 'موقفة'}`
    ].join('\n');
};

const MESSAGE_THROTTLE_MS = 2000;
let lastMessageSentAt = 0;
let messageQueue = Promise.resolve();
let taskQueue = Promise.resolve();

const sendChannelMessage = async (channelId, messageText, label, skipThrottle = false) => {
    if (!channelId || !messageText) return false;
    const send = messageQueue.then(async () => {
        try {
            if (!skipThrottle) {
                const elapsed = Date.now() - lastMessageSentAt;
                if (elapsed < MESSAGE_THROTTLE_MS) {
                    await new Promise(resolve => setTimeout(resolve, MESSAGE_THROTTLE_MS - elapsed));
                }
            }

            const channel = client.channels.cache.get(channelId);
            const isTextChannel = channel && (
                channel.type === 'GUILD_TEXT' ||
                channel.type === 'DM' ||
                channel.type === 'GUILD_NEWS' ||
                typeof channel.send === 'function'
            );
            if (!isTextChannel) return false;

            await channel.send(messageText);
            lastMessageSentAt = Date.now();
            stats.totalSent += 1;
            stats.lastActiveTime = new Date().toLocaleString('ar-SA');
            console.log(`✅ ${label}: ${channelId}`);
            return true;
        } catch (e) {
            console.error(`❌ ${label}: ${channelId} - ${e.message}`);
            return false;
        }
    });
    messageQueue = send.catch(() => false);
    return send;
};

const randomBetween = (minMs, maxMs) => {
    const min = Math.min(minMs, maxMs);
    const max = Math.max(minMs, maxMs);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getTaskRepeatDelay = (taskName) => {
    const min = Number(config[`${taskName}RepeatMin`]);
    const max = Number(config[`${taskName}RepeatMax`]);
    const fallback = taskName === 'task3' ? 50 : 30;
    return randomBetween((Number.isFinite(min) ? min : fallback) * 60 * 1000,
        (Number.isFinite(max) ? max : fallback) * 60 * 1000);
};

const taskTimers = { task1: null, task2: null, task3: null, task4: null, task5: null };

const scheduleSingleTask = (taskName, taskFn) => {
    const delay = getTaskRepeatDelay(taskName);
    if (taskTimers[taskName]) clearTimeout(taskTimers[taskName]);
    taskTimers[taskName] = setTimeout(async () => {
        if (isBotRunning && isChatActive && isTaskRunning && taskStates[taskName]) {
            await runTaskInOrder(taskName, taskFn);
        }
        scheduleSingleTask(taskName, taskFn);
    }, delay);
};

const runTaskInOrder = (taskName, taskFn) => {
    const run = taskQueue.then(async () => {
        if (isBotRunning && isChatActive && isTaskRunning && taskStates[taskName]) {
            await taskFn();
        }
    });
    taskQueue = run.catch(() => {});
    return run;
};

const runTask1Burst = async () => {
    if (!config.task1Channel || !config.task1Msg) return;
    const count = Math.max(1, Number(config.task1Count) || 10);
    for (let i = 0; i < count; i++) {
        if (!isBotRunning || !isChatActive || !isTaskRunning || !taskStates.task1) return;
        await sendChannelMessage(config.task1Channel, config.task1Msg, 'مهمة 1');
        stats.task1CountLog += 1;
        if (i < count - 1) {
            const gap = Math.max(3, Number(config.task1MessageGap) || 5);
            await new Promise(resolve => setTimeout(resolve, gap * 1000));
        }
    }
};

const runTask2 = async () => {
    if (!taskStates.task2 || !config.task2Channel || !config.task2Msg) return;
    await sendChannelMessage(config.task2Channel, config.task2Msg, 'مهمة 2');
    stats.task2CountLog += 1;
};

const runTask3 = async () => {
    if (!taskStates.task3 || !config.task3Channel || !Array.isArray(config.task3Msgs) || config.task3Msgs.length === 0) return;
    const msg = config.task3Msgs[task3Index % config.task3Msgs.length];
    await sendChannelMessage(config.task3Channel, msg, 'مهمة 3');
    stats.task3CountLog += 1;
    task3Index += 1;
};

const runTask4 = async () => {
    if (!taskStates.task4 || !config.task4Channel || !config.task4Msg) return;
    const targets = Array.isArray(config.task4TargetIds) && config.task4TargetIds.length > 0
        ? config.task4TargetIds
        : [config.task4TargetId].filter(Boolean);
    const targetId = config.task4TargetMode === 'random'
        ? targets[Math.floor(Math.random() * targets.length)]
        : config.task4TargetId || targets[0];
    const targetMention = targetId ? `<@${targetId}>` : '';
    const taskMessage = config.task4Msg.replace(/<@!?\d+>/g, targetMention) || `!هجوم ${targetMention}`;
    await sendChannelMessage(config.task4Channel, taskMessage, 'مهمة 4');
    stats.task4CountLog += 1;
};

let task5Stopped = true;

const runTask5 = async () => {
    if (!taskStates.task5 || !config.task5Channel) return;
    if (!Array.isArray(config.task5Games) || config.task5Games.length === 0) return;

    const betMin = Math.max(1, Number(config.task5BetMin) || 5000);
    const betMax = Math.max(betMin, Number(config.task5BetMax) || 10000);
    const gapMin = Math.max(0.1, Number(config.task5GapMin) || 10);
    const gapMax = Math.max(gapMin, Number(config.task5GapMax) || 12);

    task5Stopped = false;
    let firstMessage = true;
    while (!task5Stopped && taskStates.task5 && isBotRunning && isChatActive && isTaskRunning) {
        for (let i = 0; i < config.task5Games.length; i++) {
            if (task5Stopped || !taskStates.task5 || !isBotRunning || !isChatActive || !isTaskRunning) break;

            const game = config.task5Games[i];
            const bet = randomBetween(betMin, betMax);
            const message = `!كازينو ${game} ${bet}`;
            const sent = await sendChannelMessage(config.task5Channel, message, 'مهمة 5', firstMessage);
            firstMessage = false;
            if (sent) stats.task5CountLog = (stats.task5CountLog || 0) + 1;

            if (task5Stopped || !taskStates.task5) break;
            const gapSec = randomBetween(Math.floor(gapMin * 1000), Math.floor(gapMax * 1000)) / 1000;
            await new Promise(resolve => setTimeout(resolve, gapSec * 1000));
        }
    }
    task5Stopped = true;
    if (taskTimers.task5) {
        clearTimeout(taskTimers.task5);
        taskTimers.task5 = null;
    }
};

const taskFunctions = {
    task1: runTask1Burst,
    task2: runTask2,
    task3: runTask3,
    task4: runTask4,
    task5: runTask5
};

const stopPlanBLoop = () => {
    if (planBInterval) clearTimeout(planBInterval);
    planBInterval = null;
};

const startPlanBLoop = () => {
    stopPlanBLoop();
    if (!isPlanBRunning) return;

    const sendPlanB = async () => {
        if (!isPlanBRunning) return;
        await sendChannelMessage(config.planBChannel, config.planBMsg, 'خطة ب');
        stats.planBCountLog += 1;
        const repeat = Number(config.planBRepeat) || 2.5;
        planBInterval = setTimeout(sendPlanB, repeat * 1000);
    };

    const repeat = Number(config.planBRepeat) || 2.5;
    planBInterval = setTimeout(sendPlanB, repeat * 1000);
};

const startTaskLoops = () => {
    Object.values(taskTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
    });

    if (!isBotRunning || !isChatActive || !isTaskRunning) return;

    if (taskStates.task1) runTaskInOrder('task1', runTask1Burst);
    if (taskStates.task2) runTaskInOrder('task2', runTask2);
    if (taskStates.task3) runTaskInOrder('task3', runTask3);
    if (taskStates.task4) runTaskInOrder('task4', runTask4);
    if (taskStates.task5) runTaskInOrder('task5', runTask5);

    Object.entries(taskFunctions).forEach(([taskName, taskFn]) => {
        if (taskName === 'task5') return;
        if (taskStates[taskName]) scheduleSingleTask(taskName, taskFn);
    });
};

client.on('ready', () => {
    console.log(`✅ تم تسجيل الدخول: ${client.user.tag}`);
    startTaskLoops();
    startPlanBLoop();
    syncState();
    setInterval(syncState, 5000);
});

client.on('messageCreate', async (message) => {
    if (!message || !message.content || message.author.id !== client.user.id) return;

    const text = message.content.trim();
    const command = text.toLowerCase();

    const isReply = async (textReply) => {
        await message.reply(textReply);
    };

    if (command === '!status' || command === 'حالة' || command === 'status') {
        await isReply(replyChatStatus());
        return;
    }

    if (command === '!stop' || command === '!off' || command === 'ايقاف' || command === 'ايقاف تشغيل' || command === 'stop' || command === 'off') {
        if (!isBotRunning) {
            await isReply('⚠️ البوت متوقف بالفعل');
            return;
        }
        isBotRunning = false;
        isTaskRunning = false;
        isVoiceActive = false;
        const conn = getVoiceConnection(config.guildId);
        if (conn) conn.destroy();
        syncState();
        await isReply('⏹️ تم إيقاف البوت بالكامل');
        return;
    }

    if (command === '!start' || command === '!on' || command === 'تشغيل' || command === 'start' || command === 'on') {
        if (isBotRunning) {
            await isReply('⚠️ البوت يعمل بالفعل');
            return;
        }
        isBotRunning = true;
        isTaskRunning = true;
        isVoiceActive = true;
        connectToVoice();
        startTaskLoops();
        syncState();
        await isReply('▶️ تم تشغيل البوت');
        return;
    }

    if (command === '!voice off' || command === '!ايقاف صوت' || command === 'ايقاف صوت' || command === 'voice off') {
        if (!isVoiceActive) {
            await isReply('⚠️ الصوت متوقف بالفعل');
            return;
        }
        isVoiceActive = false;
        const conn = getVoiceConnection(config.guildId);
        if (conn) conn.destroy();
        syncState();
        await isReply('🔇 تم إيقاف الصوت');
        return;
    }

    if (command === '!voice on' || command === '!تشغيل صوت' || command === 'تشغيل صوت' || command === 'voice on') {
        if (isVoiceActive) {
            await isReply('⚠️ الصوت يعمل بالفعل');
            return;
        }
        isVoiceActive = true;
        connectToVoice();
        syncState();
        await isReply('🔊 تم تشغيل الصوت');
        return;
    }

    if (command === '!chat off' || command === '!ايقاف كتابة' || command === 'ايقاف كتابة' || command === 'chat off') {
        if (!isChatActive) {
            await isReply('⚠️ الكتابة متوقفة بالفعل');
            return;
        }
        isChatActive = false;
        syncState();
        await isReply('📝 تم إيقاف الكتابة');
        return;
    }

    if (command === '!chat on' || command === '!تشغيل كتابة' || command === 'تشغيل كتابة' || command === 'chat on') {
        if (isChatActive) {
            await isReply('⚠️ الكتابة مفعلة بالفعل');
            return;
        }
        isChatActive = true;
        syncState();
        await isReply('📝 تم تشغيل الكتابة');
        return;
    }

    if (command === '!tasks off' || command === '!ايقاف مهام' || command === 'ايقاف مهام') {
        if (!isTaskRunning) {
            await isReply('⚠️ المهام متوقفة بالفعل');
            return;
        }
        isTaskRunning = false;
        syncState();
        await isReply('🛑 تم إيقاف المهام');
        return;
    }

    if (command === '!tasks on' || command === '!تشغيل مهام' || command === 'تشغيل مهام') {
        if (isTaskRunning) {
            await isReply('⚠️ المهام تعمل بالفعل');
            return;
        }
        isTaskRunning = true;
        startTaskLoops();
        syncState();
        await isReply('▶️ تم تشغيل المهام');
        return;
    }

    if (command === '!planb off' || command === '!ايقاف خطة ب' || command === 'ايقاف خطة ب') {
        if (!isPlanBRunning) {
            await isReply('⚠️ خطة ب متوقفة بالفعل');
            return;
        }
        isPlanBRunning = false;
        stopPlanBLoop();
        syncState();
        await isReply('🛑 تم إيقاف خطة ب');
        return;
    }

    if (command === '!planb on' || command === '!تشغيل خطة ب' || command === 'تشغيل خطة ب') {
        if (isPlanBRunning) {
            await isReply('⚠️ خطة ب تعمل بالفعل');
            return;
        }
        isPlanBRunning = true;
        startPlanBLoop();
        syncState();
        await isReply('▶️ تم تشغيل خطة ب');
        return;
    }

    if (command.startsWith('!delete ') || command.startsWith('!مسح ') || command.startsWith('مسح ')) {
        const parts = text.split(/\s+/);
        const count = Number(parts[1] || 50);
        const channelId = parts[2] || null;
        if (!channelId) {
            await isReply('⚠️ التنسيق: !delete 50 123456789012345678');
            return;
        }

        const channel = client.channels.cache.get(channelId);
        if (!channel || !channel.messages || typeof channel.messages.fetch !== 'function') {
            await isReply('⚠️ الروم غير موجود أو لا يدعم حذف الرسائل');
            return;
        }

        const messages = await channel.messages.fetch({ limit: Math.min(Math.max(count, 1), 100) });
        const deleted = Array.from(messages.values());
        for (let i = 0; i < deleted.length; i += 5) {
            await Promise.all(deleted.slice(i, i + 5).map(msg => msg.delete().catch(() => {})));
        }
        await isReply(`🗑️ تم حذف ${deleted.length} رسالة من الروم ${channelId}`);
        return;
    }

    if (command === '!help' || command === 'اوامر' || command === 'commands') {
        await isReply('الأوامر المتاحة:\n!status\n!stop\n!start\n!voice off\n!voice on\n!chat off\n!chat on\n!tasks off\n!tasks on\n!planb off\n!planb on\n!delete 50 123456789012345678');
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.id !== client.user.id) return;
    if (isBotRunning && isVoiceActive && newState.channelId !== config.afkChannelId) {
        setTimeout(connectToVoice, 3000);
    }
});

global.botEmitter.on('getRoles', async () => {
    try {
        if (!config.guildId) {
            if (global.botEmitter) global.botEmitter.emit('rolesResult', { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' });
            return;
        }
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
            if (global.botEmitter) global.botEmitter.emit('rolesResult', { success: false, message: '⚠️ السيرفر غير موجود' });
            return;
        }
        const roles = await guild.roles.fetch();
        const rolesList = roles.map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor,
            position: r.position,
            permissions: r.permissions.bitfield.toString(),
            managed: r.managed,
            hoist: r.hoist,
            mentionable: r.mentionable,
            membersCount: Array.from(guild.members.cache.values()).filter(m => m.roles.cache.has(r.id)).length
        }));
        if (global.botEmitter) global.botEmitter.emit('rolesResult', { success: true, roles: rolesList });
    } catch (e) {
        if (global.botEmitter) global.botEmitter.emit('rolesResult', { success: false, message: '❌ خطأ: ' + e.message });
    }
});

global.botEmitter.on('giveRole', async ({ userId, roleId }) => {
    try {
        if (!config.guildId) {
            if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' });
            return;
        }
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
            if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: false, message: '⚠️ السيرفر غير موجود' });
            return;
        }

        const member = guild.members.cache.get(userId);
        if (!member) {
            if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: false, message: '⚠️ العضو غير موجود في السيرفر' });
            return;
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: false, message: '⚠️ الرتبة غير موجودة' });
            return;
        }

        if (member.roles.cache.has(roleId)) {
            if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: false, message: '⚠️ العضو لديه هذه الرتبة بالفعل' });
            return;
        }

        await member.roles.add(role);
        if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: true, message: '✅ تم إعطاء الرتبة بنجاح' });
    } catch (e) {
        if (global.botEmitter) global.botEmitter.emit('giveRoleResult', { success: false, message: '❌ خطأ: ' + e.message });
    }
});

global.botEmitter.on('editRole', async ({ roleId, name, color, hoist, mentionable, permissions }) => {
    try {
        if (!config.guildId) {
            if (global.botEmitter) global.botEmitter.emit('editRoleResult', { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' });
            return;
        }
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
            if (global.botEmitter) global.botEmitter.emit('editRoleResult', { success: false, message: '⚠️ السيرفر غير موجود' });
            return;
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            if (global.botEmitter) global.botEmitter.emit('editRoleResult', { success: false, message: '⚠️ الرتبة غير موجودة' });
            return;
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (color !== undefined) updateData.color = color;
        if (hoist !== undefined) updateData.hoist = hoist;
        if (mentionable !== undefined) updateData.mentionable = mentionable;
        if (permissions !== undefined) updateData.permissions = permissions;

        await role.edit(updateData);
        if (global.botEmitter) global.botEmitter.emit('editRoleResult', { success: true, message: '✅ تم تعديل الرتبة بنجاح' });
    } catch (e) {
        if (global.botEmitter) global.botEmitter.emit('editRoleResult', { success: false, message: '❌ خطأ: ' + e.message });
    }
});

global.botEmitter.on('deleteRole', async ({ roleId }) => {
    try {
        if (!config.guildId) {
            if (global.botEmitter) global.botEmitter.emit('deleteRoleResult', { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' });
            return;
        }
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
            if (global.botEmitter) global.botEmitter.emit('deleteRoleResult', { success: false, message: '⚠️ السيرفر غير موجود' });
            return;
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            if (global.botEmitter) global.botEmitter.emit('deleteRoleResult', { success: false, message: '⚠️ الرتبة غير موجودة' });
            return;
        }

        await role.delete();
        if (global.botEmitter) global.botEmitter.emit('deleteRoleResult', { success: true, message: '✅ تم حذف الرتبة بنجاح' });
    } catch (e) {
        if (global.botEmitter) global.botEmitter.emit('deleteRoleResult', { success: false, message: '❌ خطأ: ' + e.message });
    }
});

const VOICE_PERMISSIONS = [
    { key: 'CONNECT', label: 'الاتصال بالروم', flag: 0x100000 },
    { key: 'SPEAK', label: 'التحدث', flag: 0x200000 },
    { key: 'STREAM', label: 'البث', flag: 0x400000 },
    { key: 'USE_VAD', label: 'كشف النشاط', flag: 0x800000 },
    { key: 'PRIORITY_SPEAKER', label: 'متحدث متميز', flag: 0x100 },
    { key: 'MUTE_MEMBERS', label: 'كتم الأعضاء', flag: 0x4000000 },
    { key: 'DEAFEN_MEMBERS', label: 'تعطيل صوت الأعضاء', flag: 0x8000000 },
    { key: 'MOVE_MEMBERS', label: 'نقل الأعضاء', flag: 0x10000000 },
    { key: 'MANAGE_CHANNELS', label: 'إدارة القنوات', flag: 0x10 },
    { key: 'MANAGE_ROLES', label: 'إدارة الرتب', flag: 0x10000000 },
    { key: 'VIEW_CHANNEL', label: 'عرض القناة', flag: 0x400 }
];

global.botEmitter.on('getVoiceChannel', async ({ channelId }, cb) => {
    try {
        if (!config.guildId) {
            if (typeof cb === 'function') cb({ success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' });
            return;
        }
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
            if (typeof cb === 'function') cb({ success: false, message: '⚠️ السيرفر غير موجود' });
            return;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 'GUILD_VOICE') {
            if (typeof cb === 'function') cb({ success: false, message: '⚠️ الروم الصوتي غير موجود' });
            return;
        }

        const permissionOverwrites = Array.from(channel.permissionOverwrites?.cache?.values() || []).map(po => ({
            id: po.id,
            type: po.type,
            allow: po.allow.bitfield.toString(),
            deny: po.deny.bitfield.toString(),
            allowPermissions: po.allow.serialize(),
            denyPermissions: po.deny.serialize()
        }));

        const membersWithAccess = Array.from(guild.members.cache.values()).filter(m => {
            const permissions = channel.permissionsFor(m);
            return permissions && permissions.has('CONNECT');
        }).map(m => ({
            id: m.id,
            username: m.user.username,
            discriminator: m.user.discriminator,
            avatar: m.user.avatarURL ? m.user.avatarURL({ dynamic: true, size: 64 }) : null
        }));

        if (typeof cb === 'function') cb({
            success: true,
            channel: {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                userLimit: channel.userLimit,
                bitrate: channel.bitrate,
                position: channel.position,
                parentId: channel.parentId,
                permissionOverwrites,
                membersWithAccess
            }
        });
    } catch (e) {
        if (typeof cb === 'function') cb({ success: false, message: '❌ خطأ: ' + e.message });
    }
});

global.botEmitter.on('updateVoiceChannel', async ({ channelId, name, userLimit, bitrate }) => {
    try {
        if (!config.guildId) return { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' };
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return { success: false, message: '⚠️ السيرفر غير موجود' };

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 'GUILD_VOICE') return { success: false, message: '⚠️ الروم الصوتي غير موجود' };

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (userLimit !== undefined) updateData.userLimit = Math.max(0, Math.min(99, Number(userLimit) || 0));
        if (bitrate !== undefined) updateData.bitrate = Math.max(8000, Math.min(96000, Number(bitrate) || 64000));

        await channel.edit(updateData);
        return { success: true, message: '✅ تم تحديث إعدادات الروم' };
    } catch (e) {
        return { success: false, message: '❌ خطأ: ' + e.message };
    }
});

global.botEmitter.on('updateVoicePermissions', async ({ channelId, targetId, targetType, allow, deny }) => {
    try {
        if (!config.guildId) return { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' };
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return { success: false, message: '⚠️ السيرفر غير موجود' };

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 'GUILD_VOICE') return { success: false, message: '⚠️ الروم الصوتي غير موجود' };

        let allowBits = BigInt(0);
        let denyBits = BigInt(0);

        if (allow && Array.isArray(allow)) {
            allow.forEach(perm => {
                const found = VOICE_PERMISSIONS.find(p => p.key === perm);
                if (found) allowBits = allowBits | BigInt(found.flag);
            });
        }

        if (deny && Array.isArray(deny)) {
            deny.forEach(perm => {
                const found = VOICE_PERMISSIONS.find(p => p.key === perm);
                if (found) denyBits = denyBits | BigInt(found.flag);
            });
        }

        await channel.permissionOverwrites.edit(targetId, {
            allow: Number(allowBits),
            deny: Number(denyBits)
        });

        return { success: true, message: '✅ تم تحديث الصلاحيات' };
    } catch (e) {
        return { success: false, message: '❌ خطأ: ' + e.message };
    }
});

global.botEmitter.on('removeVoicePermission', async ({ channelId, targetId }) => {
    try {
        if (!config.guildId) return { success: false, message: '⚠️ لم يتم تعيين معرف السيرفر' };
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return { success: false, message: '⚠️ السيرفر غير موجود' };

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== 'GUILD_VOICE') return { success: false, message: '⚠️ الروم الصوتي غير موجود' };

        const overwrite = channel.permissionOverwrites.cache.get(targetId);
        if (overwrite) {
            await overwrite.delete();
        }

        return { success: true, message: '✅ تم إزالة الصلاحيات' };
    } catch (e) {
        return { success: false, message: '❌ خطأ: ' + e.message };
    }
});

if (process.env.token) {
    client.login(process.env.token);
} else {
    console.log('⚠️ أضف متغير token لتشغيل البوت.');
}
