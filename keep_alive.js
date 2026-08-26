const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// المرجع الداخلي للإعدادات والحالة
let botState = {
    isRunning: true,
    isChatActive: true,
    isVoiceActive: true,
    isTaskRunning: true,
    isPlanBRunning: false,
    stats: {},
    config: {}
};

// دالة لتلقي البيانات وتحديثها من index.js
const updateBotState = (data) => {
    botState = { ...botState, ...data };
};

app.get('/', (req, res) => {
    const c = botState.config || {};
    const s = botState.stats || {};
    const t = botState.taskStates || {};
    const taskActive = taskName => botState.isRunning && botState.isChatActive && botState.isTaskRunning && t[taskName];
    const planBActive = botState.isPlanBRunning;
    const defaultTargetId = '998040612047691827';
    const targetIds = Array.from(new Set([
        ...(Array.isArray(c.task4TargetIds) ? c.task4TargetIds : []),
        c.task4TargetId || defaultTargetId
    ].filter(id => /^\d+$/.test(String(id || '').trim()))));
    const primaryTargetId = targetIds.includes(c.task4TargetId) ? c.task4TargetId : targetIds[0] || defaultTargetId;
    const targetRows = targetIds.map(id =>
        '<div class="target-chip ' + (id === primaryTargetId ? 'is-primary' : '') + '" data-target-id="' + id + '">' +
            '<span class="target-id">' + id + '</span>' +
            '<span class="primary-label">' + (id === primaryTargetId ? 'أساسي' : '') + '</span>' +
            '<button type="button" data-target-action="primary">' + (id === primaryTargetId ? 'الأساسي' : 'جعله أساسيًا') + '</button>' +
            '<button type="button" data-target-action="remove">حذف</button>' +
        '</div>'
    ).join('');
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🎮 لوحة التحكم النيون | Discord Selfbot</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Orbitron:wght@400;700;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideInFade {
                    from {
                        opacity: 0;
                        transform: translateY(25px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes goldPulse {
                    0%, 100% { box-shadow: 0 0 4px rgba(214, 170, 72, 0.2), inset 0 0 0 1px rgba(214, 170, 72, 0.3); }
                    50% { box-shadow: 0 0 18px rgba(214, 170, 72, 0.55), inset 0 0 0 1px rgba(214, 170, 72, 0.5); }
                }

                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }

                @keyframes borderGlow {
                    0%, 100% { border-color: rgba(214, 170, 72, 0.4); }
                    50% { border-color: rgba(214, 170, 72, 0.9); }
                }

                @keyframes goldShine {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                @keyframes floatGlow {
                    0%, 100% { transform: translateY(0); box-shadow: 0 0 8px rgba(214, 170, 72, 0.3); }
                    50% { transform: translateY(-2px); box-shadow: 0 0 18px rgba(214, 170, 72, 0.5); }
                }

                @keyframes pulseAnim {
                    0% { background-color: rgba(255, 255, 255, 0.03); }
                    50% { background-color: rgba(255, 255, 255, 0.12); }
                    100% { background-color: rgba(255, 255, 255, 0.03); }
                }

                .pulse-anim {
                    animation: pulseAnim 0.5s ease-out;
                }

                :root {
                    --bg-deep: #050608;
                    --bg-base: #0a0c10;
                    --bg-surface: #11141a;
                    --bg-card: #161a22;
                    --bg-card-hover: #1c2129;
                    --bg-elevated: #1f242d;
                    --line-soft: rgba(255, 255, 255, 0.04);
                    --line: rgba(255, 255, 255, 0.07);
                    --line-strong: rgba(255, 255, 255, 0.12);
                    --text-bright: #f8f9fb;
                    --text-main: #e8eaed;
                    --text-soft: #a8afb7;
                    --text-sub: #6b7280;
                    --gold: #d6aa48;
                    --gold-bright: #e8c46b;
                    --gold-dim: #8f702f;
                    --gold-glow: rgba(214, 170, 72, 0.35);
                    --gold-glow-strong: rgba(214, 170, 72, 0.6);
                    --success: #4ade80;
                    --success-dim: rgba(74, 222, 128, 0.15);
                    --danger: #f87171;
                    --danger-dim: rgba(248, 113, 113, 0.15);
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Tajawal', 'Cairo', sans-serif;
                }

                body {
                    --account-accent: var(--gold);
                    --account-accent-soft: var(--gold-glow);
                    background-color: var(--bg-deep);
                    background-image:
                        radial-gradient(ellipse 80% 50% at 20% 0%, rgba(214, 170, 72, 0.08), transparent 60%),
                        radial-gradient(ellipse 60% 50% at 90% 100%, rgba(214, 170, 72, 0.05), transparent 60%),
                        linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
                    background-size: 100% 100%, 100% 100%, 36px 36px, 36px 36px;
                    color: var(--text-main);
                    min-height: 100vh;
                    padding: 32px 18px 60px;
                    overflow-x: hidden;
                    position: relative;
                    letter-spacing: 0.2px;
                }

                body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--gold) 50%, transparent);
                    z-index: 100;
                }

                .container {
                    max-width: 1280px;
                    margin: 0 auto;
                    position: relative;
                    z-index: 2;
                }

                header {
                    text-align: right;
                    margin-bottom: 32px;
                    padding: 32px 36px;
                    border: 1px solid var(--line);
                    background:
                        linear-gradient(135deg, rgba(214, 170, 72, 0.04), transparent 50%),
                        rgba(17, 20, 26, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    box-shadow:
                        0 20px 60px rgba(0, 0, 0, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.03);
                    position: relative;
                    overflow: hidden;
                }

                header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 200px;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(214, 170, 72, 0.08));
                    pointer-events: none;
                }

                header::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--gold), var(--gold-bright), var(--gold), transparent);
                    background-size: 200% 100%;
                    animation: goldShine 6s linear infinite;
                }

                header h1 {
                    font-size: 2.4rem;
                    font-weight: 900;
                    font-family: 'Orbitron', monospace;
                    letter-spacing: 2px;
                    background: linear-gradient(135deg, var(--text-bright) 0%, var(--gold) 50%, var(--gold-bright) 100%);
                    background-size: 200% 200%;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    color: transparent;
                    margin-bottom: 8px;
                    text-shadow: 0 0 30px rgba(214, 170, 72, 0.3);
                }

                header p {
                    color: var(--text-soft);
                    font-size: 0.95rem;
                    font-weight: 400;
                    letter-spacing: 0.5px;
                }

                .status-line {
                    display: flex;
                    justify-content: flex-start;
                    gap: 12px;
                    margin-top: 22px;
                    flex-wrap: wrap;
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    padding: 9px 16px;
                    border: 1px solid var(--line);
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    font-weight: 600;
                    font-size: 0.88rem;
                    transition: all 0.5s ease;
                }

                .status-indicator:hover {
                    border-color: var(--gold-dim);
                    background: rgba(214, 170, 72, 0.05);
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    box-shadow: 0 0 8px currentColor;
                }

                .status-dot.active { background: var(--success); color: var(--success); }
                .status-dot.inactive { background: var(--danger); color: var(--danger); }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .dashboard-nav {
                    display: flex;
                    gap: 6px;
                    padding: 6px;
                    margin-bottom: 30px;
                    border: 1px solid var(--line);
                    background: linear-gradient(180deg, rgba(22, 26, 34, 0.95), rgba(13, 15, 20, 0.95));
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    overflow-x: auto;
                    box-shadow:
                        0 10px 30px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.04),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    position: relative;
                }

                .dashboard-nav::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: 10%;
                    right: 10%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--gold), transparent);
                    opacity: 0.6;
                }

                .dashboard-nav button {
                    flex: 1;
                    min-width: 160px;
                    padding: 14px 22px;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    background: transparent;
                    color: var(--text-sub);
                    cursor: pointer;
                    font: inherit;
                    font-weight: 700;
                    font-size: 0.92rem;
                    white-space: nowrap;
                    transition: all 0.55s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    letter-spacing: 0.3px;
                }

                .dashboard-nav button::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    background: radial-gradient(circle, rgba(214, 170, 72, 0.3), transparent 70%);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    transition: width 0.5s ease, height 0.5s ease;
                    pointer-events: none;
                }

                .dashboard-nav button:hover {
                    color: var(--text-bright);
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.08);
                }

                .dashboard-nav button:hover::before {
                    width: 200px;
                    height: 200px;
                }

                .dashboard-nav button.active {
                    color: var(--gold-bright);
                    background: linear-gradient(135deg, rgba(214, 170, 72, 0.18), rgba(214, 170, 72, 0.06));
                    border-color: var(--gold-dim);
                    box-shadow:
                        0 6px 20px rgba(214, 170, 72, 0.25),
                        inset 0 1px 0 rgba(214, 170, 72, 0.15),
                        inset 0 0 0 1px rgba(214, 170, 72, 0.1);
                }

                .dashboard-nav button.active::after {
                    content: '';
                    position: absolute;
                    bottom: 4px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 30%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--gold), var(--gold-bright), var(--gold), transparent);
                    background-size: 200% 100%;
                    border-radius: 2px;
                    animation: goldShine 2s linear infinite;
                    box-shadow: 0 0 8px var(--gold);
                }

                .dashboard-panel {
                    display: none;
                    animation: slideInFade 0.4s ease-out both;
                }

                .dashboard-panel.active {
                    display: grid;
                }

                .task-manager,
                .timing-manager {
                    min-height: 100%;
                }

                .task-list {
                    display: grid;
                    gap: 10px;
                }

                .task-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    padding: 15px 16px;
                    border: 1px solid var(--line);
                    border-right: 3px solid var(--line-strong);
                    background: rgba(255, 255, 255, 0.015);
                    border-radius: 6px;
                    transition: all 0.5s ease;
                }

                .task-row:hover {
                    background: rgba(214, 170, 72, 0.04);
                    border-color: var(--gold-dim);
                    border-right-color: var(--gold);
                    transform: translateX(-3px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                }

                .task-name {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                    color: var(--text-bright);
                    font-weight: 700;
                }

                .task-number {
                    display: grid;
                    place-items: center;
                    width: 32px;
                    height: 32px;
                    flex: 0 0 32px;
                    border: 1px solid var(--gold-dim);
                    background: linear-gradient(135deg, rgba(214, 170, 72, 0.2), rgba(214, 170, 72, 0.05));
                    color: var(--gold);
                    font-size: 0.8rem;
                    font-weight: 800;
                    border-radius: 6px;
                    box-shadow: 0 0 8px rgba(214, 170, 72, 0.15);
                }

                .task-state {
                    margin-right: auto;
                    color: var(--text-sub);
                    font-size: 0.8rem;
                    white-space: nowrap;
                    font-weight: 500;
                }

                .task-row .btn {
                    flex: 0 0 auto;
                    min-width: 110px;
                    padding: 9px 14px;
                    border-radius: 6px;
                }

                .timing-manager form {
                    gap: 12px;
                }

                .planb-card {
                    border: 1px solid var(--gold-dim);
                    background: linear-gradient(135deg, rgba(214, 170, 72, 0.05), rgba(17, 20, 26, 0.6));
                    animation: slideInFade 0.6s ease-out both, goldPulse 3s ease-in-out infinite;
                }

                .planb-card h3 {
                    color: var(--gold-bright);
                    border-bottom-color: rgba(214, 170, 72, 0.3);
                }

                .planb-card .task-row {
                    border-color: rgba(214, 170, 72, 0.3);
                    border-right-color: var(--gold);
                    background: rgba(214, 170, 72, 0.04);
                }

                .timing-group {
                    padding: 14px 16px;
                    border: 1px solid var(--line);
                    background: rgba(255, 255, 255, 0.015);
                    border-radius: 8px;
                    transition: all 0.5s ease;
                }

                .timing-group:hover {
                    border-color: var(--gold-dim);
                    background: rgba(214, 170, 72, 0.025);
                }

                .timing-group label {
                    display: block;
                    margin-bottom: 10px;
                    color: var(--text-bright);
                    font-size: 0.88rem;
                    font-weight: 600;
                }

                .timing-fields {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }

                .timing-fields input {
                    min-width: 0;
                }

                .target-list {
                    display: grid;
                    gap: 8px;
                    margin-top: 14px;
                    padding: 10px;
                    min-height: 60px;
                    border: 1px solid var(--line);
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                }

                .target-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 18px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--line);
                }

                .target-title h3 {
                    margin-bottom: 4px;
                    border-bottom: 0;
                    padding-bottom: 0;
                    color: var(--gold-bright);
                }

                .target-title p {
                    color: var(--text-sub);
                    font-size: 0.78rem;
                }

                .target-count {
                    padding: 7px 12px;
                    border: 1px solid var(--gold-dim);
                    background: rgba(214, 170, 72, 0.1);
                    color: var(--gold);
                    font-size: 0.78rem;
                    font-weight: 700;
                    white-space: nowrap;
                    border-radius: 4px;
                }

                .target-add {
                    display: flex;
                    align-items: stretch;
                    gap: 10px;
                }

                .target-add input {
                    flex: 1;
                }

                .target-add .btn {
                    flex: 0 0 auto;
                    min-width: 130px;
                }

                .target-mode {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-top: 14px;
                    padding: 14px;
                    border: 1px solid var(--line);
                    background: rgba(255, 255, 255, 0.015);
                    border-radius: 8px;
                }

                .target-mode select {
                    width: min(58%, 260px);
                }

                .target-save {
                    width: 100%;
                    margin-top: 16px;
                }

                .target-chip {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 11px 14px;
                    border: 1px solid var(--line);
                    border-right: 3px solid var(--line-strong);
                    background: var(--bg-card);
                    color: var(--text-bright);
                    font-size: 0.85rem;
                    border-radius: 6px;
                    transition: all 0.5s ease;
                }

                .target-chip:hover {
                    background: var(--bg-card-hover);
                    border-right-color: var(--text-soft);
                }

                .target-chip.is-primary {
                    border-color: var(--gold-dim);
                    border-right-color: var(--gold);
                    background: linear-gradient(90deg, rgba(214, 170, 72, 0.18), rgba(214, 170, 72, 0.04));
                    box-shadow: 0 0 12px rgba(214, 170, 72, 0.15);
                }

                .target-manager.random-mode .target-chip.is-primary {
                    border-color: var(--line-strong);
                    border-right-color: var(--line-strong);
                    background: var(--bg-card-hover);
                    box-shadow: none;
                }

                .target-manager.random-mode .primary-label {
                    color: var(--text-sub);
                }

                .target-chip .target-id {
                    margin-right: auto;
                    font-weight: 600;
                }

                .target-chip .primary-label {
                    color: var(--gold);
                    font-size: 0.75rem;
                    font-weight: 700;
                }

                .target-chip button {
                    border: 1px solid var(--line-strong);
                    background: rgba(0, 0, 0, 0.3);
                    color: var(--text-soft);
                    cursor: pointer;
                    padding: 6px 11px;
                    font: inherit;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 4px;
                    transition: all 0.4s ease;
                }

                .target-chip button:hover {
                    color: var(--text-bright);
                    border-color: var(--gold);
                    background: rgba(214, 170, 72, 0.1);
                }

                .monitor-channel-item {
                    padding: 12px 14px;
                    border: 1px solid var(--line);
                    border-right: 3px solid var(--line-strong);
                    background: var(--bg-card);
                    color: var(--text-bright);
                    font-size: 0.9rem;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.4s ease;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }

                .monitor-channel-item:hover {
                    background: var(--bg-card-hover);
                    border-right-color: var(--gold);
                    border-color: var(--gold-dim);
                    transform: translateX(-3px);
                }

                .monitor-channel-item .ch-name {
                    font-weight: 600;
                }

                .monitor-channel-item .ch-count {
                    padding: 4px 10px;
                    background: rgba(214, 170, 72, 0.15);
                    color: var(--gold);
                    border: 1px solid var(--gold-dim);
                    border-radius: 4px;
                    font-size: 0.78rem;
                    font-weight: 700;
                }

                .monitor-channel-item .ch-times {
                    font-size: 0.72rem;
                    color: var(--text-sub);
                    margin-top: 4px;
                }

                .monitor-messages-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-height: 600px;
                    overflow-y: auto;
                    padding: 4px;
                }

                .monitor-message {
                    padding: 12px 14px;
                    border: 1px solid var(--line);
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 6px;
                    transition: all 0.4s ease;
                }

                .monitor-message:hover {
                    border-color: var(--gold-dim);
                    background: rgba(214, 170, 72, 0.04);
                }

                .monitor-message .msg-time {
                    font-size: 0.72rem;
                    color: var(--text-sub);
                    font-family: 'Orbitron', monospace;
                    margin-bottom: 6px;
                }

                .monitor-message .msg-content {
                    color: var(--text-bright);
                    font-size: 0.9rem;
                    line-height: 1.5;
                    word-break: break-word;
                    white-space: pre-wrap;
                }


                .card {
                    background: linear-gradient(180deg, rgba(22, 26, 34, 0.95), rgba(17, 20, 26, 0.95));
                    border: 1px solid var(--line);
                    border-radius: 10px;
                    padding: 26px;
                    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.025);
                    animation: slideInFade 0.7s ease-out both;
                    position: relative;
                    transition: all 0.5s ease;
                    overflow: hidden;
                }

                .card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--account-accent), transparent);
                }

                .card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 80px;
                    height: 80px;
                    background: radial-gradient(circle, var(--account-accent-soft), transparent 70%);
                    pointer-events: none;
                }

                .card:nth-child(1) { animation-delay: 0.05s; }
                .card:nth-child(2) { animation-delay: 0.1s; }
                .card:nth-child(3) { animation-delay: 0.15s; }
                .card:nth-child(4) { animation-delay: 0.2s; }

                .card:hover {
                    border-color: var(--line-strong);
                    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
                    transform: translateY(-2px);
                }

                .card h3 {
                    font-size: 1.2rem;
                    margin-bottom: 22px;
                    border-bottom: 1px solid var(--line);
                    padding-bottom: 16px;
                    color: var(--text-bright);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    position: relative;
                    z-index: 1;
                }

                .status-badge {
                    display: inline-block;
                    padding: 5px 14px;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 0.78rem;
                    border: 1px solid;
                    transition: all 0.5s ease;
                    letter-spacing: 0.3px;
                }

                .status-on {
                    background: rgba(214, 170, 72, 0.1);
                    color: var(--gold-bright);
                    border-color: rgba(214, 170, 72, 0.4);
                    box-shadow: 0 0 10px rgba(214, 170, 72, 0.15);
                }

                .status-off {
                    background: rgba(255, 255, 255, 0.04);
                    color: var(--text-sub);
                    border-color: var(--line-strong);
                    box-shadow: none;
                }

                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 13px 12px;
                    border-bottom: 1px solid var(--line-soft);
                    font-size: 0.95rem;
                    transition: all 0.5s ease;
                    color: var(--text-soft);
                    border-radius: 6px;
                }

                .stat-item:hover {
                    background: rgba(214, 170, 72, 0.04);
                    padding-left: 16px;
                    color: var(--text-bright);
                }

                .stat-item span:last-child {
                    font-weight: 700;
                    color: var(--gold);
                    font-family: 'Orbitron', monospace;
                    letter-spacing: 0.5px;
                }

                .btn-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 22px;
                }

                .btn {
                    flex: 1;
                    min-width: 130px;
                    padding: 12px 20px;
                    border: 1px solid var(--line-strong);
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.5s ease;
                    text-decoration: none;
                    text-align: center;
                    color: var(--text-bright);
                    display: inline-block;
                    font-size: 0.88rem;
                    position: relative;
                    letter-spacing: 0.3px;
                    overflow: hidden;
                    font-family: inherit;
                    background: rgba(255, 255, 255, 0.03);
                }

                .btn::before {
                    display: none;
                }

                .btn:hover {
                    transform: none;
                    background: rgba(255, 255, 255, 0.06);
                    border-color: var(--line-strong);
                }

                .btn-primary {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: var(--line-strong);
                    color: var(--text-bright);
                }

                .btn-primary:hover {
                    box-shadow: none;
                    border-color: var(--line-strong);
                    background: rgba(255, 255, 255, 0.07);
                }

                .btn-success {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: var(--line-strong);
                    color: var(--text-bright);
                }

                .btn-success:hover {
                    box-shadow: none;
                    border-color: var(--line-strong);
                    background: rgba(255, 255, 255, 0.06);
                }

                .btn-danger {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: var(--line-strong);
                    color: var(--text-bright);
                }

                .btn-danger:hover {
                    box-shadow: none;
                    border-color: var(--line-strong);
                    background: rgba(255, 255, 255, 0.06);
                }

                .btn-warning {
                    background: linear-gradient(135deg, rgba(214, 170, 72, 0.18), rgba(214, 170, 72, 0.06));
                    border-color: var(--gold-dim);
                    color: var(--gold);
                }

                .btn-warning:hover {
                    box-shadow: 0 8px 24px rgba(214, 170, 72, 0.25);
                    border-color: var(--gold);
                }

                form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    z-index: 1;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                label {
                    font-size: 0.85rem;
                    color: var(--text-soft);
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }

                input[type="text"],
                input[type="number"],
                select {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid var(--line);
                    padding: 12px 16px;
                    border-radius: 8px;
                    color: var(--text-bright);
                    outline: none;
                    font-size: 0.92rem;
                    font-family: inherit;
                    transition: all 0.5s ease;
                }

                input:hover,
                select:hover {
                    border-color: var(--line-strong);
                    background: rgba(0, 0, 0, 0.4);
                }

                input:focus,
                select:focus {
                    border-color: var(--gold);
                    box-shadow: 0 0 0 3px rgba(214, 170, 72, 0.15);
                    background: rgba(0, 0, 0, 0.5);
                }

                input::placeholder {
                    color: var(--text-sub);
                }

                input[type="number"] {
                    direction: ltr;
                    text-align: left;
                    padding-right: 26px !important;
                }

                input[type="number"]::-webkit-outer-spin-button,
                input[type="number"]::-webkit-inner-spin-button {
                    -webkit-appearance: none !important;
                    appearance: none !important;
                    margin: 0;
                    display: none;
                }

                input[type="number"] {
                    -moz-appearance: textfield;
                }

                .num-wrap {
                    position: relative;
                    display: block;
                }

                .num-wrap .num-spin {
                    position: absolute;
                    right: 1px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 22px;
                    height: calc(100% - 8px);
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    pointer-events: none;
                }

                .num-wrap .num-spin button {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-soft);
                    cursor: pointer;
                    font: inherit;
                    line-height: 1;
                    padding: 0;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: auto;
                    opacity: 0.7;
                }

                .num-wrap .num-spin button:hover {
                    color: var(--gold);
                    opacity: 1;
                }

                .num-wrap .num-spin button svg {
                    width: 8px;
                    height: 8px;
                    fill: currentColor;
                }

                select {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8afb7' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: left 14px center;
                    background-size: 16px;
                    padding-left: 40px;
                }

                form button {
                    margin-top: 6px;
                }

                .accordion-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .accordion-item {
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--line);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.5s ease;
                }

                .accordion-item:hover {
                    border-color: var(--line-strong);
                    background: rgba(214, 170, 72, 0.04);
                }

                .accordion-header {
                    padding: 14px 18px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 700;
                    color: var(--text-bright);
                    transition: all 0.5s ease;
                    user-select: none;
                }

                .accordion-header:hover {
                    color: var(--gold);
                }

                .accordion-icon {
                    font-size: 1.2rem;
                    transition: transform 0.5s ease;
                    color: var(--gold);
                }

                .accordion-item.active .accordion-icon {
                    transform: rotate(180deg);
                }

                .accordion-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.5s ease;
                    padding: 0 18px;
                }

                .accordion-item.active .accordion-content {
                    max-height: 500px;
                    padding: 18px;
                }

                .accordion-content-inner {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .panel {
                    display: none;
                    animation: slideInFade 0.55s ease-out both;
                }

                .panel.active {
                    display: grid;
                }

                /* ====== SCROLLBAR (ثيم الموقع) ====== */
                ::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }

                ::-webkit-scrollbar-track {
                    background: var(--bg-deep);
                    border-radius: 5px;
                }

                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, var(--gold-dim), rgba(143, 112, 47, 0.6));
                    border-radius: 5px;
                    border: 2px solid var(--bg-deep);
                    transition: all 0.4s ease;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, var(--gold), var(--gold-bright));
                    box-shadow: 0 0 10px rgba(214, 170, 72, 0.4);
                }

                ::-webkit-scrollbar-thumb:active {
                    background: var(--gold-bright);
                }

                ::-webkit-scrollbar-corner {
                    background: var(--bg-deep);
                }

                * {
                    scrollbar-width: thin;
                    scrollbar-color: var(--gold-dim) var(--bg-deep);
                }

                @media (max-width: 768px) {
                    .page-title h2 { font-size: 1.3rem; }
                    .topbar { flex-direction: column; align-items: flex-start; padding: 18px 20px; }
                    .topbar-stats { width: 100%; justify-content: space-between; gap: 12px; }
                    .topbar-stat { padding: 0; border: none; }
                    .grid { grid-template-columns: 1fr; gap: 16px; }
                    .btn-group { flex-direction: column; }
                    .btn { min-width: 100%; }
                    .task-row { align-items: flex-start; flex-wrap: wrap; padding: 12px; }
                    .task-state { margin-right: 0; }
                    .task-row .btn { width: 100%; }
                    .target-title,
                    .target-add,
                    .target-mode { align-items: stretch; flex-direction: column; }
                    .target-add .btn,
                    .target-mode select { width: 100%; }
                    .card { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>◆ لوحة التحكم ◆</h1>
                    <p>نظام إدارة ديسكورد سيلفبوت المتقدم</p>
                </header>

                <nav class="dashboard-nav" aria-label="أقسام لوحة التحكم">
                    <button type="button" class="active" data-panel-target="overview">⚙️ النظرة العامة</button>
                    <button type="button" data-panel-target="tasks">⚡ إدارة المهام</button>
                    <button type="button" data-panel-target="channels">🎙️ القنوات والرسائل</button>
                    <button type="button" data-panel-target="monitor">🛰️ المراقبة</button>
                </nav>

                <div style="display:flex; flex-direction:column; gap:25px;">
                    <div class="grid panel active" data-panel="overview">
                    <div class="card">
                        <h3>⚙️ حالة النظام</h3>
                        <div class="stat-item">
                            <span>البوت الرئيسي</span>
                            <span class="status-badge ${botState.isRunning ? 'status-on' : 'status-off'}">${botState.isRunning ? 'نشط' : 'متوقف'}</span>
                        </div>
                        <div class="stat-item">
                            <span>قناة الصوت</span>
                            <span class="status-badge ${botState.isVoiceActive ? 'status-on' : 'status-off'}">${botState.isVoiceActive ? 'متصلة' : 'مفصولة'}</span>
                        </div>
                        <div class="stat-item">
                            <span>الخطة ب</span>
                            <span class="status-badge ${botState.isPlanBRunning ? 'status-on' : 'status-off'}">${botState.isPlanBRunning ? 'مشغلة' : 'متوقفة'}</span>
                        </div>
                        <div class="btn-group">
                            <button type="button" class="btn btn-primary" data-action="voice" onclick="toggleAction('voice', this)">${botState.isVoiceActive ? '🔇 إيقاف صوت' : '🔊 تشغيل صوت'}</button>
                        </div>
                    </div>

                    <!-- إحصائيات النشاط -->
                    <div class="card">
                        <h3>📊 إحصائيات النشاط</h3>
                        <div class="stat-item"><span>إجمالي المرسل</span> <span>${s.totalSent || 0}</span></div>
                        <div class="stat-item"><span>المهمة الأولى (ذكريات)</span> <span>${s.task1CountLog || 0}</span></div>
                        <div class="stat-item"><span>المهمة الثانية (بخشيش)</span> <span>${s.task2CountLog || 0}</span></div>
                        <div class="stat-item"><span>المهمة الثالثة (عمل/جريمة)</span> <span>${s.task3CountLog || 0}</span></div>
                        <div class="stat-item"><span>المهمة الرابعة (هجوم)</span> <span>${s.task4CountLog || 0}</span></div>
                        <div class="stat-item"><span>المهمة الخامسة (كازينو)</span> <span>${s.task5CountLog || 0}</span></div>
                        <div class="stat-item"><span>آخر نشاط</span> <span style="font-size:0.85rem">${s.lastActiveTime || 'لا يوجد'}</span></div>
                    </div>
                </div>

                <div class="grid panel" data-panel="tasks">
                    <div class="card task-manager">
                        <h3>⚡ إدارة المهام</h3>
                        <div class="task-list">
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">01</span>ذكريات</span>
                                <span class="task-state">${taskActive('task1') ? 'مفعلة' : 'متوقفة'}</span>
                                <button type="button" class="btn ${taskActive('task1') ? 'btn-danger' : 'btn-success'}" data-task="task1" onclick="toggleTask('task1', this)">${taskActive('task1') ? '⏹ إيقاف' : '▶ تشغيل'}</button>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">02</span>بخشيش</span>
                                <span class="task-state">${taskActive('task2') ? 'مفعلة' : 'متوقفة'}</span>
                                <button type="button" class="btn ${taskActive('task2') ? 'btn-danger' : 'btn-success'}" data-task="task2" onclick="toggleTask('task2', this)">${taskActive('task2') ? '⏹ إيقاف' : '▶ تشغيل'}</button>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">03</span>عمل / جريمة</span>
                                <span class="task-state">${taskActive('task3') ? 'مفعلة' : 'متوقفة'}</span>
                                <button type="button" class="btn ${taskActive('task3') ? 'btn-danger' : 'btn-success'}" data-task="task3" onclick="toggleTask('task3', this)">${taskActive('task3') ? '⏹ إيقاف' : '▶ تشغيل'}</button>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">04</span>هجوم</span>
                                <span class="task-state">${taskActive('task4') ? 'مفعلة' : 'متوقفة'}</span>
                                <button type="button" class="btn ${taskActive('task4') ? 'btn-danger' : 'btn-success'}" data-task="task4" onclick="toggleTask('task4', this)">${taskActive('task4') ? '⏹ إيقاف' : '▶ تشغيل'}</button>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">05</span>سوق الكازينو</span>
                                <span class="task-state">${taskActive('task5') ? 'مفعلة' : 'متوقفة'}</span>
                                <button type="button" class="btn ${taskActive('task5') ? 'btn-danger' : 'btn-success'}" data-task="task5" onclick="toggleTask('task5', this)">${taskActive('task5') ? '⏹ إيقاف' : '▶ تشغيل'}</button>
                            </div>
                        </div>
                    </div>

                    <div class="card timing-manager">
                        <h3>⏱️ توقيت المهام</h3>
                        <form action="/api/update-tasks-config" method="POST">
                            <div class="timing-group">
                                <label>المهمة 1 - ذكريات: الفاصل بين الرسائل (ثواني)</label>
                                <input type="number" name="task1MessageGap" value="${c.task1MessageGap || 5}" min="3" step="0.1" placeholder="مثال: 5">
                            </div>
                            <div class="timing-group">
                                <label>المهمة 1 - ذكريات: التكرار (دقائق)</label>
                                <div class="timing-fields">
                                    <input type="number" name="task1RepeatMin" value="${c.task1RepeatMin || 30}" min="0.1" step="0.1" placeholder="من">
                                    <input type="number" name="task1RepeatMax" value="${c.task1RepeatMax || 35}" min="0.1" step="0.1" placeholder="إلى">
                                </div>
                            </div>
                            <div class="timing-group">
                                <label>المهمة 2 - بخشيش: التكرار (دقائق)</label>
                                <div class="timing-fields">
                                    <input type="number" name="task2RepeatMin" value="${c.task2RepeatMin || 30}" min="0.1" step="0.1" placeholder="من">
                                    <input type="number" name="task2RepeatMax" value="${c.task2RepeatMax || 32}" min="0.1" step="0.1" placeholder="إلى">
                                </div>
                            </div>
                            <div class="timing-group">
                                <label>المهمة 3 - عمل/جريمة: التكرار (دقائق)</label>
                                <div class="timing-fields">
                                    <input type="number" name="task3RepeatMin" value="${c.task3RepeatMin || 50}" min="0.1" step="0.1" placeholder="من">
                                    <input type="number" name="task3RepeatMax" value="${c.task3RepeatMax || 52}" min="0.1" step="0.1" placeholder="إلى">
                                </div>
                            </div>
                            <div class="timing-group">
                                <label>المهمة 4 - هجوم: التكرار (دقائق)</label>
                                <div class="timing-fields">
                                    <input type="number" name="task4RepeatMin" value="${c.task4RepeatMin || 30}" min="0.1" step="0.1" placeholder="من">
                                    <input type="number" name="task4RepeatMax" value="${c.task4RepeatMax || 32}" min="0.1" step="0.1" placeholder="إلى">
                                </div>
                            </div>
                            <div class="timing-group">
                                <label>المهمة 5 - كازينو: الفاصل بين الألعاب (ثواني)</label>
                                <div class="timing-fields">
                                    <input type="number" name="task5GapMin" value="${c.task5GapMin || 10}" min="0.1" step="0.1" placeholder="من">
                                    <input type="number" name="task5GapMax" value="${c.task5GapMax || 12}" min="0.1" step="0.1" placeholder="إلى">
                                </div>
                            </div>
                            <div class="timing-group">
                                <label>المهمة 5 - كازينو: قيمة الرهان (من - إلى)</label>
                                <div class="timing-fields">
                                    <input type="number" name="task5BetMin" value="${c.task5BetMin || 5000}" min="1" step="1" placeholder="من">
                                    <input type="number" name="task5BetMax" value="${c.task5BetMax || 10000}" min="1" step="1" placeholder="إلى">
                                </div>
                            </div>
                            <div class="timing-group">
                                <label>خطة ب - جمع النقاط: التكرار (ثواني)</label>
                                <input type="number" name="planBRepeat" value="${c.planBRepeat || 2.5}" min="0.1" step="0.1" placeholder="مثال: 2.5">
                            </div>
                            <button type="submit" class="btn btn-primary">💾 حفظ التوقيت</button>
                        </form>
                    </div>

                    <div class="card planb-card">
                        <h3>✦ خطة ب - جمع النقاط</h3>
                        <div class="task-row">
                            <span class="task-name"><span class="task-number">ب</span>إرسال الرسائل السريعة</span>
                            <span class="task-state">${planBActive ? 'مفعلة' : 'متوقفة'}</span>
                            <button type="button" class="btn ${planBActive ? 'btn-danger' : 'btn-success'}" data-planb="1" onclick="togglePlanB(this)">${planBActive ? '⏹ إيقاف' : '▶ تشغيل'}</button>
                        </div>
                    </div>

                    <div class="card target-manager ${c.task4TargetMode === 'random' ? 'random-mode' : ''}">
                        <div class="target-title">
                            <div>
                                <h3>🎯 أهداف الهجوم - المهمة 4</h3>
                                <p>أضف الأعضاء وحدد عضوًا أساسيًا واحدًا</p>
                            </div>
                            <span class="target-count">${targetIds.length} أهداف</span>
                        </div>
                        <form id="targetsForm" action="/api/update-tasks-config" method="POST">
                            <input type="hidden" name="task4TargetIds" id="task4TargetIds">
                            <input type="hidden" name="task4TargetId" id="task4TargetId" value="${primaryTargetId}">
                            <div class="target-add">
                                <input type="text" id="newTargetId" placeholder="أدخل ID عضو جديد">
                                <button type="button" class="btn btn-primary" onclick="addTarget()">➕ إضافة عضو</button>
                            </div>
                            <div class="target-list" id="targetList">${targetRows}</div>
                            <div class="target-mode">
                                <label for="task4TargetMode">طريقة الهجوم</label>
                                <select id="task4TargetMode" name="task4TargetMode">
                                    <option value="fixed" ${c.task4TargetMode !== 'random' ? 'selected' : ''}>الهدف الأساسي كل دورة</option>
                                    <option value="random" ${c.task4TargetMode === 'random' ? 'selected' : ''}>هدف عشوائي من القائمة</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary target-save">💾 حفظ أهداف الهجوم</button>
                        </form>
                    </div>

                </div>

                <div class="grid panel" data-panel="channels">
                    <!-- إدارة القنوات الصوتية -->
                    <div class="card">
                        <h3>🎙️ إدارة القنوات الصوتية</h3>
                        <form action="/api/update-tasks-config" method="POST">
                            <div class="form-group">
                                <label>🔴 قناة ال AFK (الانتظار)</label>
                                <input type="text" name="afkChannelId" value="${c.afkChannelId || ''}" placeholder="أدخل رقم القناة">
                            </div>
                            <button type="submit" class="btn btn-primary" style="margin-top: 15px;">💾 حفظ</button>
                        </form>
                    </div>

                    <!-- حذف الرسائل -->
                    <div class="card">
                        <h3>🗑️ حذف الرسائل</h3>
                        <div class="form-group">
                            <label>🔧 ID الروم</label>
                            <input type="text" id="deleteChannelId" placeholder="أدخل ID الروم" required>
                        </div>
                        <div class="form-group">
                            <label>📨 عدد الرسائل</label>
                            <input type="number" id="deleteMessageCount" placeholder="مثال: 50" min="1" max="100" value="50">
                        </div>
                        <button type="button" class="btn btn-danger" onclick="deleteMessages()" style="width: 100%;">🗑️ حذف الرسائل</button>
                    </div>
                </div>

                <div class="grid panel" data-panel="monitor">
                    <div class="card">
                        <h3>🛰️ مراقبة نشاط المستخدم</h3>
                        <div class="form-group">
                            <label>👤 ID الشخص (المستخدم)</label>
                            <input type="text" id="monitorUserId" placeholder="أدخل ID الشخص">
                        </div>
                        <div class="form-group">
                            <label>⏰ الفترة الزمنية</label>
                            <select id="monitorHours">
                                <option value="1">آخر ساعة</option>
                                <option value="6">آخر 6 ساعات</option>
                                <option value="24" selected>آخر 24 ساعة</option>
                                <option value="72">آخر 3 أيام</option>
                                <option value="168">آخر أسبوع</option>
                                <option value="720">آخر شهر</option>
                            </select>
                        </div>
                        <div class="btn-group">
                            <button type="button" class="btn btn-primary" id="monitorStartBtn" onclick="startMonitor()">🔍 بدء المراقبة</button>
                            <button type="button" class="btn btn-success" id="monitorStopBtn" onclick="stopMonitor()" style="display:none;">⏹ إيقاف</button>
                        </div>
                        <div id="monitorProgress" style="margin-top:16px; display:none;">
                            <div class="stat-item">
                                <span>الحالة</span>
                                <span id="monitorStatus">جاري الفحص...</span>
                            </div>
                            <div class="stat-item">
                                <span>القنوات المفحوصة</span>
                                <span id="monitorProgressText">0 / 0</span>
                            </div>
                            <div class="stat-item">
                                <span>القناة الحالية</span>
                                <span id="monitorCurrentChannel" style="font-size:0.85rem;">—</span>
                            </div>
                        </div>
                    </div>

                    <div class="card" id="monitorStatsCard" style="display:none;">
                        <h3>📊 ملخص المراقبة</h3>
                        <div class="stat-item"><span>إجمالي الرسائل</span> <span id="monitorTotalMessages">0</span></div>
                        <div class="stat-item"><span>القنوات النشطة</span> <span id="monitorActiveChannels">0</span></div>
                        <div class="stat-item"><span>القنوات المفحوصة</span> <span id="monitorChannelsScanned">0</span></div>
                        <div class="stat-item"><span>من</span> <span id="monitorFirstTime" style="font-size:0.85rem">—</span></div>
                        <div class="stat-item"><span>إلى</span> <span id="monitorLastTime" style="font-size:0.85rem">—</span></div>
                        <div class="stat-item"><span>المدة</span> <span id="monitorDuration" style="font-size:0.85rem">—</span></div>
                    </div>

                    <div class="card" id="monitorChannelsCard" style="display:none;">
                        <h3>📡 القنوات النشطة <span id="monitorChannelsCount" class="target-count">0</span></h3>
                        <p style="color:var(--text-sub); font-size:0.85rem; margin-bottom:14px;">اضغط على أي قناة لعرض الرسائل</p>
                        <div class="target-list" id="monitorChannelsList"></div>
                    </div>

                    <div class="card" id="monitorMessagesCard" style="display:none;">
                        <h3>💬 الرسائل <button type="button" class="btn btn-primary" style="float:left; padding:6px 12px; min-width:auto; font-size:0.8rem;" onclick="closeMessages()">✕ إغلاق</button></h3>
                        <p style="color:var(--text-sub); font-size:0.85rem; margin-bottom:14px;">القناة: <span id="monitorMessagesChannel" style="color:var(--gold);"></span></p>
                        <div class="monitor-messages-list" id="monitorMessagesList"></div>
                    </div>
                </div>
            </div>

            <script>
                function pulseButton(btn) {
                    btn.classList.remove('pulse-anim');
                    void btn.offsetWidth;
                    btn.classList.add('pulse-anim');
                }

                function toggleTask(taskName, btn) {
                    pulseButton(btn);
                    fetch('/api/toggle-task/' + taskName, { method: 'GET' });
                }

                function togglePlanB(btn) {
                    pulseButton(btn);
                    fetch('/api/toggle-planb', { method: 'GET' });
                }

                function toggleAction(action, btn) {
                    pulseButton(btn);
                    fetch('/api/toggle/' + action, { method: 'GET' });
                }

                function isTaskActive(state, name) {
                    return state.isRunning && state.isChatActive && state.isTaskRunning && state.taskStates && state.taskStates[name];
                }

                function applyBtnState(btn, isActive, onText, offText) {
                    btn.textContent = isActive ? onText : offText;
                    btn.classList.toggle('btn-danger', isActive);
                    btn.classList.toggle('btn-success', !isActive);
                }

                function refreshState() {
                    fetch('/api/state').then(r => r.json()).then(data => {
                        if (!data.success) return;
                        const s = data.state;
                        document.querySelectorAll('[data-task]').forEach(btn => {
                            applyBtnState(btn, isTaskActive(s, btn.dataset.task), '⏹ إيقاف', '▶ تشغيل');
                        });
                        const planbBtn = document.querySelector('[data-planb]');
                        if (planbBtn) {
                            applyBtnState(planbBtn, !!s.isPlanBRunning, '⏹ إيقاف', '▶ تشغيل');
                        }
                        const voiceBtn = document.querySelector('[data-action="voice"]');
                        if (voiceBtn) {
                            voiceBtn.textContent = s.isVoiceActive ? '🔇 إيقاف صوت' : '🔊 تشغيل صوت';
                        }
                    }).catch(() => {});
                }

                setInterval(refreshState, 300);
                refreshState();
                document.querySelectorAll('[data-panel-target]').forEach(button => {
                    button.addEventListener('click', function(event) {
                        event.preventDefault();
                        const target = this.getAttribute('data-panel-target');
                        document.querySelectorAll('[data-panel-target]').forEach(item => item.classList.remove('active'));
                        document.querySelectorAll('.panel').forEach(panel => {
                            panel.classList.toggle('active', panel.getAttribute('data-panel') === target);
                        });
                        this.classList.add('active');
                    });
                });

                document.querySelectorAll('.accordion-header').forEach(header => {
                    header.addEventListener('click', function() {
                        const item = this.parentElement;
                        item.classList.toggle('active');
                    });
                });

                function deleteMessages() {
                    const channelId = document.getElementById('deleteChannelId').value.trim();
                    const count = document.getElementById('deleteMessageCount').value.trim();
                    if (!channelId) {
                        alert('❌ أدخل ID الروم أولاً');
                        return;
                    }
                    fetch('/api/delete-messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channelId, count: Number(count || 50) })
                    }).then(async (res) => {
                        const data = await res.json();
                        alert(data.message || '✅ تم الحذف');
                        if (data.success) location.reload();
                    });
                }

                function syncTargetIds() {
                    const ids = Array.from(document.querySelectorAll('.target-chip')).map(chip => chip.dataset.targetId);
                    document.getElementById('task4TargetIds').value = ids.join(',');
                }

                function updateTargetModeStyle() {
                    const manager = document.querySelector('.target-manager');
                    const randomMode = document.getElementById('task4TargetMode').value === 'random';
                    manager.classList.toggle('random-mode', randomMode);
                }

                function setPrimaryTarget(chip) {
                    document.querySelectorAll('.target-chip').forEach(item => {
                        item.classList.remove('is-primary');
                        item.querySelector('.primary-label').textContent = '';
                        item.querySelector('[data-target-action="primary"]').textContent = 'جعله أساسيًا';
                    });
                    chip.classList.add('is-primary');
                    chip.querySelector('.primary-label').textContent = 'أساسي';
                    chip.querySelector('[data-target-action="primary"]').textContent = 'الأساسي';
                    document.getElementById('task4TargetId').value = chip.dataset.targetId;
                    syncTargetIds();
                }

                function bindTargetActions(chip) {
                    chip.querySelector('[data-target-action="primary"]').addEventListener('click', () => setPrimaryTarget(chip));
                    chip.querySelector('[data-target-action="remove"]').addEventListener('click', () => {
                        const wasPrimary = chip.classList.contains('is-primary');
                        chip.remove();
                        const firstTarget = document.querySelector('.target-chip');
                        if (wasPrimary && firstTarget) setPrimaryTarget(firstTarget);
                        else syncTargetIds();
                    });
                }

                function addTarget() {
                    const input = document.getElementById('newTargetId');
                    const id = input.value.trim().replace(/^<@!?/, '').replace(/>$/, '');
                    if (!id) {
                        alert('❌ أدخل ID عضو صحيح');
                        return;
                    }
                    if (document.querySelector('[data-target-id="' + id + '"]')) {
                        alert('⚠️ هذا العضو موجود بالقائمة');
                        return;
                    }
                    const chip = document.createElement('div');
                    chip.className = 'target-chip';
                    chip.dataset.targetId = id;
                    chip.innerHTML = '<span class="target-id">' + id + '</span><span class="primary-label"></span><button type="button" data-target-action="primary">جعله أساسيًا</button><button type="button" data-target-action="remove">حذف</button>';
                    bindTargetActions(chip);
                    document.getElementById('targetList').appendChild(chip);
                    input.value = '';
                    syncTargetIds();
                }

                document.querySelectorAll('.target-chip').forEach(bindTargetActions);
                document.getElementById('task4TargetMode')?.addEventListener('change', updateTargetModeStyle);
                document.getElementById('targetsForm')?.addEventListener('submit', syncTargetIds);

                let monitorPollInterval = null;
                let monitorResultCache = null;

                function startMonitor() {
                    const userId = document.getElementById('monitorUserId').value.trim();
                    const hours = document.getElementById('monitorHours').value;
                    if (!userId) {
                        alert('❌ أدخل ID الشخص');
                        return;
                    }
                    document.getElementById('monitorStatsCard').style.display = 'none';
                    document.getElementById('monitorChannelsCard').style.display = 'none';
                    document.getElementById('monitorMessagesCard').style.display = 'none';
                    document.getElementById('monitorProgress').style.display = 'block';
                    document.getElementById('monitorStartBtn').style.display = 'none';
                    document.getElementById('monitorStopBtn').style.display = 'inline-block';
                    document.getElementById('monitorStatus').textContent = 'جاري البدء...';
                    document.getElementById('monitorProgressText').textContent = '0 / 0';
                    document.getElementById('monitorCurrentChannel').textContent = '—';

                    fetch('/api/monitor/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, hoursBack: Number(hours) })
                    }).then(r => r.json()).then(data => {
                        if (!data.success) {
                            alert(data.message);
                            resetMonitorUI();
                        } else {
                            pollMonitorStatus();
                        }
                    });
                }

                function stopMonitor() {
                    fetch('/api/monitor/stop', { method: 'POST' });
                    document.getElementById('monitorStatus').textContent = 'جاري الإيقاف...';
                }

                function pollMonitorStatus() {
                    if (monitorPollInterval) clearInterval(monitorPollInterval);
                    monitorPollInterval = setInterval(() => {
                        fetch('/api/monitor/result').then(r => r.json()).then(data => {
                            if (!data.success) return;
                            const active = data.active;
                            const progress = data.progress || {};
                            const result = data.result;

                            if (active && progress.total > 0) {
                                document.getElementById('monitorStatus').textContent = 'جاري الفحص...';
                                document.getElementById('monitorProgressText').textContent = progress.current + ' / ' + progress.total;
                                document.getElementById('monitorCurrentChannel').textContent = progress.currentChannel || '—';
                            }

                            if (!active) {
                                clearInterval(monitorPollInterval);
                                monitorPollInterval = null;
                                if (result) {
                                    monitorResultCache = result;
                                    renderMonitorResult(result);
                                } else {
                                    document.getElementById('monitorProgress').style.display = 'none';
                                    document.getElementById('monitorStatsCard').style.display = 'block';
                                    document.getElementById('monitorChannelsCard').style.display = 'block';
                                    document.getElementById('monitorTotalMessages').textContent = '0';
                                    document.getElementById('monitorActiveChannels').textContent = '0';
                                    document.getElementById('monitorChannelsScanned').textContent = progress.total || 0;
                                    document.getElementById('monitorFirstTime').textContent = '—';
                                    document.getElementById('monitorLastTime').textContent = '—';
                                    document.getElementById('monitorDuration').textContent = '—';
                                    document.getElementById('monitorChannelsList').innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-sub);">لم يتم العثور على رسائل</div>';
                                }
                                resetMonitorUI();
                            }
                        }).catch(() => {});
                    }, 500);
                }

                function resetMonitorUI() {
                    document.getElementById('monitorStartBtn').style.display = 'inline-block';
                    document.getElementById('monitorStopBtn').style.display = 'none';
                }

                function formatTime(iso) {
                    if (!iso) return '—';
                    try {
                        const d = new Date(iso);
                        return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
                    } catch { return iso; }
                }

                function formatDuration(ms) {
                    if (!ms) return '—';
                    const s = Math.floor(ms / 1000);
                    if (s < 60) return s + ' ثانية';
                    const m = Math.floor(s / 60);
                    const rs = s % 60;
                    if (m < 60) return m + ' د ' + rs + ' ث';
                    const h = Math.floor(m / 60);
                    const rm = m % 60;
                    return h + ' س ' + rm + ' د';
                }

                function renderMonitorResult(r) {
                    if (!r) return;
                    document.getElementById('monitorProgress').style.display = 'none';
                    document.getElementById('monitorStatsCard').style.display = 'block';
                    document.getElementById('monitorChannelsCard').style.display = 'block';

                    document.getElementById('monitorTotalMessages').textContent = r.totalMessages || 0;
                    document.getElementById('monitorActiveChannels').textContent = r.channelsWithActivity || 0;
                    document.getElementById('monitorChannelsScanned').textContent = r.channelsScanned || 0;
                    document.getElementById('monitorFirstTime').textContent = formatTime(r.firstMessage);
                    document.getElementById('monitorLastTime').textContent = formatTime(r.lastMessage);
                    document.getElementById('monitorDuration').textContent = formatDuration(r.durationMs);

                    const list = document.getElementById('monitorChannelsList');
                    list.innerHTML = '';
                    document.getElementById('monitorChannelsCount').textContent = (r.channels || []).length;
                    (r.channels || []).sort((a, b) => b.count - a.count).forEach(ch => {
                        const item = document.createElement('div');
                        item.className = 'monitor-channel-item';
                        item.innerHTML = '<div><div class="ch-name">#' + escapeHtml(ch.channelName) + '</div><div class="ch-times">من ' + formatTime(ch.firstAt) + ' إلى ' + formatTime(ch.lastAt) + '</div></div><div class="ch-count">' + ch.count + ' رسالة</div>';
                        item.addEventListener('click', () => showChannelMessages(ch));
                        list.appendChild(item);
                    });

                    if ((r.channels || []).length === 0) {
                        list.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-sub);">لم يتم العثور على رسائل</div>';
                    }
                }

                function showChannelMessages(ch) {
                    const card = document.getElementById('monitorMessagesCard');
                    card.style.display = 'block';
                    document.getElementById('monitorMessagesChannel').textContent = '#' + ch.channelName;
                    const list = document.getElementById('monitorMessagesList');
                    list.innerHTML = '';
                    (ch.messages || []).forEach(msg => {
                        const m = document.createElement('div');
                        m.className = 'monitor-message';
                        m.innerHTML = '<div class="msg-time">' + formatTime(msg.time) + '</div><div class="msg-content">' + escapeHtml(msg.content || '(بدون محتوى)') + '</div>';
                        list.appendChild(m);
                    });
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                function closeMessages() {
                    document.getElementById('monitorMessagesCard').style.display = 'none';
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                (function setupNumWraps() {
                    const upSvg = '<svg viewBox="0 0 24 24"><path d="M12 6l-7 8h14z"/></svg>';
                    const downSvg = '<svg viewBox="0 0 24 24"><path d="M12 18l-7-8h14z"/></svg>';

                    document.querySelectorAll('input[type="number"]').forEach(input => {
                        if (input.closest('.num-wrap')) return;
                        const wrap = document.createElement('div');
                        wrap.className = 'num-wrap';
                        input.parentNode.insertBefore(wrap, input);
                        wrap.appendChild(input);

                        const spin = document.createElement('div');
                        spin.className = 'num-spin';

                        const step = input.getAttribute('step') ? parseFloat(input.getAttribute('step')) : 1;
                        const min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : -Infinity;
                        const max = input.hasAttribute('max') ? parseFloat(input.getAttribute('max')) : Infinity;
                        const stepStr = input.getAttribute('step') || '1';
                        const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;

                        let timer = null;
                        let initialDelay = null;
                        let repeatInterval = null;

                        const roundToStep = (n) => {
                            if (decimals === 0) return Math.round(n).toString();
                            return n.toFixed(decimals);
                        };

                        const bump = (dir) => {
                            const cur = parseFloat(input.value) || 0;
                            const next = dir === 'up' ? cur + step : cur - step;
                            if (next < min || next > max) return;
                            input.value = roundToStep(next);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        };

                        const startHold = (dir) => {
                            bump(dir);
                            initialDelay = setTimeout(() => {
                                repeatInterval = setInterval(() => bump(dir), 60);
                            }, 400);
                        };

                        const stopHold = () => {
                            if (initialDelay) { clearTimeout(initialDelay); initialDelay = null; }
                            if (repeatInterval) { clearInterval(repeatInterval); repeatInterval = null; }
                        };

                        const makeBtn = (cls, dir, svg) => {
                            const b = document.createElement('button');
                            b.type = 'button';
                            b.className = cls;
                            b.innerHTML = svg;
                            b.addEventListener('mousedown', e => { e.preventDefault(); startHold(dir); });
                            b.addEventListener('touchstart', e => { e.preventDefault(); startHold(dir); }, { passive: false });
                            b.addEventListener('mouseup', stopHold);
                            b.addEventListener('mouseleave', stopHold);
                            b.addEventListener('touchend', stopHold);
                            b.addEventListener('touchcancel', stopHold);
                            b.addEventListener('click', e => { e.preventDefault(); });
                            return b;
                        };

                        const up = makeBtn('up', 'up', upSvg);
                        const down = makeBtn('down', 'down', downSvg);
                        spin.appendChild(up);
                        spin.appendChild(down);
                        wrap.appendChild(spin);
                    });
                })();

            </script>
        </html>
    `);
});

// APIs التحكم
app.get('/api/toggle/:action', (req, res) => {
    const action = req.params.action;
    if (global.botEmitter) {
        global.botEmitter.emit('control', action);
    }
    res.json({ success: true });
});

app.get('/api/toggle-task/:task', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('toggleTask', req.params.task);
    }
    res.json({ success: true });
});

app.get('/api/toggle-planb', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('togglePlanB');
    }
    res.json({ success: true });
});

app.get('/api/state', (req, res) => {
    res.json({
        success: true,
        state: botState
    });
});

app.post('/api/monitor/start', express.json(), async (req, res) => {
    if (!global.sharedMonitorState) {
        global.sharedMonitorState = { active: false, userId: '', hoursBack: 24, startedAt: null, finishedAt: null, progress: { current: 0, total: 0, currentChannel: '' }, result: null, liveMessages: [] };
    }
    if (global.sharedMonitorState.active) {
        return res.json({ success: false, message: '⚠️ المراقبة تعمل بالفعل' });
    }
    const { userId, hoursBack } = req.body || {};
    if (!userId) {
        return res.json({ success: false, message: '⚠️ يجب إدخال ID الشخص' });
    }
    global.sharedMonitorState.active = true;
    global.sharedMonitorState.userId = String(userId).trim().replace(/^<@!?/, '').replace(/>$/, '');
    global.sharedMonitorState.hoursBack = Math.max(1, Math.min(720, Number(hoursBack) || 24));
    global.sharedMonitorState.startedAt = Date.now();
    global.sharedMonitorState.finishedAt = null;
    global.sharedMonitorState.progress = { current: 0, total: 0, currentChannel: '' };
    global.sharedMonitorState.result = null;
    global.sharedMonitorState.liveMessages = [];
    if (global.botEmitter) {
        global.botEmitter.emit('monitorStart', { userId: global.sharedMonitorState.userId, hoursBack: global.sharedMonitorState.hoursBack });
    }
    res.json({ success: true, message: '✅ بدأت المراقبة' });
});

app.post('/api/monitor/stop', (req, res) => {
    if (global.sharedMonitorState) {
        global.sharedMonitorState.active = false;
    }
    if (global.botEmitter) {
        global.botEmitter.emit('monitorStop');
    }
    res.json({ success: true });
});

app.get('/api/monitor/result', (req, res) => {
    const s = global.sharedMonitorState || { active: false, progress: {}, result: null, liveMessages: [] };
    res.json({
        success: true,
        active: s.active,
        progress: s.progress || {},
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        hoursBack: s.hoursBack,
        userId: s.userId,
        result: s.result,
        liveMessages: s.liveMessages || []
    });
});

app.post('/api/update-tasks-config', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('updateTasksConfig', req.body);
    }
    res.redirect('/');
});

app.post('/api/delete-messages', async (req, res) => {
    if (!global.botEmitter) {
        return res.json({ success: false, message: '⚠️ البوت غير متاح' });
    }

    const payload = req.body || {};
    const result = await new Promise((resolve) => {
        const onDone = (data) => {
            global.botEmitter.removeListener('deleteMessagesResult', onDone);
            resolve(data);
        };
        global.botEmitter.on('deleteMessagesResult', onDone);
        global.botEmitter.emit('deleteMessages', payload);
    });

    res.json(result || { success: false, message: '⚠️ لم يتم حذف الرسائل' });
});

app.listen(port, () => {
    console.log(`🌐 لوحة التحكم الفخمة تعمل على المنفذ: ${port}`);
});

module.exports = { updateBotState };
