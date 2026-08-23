const keepAlive = require('./keep_alive.js');
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
const EventEmitter = require('events');

global.botEmitter = new EventEmitter();

const client = new Client();
const CONFIG_FILE = './bot_config.json';

const accountColors = ['#a89f9e', '#7a9b5a', '#8c7a68', '#5d7087', '#8d6d5f', '#7d5f95', '#77856d'];

const createDefaultAccount = (index = 1, preset = {}) => ({
    id: `account-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: preset.name || `الحساب ${index}`,
    token: preset.token || process.env.token || "",
    color: preset.color || accountColors[(index - 1) % accountColors.length],
    isPrimary: index === 1,
    guildId: preset.guildId || process.env.GUILD_ID || "",
    afkChannelId: preset.afkChannelId || process.env.AFK_CHANNEL_ID || "1496645738086531194",
    targetGuildId: preset.targetGuildId || process.env.TARGET_GUILD_ID || "1264561928034975775",

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
    planBRepeat: 2.5
});

let config = {
    primaryAccountId: "",
    activeAccountId: "",
    accounts: []
};

const getActiveAccount = () => {
    if (!Array.isArray(config.accounts) || config.accounts.length === 0) {
        config.accounts = [createDefaultAccount(1)];
    }

    if (!config.primaryAccountId && config.accounts[0]) {
        config.primaryAccountId = config.accounts[0].id;
        config.accounts[0].isPrimary = true;
    }

    const selected = config.accounts.find(account => account.id === config.activeAccountId);
    if (selected) return selected;

    const primary = config.accounts.find(account => account.id === config.primaryAccountId) || config.accounts[0];
    config.activeAccountId = primary.id;
    return primary;
};

const syncActiveConfig = () => {
    const active = getActiveAccount();
    config.primaryAccountId = config.accounts[0]?.id || config.primaryAccountId || active.id;
    config.accounts = config.accounts.map((account, index) => {
        const normalized = { ...account };
        normalized.isPrimary = account.id === config.primaryAccountId || index === 0;
        normalized.color = normalized.color || accountColors[index % accountColors.length];
        normalized.task1MessageGap ??= normalized.task1MessageGapMin ?? 5;
        normalized.task1RepeatMin ??= 30;
        normalized.task1RepeatMax ??= 35;
        normalized.task2RepeatMin ??= 30;
        normalized.task2RepeatMax ??= 32;
        normalized.task3RepeatMin ??= 50;
        normalized.task3RepeatMax ??= 52;
        normalized.task4RepeatMin ??= 30;
        normalized.task4RepeatMax ??= 32;
        if (!/^\d+$/.test(String(normalized.task4TargetId || ''))) {
            normalized.task4TargetId = "998040612047691827";
        }
        normalized.task4TargetIds = Array.isArray(normalized.task4TargetIds)
            ? normalized.task4TargetIds.filter(id => /^\d+$/.test(String(id)))
            : [];
        if (!normalized.task4TargetIds.includes(normalized.task4TargetId)) {
            normalized.task4TargetIds.unshift(normalized.task4TargetId);
        }
        normalized.task4TargetMode = normalized.task4TargetMode === 'random' ? 'random' : 'fixed';
        normalized.planBRepeat ??= normalized.planBRepeatMin ?? 2.5;
        if (normalized.isPrimary) config.primaryAccountId = normalized.id;
        if (account.id === active.id) Object.assign(active, normalized);
        return normalized;
    });
    Object.keys(active).forEach(key => {
        if (key !== 'id' && key !== 'name') config[key] = active[key];
    });
    config.activeAccountId = active.id;
};

if (fs.existsSync(CONFIG_FILE)) {
    try {
        const savedData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        config = {
            ...config,
            ...savedData,
            accounts: Array.isArray(savedData.accounts) && savedData.accounts.length > 0 ? savedData.accounts : [createDefaultAccount(1)]
        };
    } catch (e) {
        console.error("❌ خطأ قراءة الملف:", e);
    }
}

if (!Array.isArray(config.accounts) || config.accounts.length === 0) {
    config.accounts = [createDefaultAccount(1)];
}
if (!config.primaryAccountId) {
    config.primaryAccountId = config.accounts[0].id;
    config.accounts[0].isPrimary = true;
}
if (!config.activeAccountId || !config.accounts.some(account => account.id === config.activeAccountId)) {
    config.activeAccountId = config.primaryAccountId || config.accounts[0].id;
}
syncActiveConfig();

const saveConfig = () => {
    try {
        const payload = {
            primaryAccountId: config.primaryAccountId,
            activeAccountId: config.activeAccountId,
            accounts: config.accounts.map(account => ({ ...account }))
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf8');
        syncActiveConfig();
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
let isVoiceActive = true;
let isBotRunning = true;
let isTaskRunning = true;
const taskStates = { task1: false, task2: false, task3: false, task4: false };
let planBInterval = null;
let isPlanBRunning = false;
let task3Index = 0;

let stats = {
    totalSent: 0,
    task1CountLog: 0,
    task2CountLog: 0,
    task3CountLog: 0,
    task4CountLog: 0,
    planBCountLog: 0,
    lastActiveTime: "لا يوجد نشاط"
};

const syncState = () => {
    const active = getActiveAccount();
    const profileView = { ...config, ...active, activeAccountId: config.activeAccountId, accounts: config.accounts };
    keepAlive.updateBotState({
        isRunning: isBotRunning,
        isChatActive,
        isVoiceActive,
        isPlanBRunning,
        isTaskRunning,
        taskStates,
        stats,
        config: profileView
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

// الاستماع لأوامر لوحة التحكم Web Dashboard
global.botEmitter.on('control', (action) => {
    if (action === 'bot') {
        isBotRunning = !isBotRunning;
        if (!isBotRunning) {
            isChatActive = false;
            isVoiceActive = false;
            isTaskRunning = false;
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
        }
        else {
            const conn = getVoiceConnection(config.guildId);
            if (conn) conn.destroy();
        }
    } else if (action === 'chat') {
        isChatActive = !isChatActive;
    } else if (action === 'tasks') {
        isTaskRunning = !isTaskRunning;
        if (isTaskRunning) {
            startTaskLoops();
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
        runTaskInOrder(taskName, taskFn);
        scheduleSingleTask(taskName, taskFn);
    } else if (!taskStates[taskName] && taskTimers[taskName]) {
        clearTimeout(taskTimers[taskName]);
        taskTimers[taskName] = null;
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
    const active = getActiveAccount();
    let timingChanged = false;
    if (newCfg.token) active.token = newCfg.token;
    if (newCfg.guildId) active.guildId = newCfg.guildId;
    if (newCfg.afkChannelId) active.afkChannelId = newCfg.afkChannelId;
    if (newCfg.targetGuildId) active.targetGuildId = newCfg.targetGuildId;
    if (newCfg.task1Channel) active.task1Channel = newCfg.task1Channel;
    if (newCfg.task1Msg) active.task1Msg = newCfg.task1Msg;
    if (newCfg.task1Count) active.task1Count = parseInt(newCfg.task1Count) || 10;
    timingKeys.forEach(key => {
        if (newCfg[key] !== undefined && Number.isFinite(Number(newCfg[key]))) {
            active[key] = Math.max(0.1, Number(newCfg[key]));
            timingChanged = true;
        }
    });
    if (newCfg.task2Channel) active.task2Channel = newCfg.task2Channel;
    if (newCfg.task2Msg) active.task2Msg = newCfg.task2Msg;
    if (newCfg.task3Channel) active.task3Channel = newCfg.task3Channel;
    if (newCfg.task3Msgs) active.task3Msgs = Array.isArray(newCfg.task3Msgs) ? newCfg.task3Msgs : String(newCfg.task3Msgs).split(',').map(item => item.trim());
    if (newCfg.task4Channel) active.task4Channel = newCfg.task4Channel;
    if (newCfg.task4Msg) active.task4Msg = newCfg.task4Msg;
    const normalizeTargetId = value => String(value || '').replace(/\D/g, '');
    const targetId = normalizeTargetId(newCfg.task4TargetId);
    if (/^\d+$/.test(targetId)) {
        active.task4TargetId = targetId;
    }
    if (newCfg.task4TargetIds !== undefined) {
        const targetIds = Array.isArray(newCfg.task4TargetIds)
            ? newCfg.task4TargetIds
            : String(newCfg.task4TargetIds).split(',');
        active.task4TargetIds = [...new Set(targetIds.map(normalizeTargetId).filter(id => /^\d+$/.test(id)))];
    }
    if (!active.task4TargetIds.includes(active.task4TargetId)) {
        active.task4TargetIds.unshift(active.task4TargetId);
    }
    if (newCfg.task4TargetMode === 'random' || newCfg.task4TargetMode === 'fixed') {
        active.task4TargetMode = newCfg.task4TargetMode;
    }
    if (newCfg.planBChannel) active.planBChannel = newCfg.planBChannel;
    if (newCfg.planBMsg) active.planBMsg = newCfg.planBMsg;
    if (newCfg.name) active.name = newCfg.name;
    Object.assign(config, active);
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

    const result = (() => {
        if (!channelId) {
            return { success: false, message: '⚠️ يجب إدخال ID الروم' };
        }

        const channel = client.channels.cache.get(channelId);
        if (!channel || !channel.messages || typeof channel.messages.fetch !== 'function') {
            return { success: false, message: '⚠️ الروم غير موجود أو لا يدعم حذف الرسائل' };
        }

        return null;
    })();

    if (result) {
        global.botEmitter.emit('deleteMessagesResult', result);
        return;
    }

    try {
        const channel = client.channels.cache.get(channelId);
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

const waitForMessageThrottle = async () => {
    const now = Date.now();
    const elapsed = now - lastMessageSentAt;
    if (elapsed >= MESSAGE_THROTTLE_MS) {
        lastMessageSentAt = now;
        return;
    }

    const waitMs = MESSAGE_THROTTLE_MS - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitMs));
    lastMessageSentAt = Date.now();
};

const sendChannelMessage = async (channelId, messageText, label) => {
    if (!channelId || !messageText) return false;
    const send = messageQueue.then(async () => {
        try {
            const messageGap = Math.max(3000, MESSAGE_THROTTLE_MS);
            const elapsed = Date.now() - lastMessageSentAt;
            if (elapsed < messageGap) {
                await new Promise(resolve => setTimeout(resolve, messageGap - elapsed));
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

const taskTimers = { task1: null, task2: null, task3: null, task4: null };

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

const taskFunctions = {
    task1: runTask1Burst,
    task2: runTask2,
    task3: runTask3,
    task4: runTask4
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

    Object.entries(taskFunctions).forEach(([taskName, taskFn]) => {
        if (taskStates[taskName]) scheduleSingleTask(taskName, taskFn);
    });
};

global.botEmitter.on('addAccount', (accountData) => {
    const newAccount = createDefaultAccount(config.accounts.length + 1, {
        name: accountData?.name || `الحساب ${config.accounts.length + 1}`,
        token: accountData?.token || '',
        guildId: accountData?.guildId || '',
        afkChannelId: accountData?.afkChannelId || '',
        targetGuildId: accountData?.targetGuildId || '',
        color: accountData?.color || accountColors[config.accounts.length % accountColors.length]
    });
    newAccount.isPrimary = false;
    config.accounts.push(newAccount);
    config.activeAccountId = newAccount.id;
    if (!config.primaryAccountId) config.primaryAccountId = config.accounts[0].id;
    syncActiveConfig();
    saveConfig();
    syncState();
    console.log(`✅ تم إضافة حساب جديد: ${newAccount.name}`);
});

global.botEmitter.on('selectAccount', (accountId) => {
    if (!config.accounts.some(account => account.id === accountId)) return;
    config.activeAccountId = accountId;
    syncActiveConfig();
    saveConfig();
    syncState();
    console.log(`✅ تم اختيار الحساب: ${getActiveAccount().name}`);
});

global.botEmitter.on('deleteAccount', (accountId) => {
    if (config.accounts.length <= 1) {
        console.log('⚠️ لا يمكن حذف الحساب الأخير');
        return;
    }
    const deletedPrimary = config.accounts.find(account => account.id === accountId && account.isPrimary);
    config.accounts = config.accounts.filter(account => account.id !== accountId);
    if (deletedPrimary) {
        config.primaryAccountId = config.accounts[0].id;
    }
    config.activeAccountId = config.primaryAccountId || config.accounts[0].id;
    syncActiveConfig();
    saveConfig();
    syncState();
    console.log('✅ تم حذف الحساب');
});

client.on('ready', () => {
    console.log(`✅ تم تسجيل الدخول: ${client.user.tag}`);
    connectToVoice();
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

if (process.env.token) {
    client.login(process.env.token);
} else {
    console.log('⚠️ أضف متغير token لتشغيل البوت.');
}
