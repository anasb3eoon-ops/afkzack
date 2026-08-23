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
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideInFade {
                    from { 
                        opacity: 0; 
                        transform: translateY(15px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0);
                    }
                }

                @keyframes goldPulse {
                    0%, 100% { box-shadow: 0 0 4px rgba(214, 170, 72, 0.2); }
                    50% { box-shadow: 0 0 12px rgba(214, 170, 72, 0.55); }
                }

                :root {
                    --black: #08090a;
                    --surface: #111315;
                    --surface-raised: #181b1e;
                    --line: #2b3035;
                    --line-strong: #454b52;
                    --gray: #a8afb7;
                    --gray-light: #e5e7eb;
                    --text-main: #f1f3f5;
                    --text-sub: #858d96;
                }

                * { 
                    margin: 0; 
                    padding: 0; 
                    box-sizing: border-box;
                    font-family: 'Cairo', sans-serif;
                }

                body {
                    --account-accent: #a8afb7;
                    --account-accent-soft: rgba(168, 175, 183, 0.14);
                    background-color: var(--black);
                    background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
                    background-size: 32px 32px;
                    color: var(--text-main);
                    min-height: 100vh;
                    padding: 28px 15px 50px;
                    overflow-x: hidden;
                    position: relative;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    position: relative;
                    z-index: 2;
                }

                header {
                    text-align: right;
                    margin-bottom: 30px;
                    padding: 24px 28px;
                    border: 1px solid var(--line);
                    border-top: 3px solid var(--gray);
                    background: rgba(17, 19, 21, 0.94);
                    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
                }

                header h1 {
                    font-size: 2.25rem;
                    font-weight: 900;
                    font-family: 'Orbitron', monospace;
                    letter-spacing: 1px;
                    color: var(--gray-light);
                    margin-bottom: 8px;
                }

                header p {
                    color: var(--text-sub);
                    font-size: 0.95rem;
                    letter-spacing: 0;
                }

                .status-line {
                    display: flex;
                    justify-content: flex-start;
                    gap: 15px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 14px;
                    border: 1px solid var(--line);
                    border-radius: 4px;
                    background: var(--surface-raised);
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: all 0.4s ease;
                }

                .status-indicator:hover {
                    border-color: var(--line-strong);
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .status-dot.active { background: #7a9b5a; }
                .status-dot.inactive { background: #8b5a5a; }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 18px;
                    margin-bottom: 30px;
                }

                .dashboard-nav {
                    display: flex;
                    gap: 8px;
                    padding: 8px;
                    margin-bottom: 24px;
                    border: 1px solid var(--line);
                    background: rgba(17, 19, 21, 0.94);
                    overflow-x: auto;
                }

                .dashboard-nav button {
                    flex: 1;
                    min-width: 150px;
                    padding: 12px 16px;
                    border: 1px solid transparent;
                    border-radius: 3px;
                    background: transparent;
                    color: var(--text-sub);
                    cursor: pointer;
                    font: inherit;
                    font-weight: 700;
                    white-space: nowrap;
                    transition: 0.2s ease;
                }

                .dashboard-nav button:hover,
                .dashboard-nav button.active {
                    color: var(--text-main);
                    background: var(--surface-raised);
                    border-color: var(--line-strong);
                }

                .dashboard-panel {
                    display: none;
                    animation: slideInFade 0.25s ease-out both;
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
                    padding: 14px;
                    border: 1px solid var(--line);
                    border-right: 3px solid var(--line-strong);
                    background: #0d0f11;
                    transition: 0.2s ease;
                }

                .task-row:hover {
                    background: var(--surface-raised);
                    border-right-color: var(--gray);
                    transform: translateX(-2px);
                }

                .task-name {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                    color: var(--gray-light);
                    font-weight: 700;
                }

                .task-number {
                    display: grid;
                    place-items: center;
                    width: 30px;
                    height: 30px;
                    flex: 0 0 30px;
                    border: 1px solid var(--line-strong);
                    color: var(--gray);
                    font-size: 0.8rem;
                }

                .task-state {
                    margin-right: auto;
                    color: var(--text-sub);
                    font-size: 0.78rem;
                    white-space: nowrap;
                }

                .task-row .btn {
                    flex: 0 0 auto;
                    min-width: 105px;
                    padding: 8px 12px;
                    border-radius: 3px;
                }

                .timing-manager form {
                    gap: 12px;
                }

                .planb-card {
                    border: 1px solid #8f702f;
                    border-top: 2px solid #d6aa48;
                    animation: slideInFade 0.6s ease-out both, goldPulse 2.8s ease-in-out infinite;
                }

                .planb-card h3 {
                    color: #e0b957;
                    border-bottom-color: rgba(214, 170, 72, 0.35);
                }

                .planb-card .task-row {
                    border-color: rgba(214, 170, 72, 0.35);
                    border-right-color: #d6aa48;
                }

                .timing-group {
                    padding: 13px;
                    border: 1px solid var(--line);
                    background: #0d0f11;
                }

                .timing-group label {
                    display: block;
                    margin-bottom: 9px;
                    color: var(--gray-light);
                }

                .timing-fields {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .timing-fields input {
                    min-width: 0;
                }

                .target-list {
                    display: grid;
                    gap: 6px;
                    margin-top: 14px;
                    padding: 8px;
                    min-height: 52px;
                    border: 1px solid #262b30;
                    background: #090b0d;
                }

                .target-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 16px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid #30363d;
                }

                .target-title h3 {
                    margin-bottom: 4px;
                    border-bottom: 0;
                    padding-bottom: 0;
                    color: #e0b957;
                }

                .target-title p {
                    color: var(--text-sub);
                    font-size: 0.78rem;
                }

                .target-count {
                    padding: 6px 10px;
                    border: 1px solid #8f702f;
                    color: #e0b957;
                    font-size: 0.75rem;
                    white-space: nowrap;
                }

                .target-add {
                    display: flex;
                    align-items: stretch;
                    gap: 8px;
                }

                .target-add input {
                    flex: 1;
                }

                .target-add .btn {
                    flex: 0 0 auto;
                    min-width: 125px;
                }

                .target-mode {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-top: 14px;
                    padding: 12px;
                    border: 1px solid var(--line);
                    background: #0d0f11;
                }

                .target-mode select {
                    width: min(58%, 260px);
                }

                .target-save {
                    width: 100%;
                    margin-top: 14px;
                }

                .target-chip {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border: 1px solid #30363d;
                    border-right: 3px solid #555d66;
                    background: #15191d;
                    color: var(--gray-light);
                    font-size: 0.85rem;
                    transition: 0.2s ease;
                }

                .target-chip:hover {
                    background: #1b2025;
                    border-right-color: #9aa3ad;
                }

                .target-chip.is-primary {
                    border-color: #8f702f;
                    border-right-color: #e0b957;
                    background: rgba(184, 138, 44, 0.16);
                }

                .target-manager.random-mode .target-chip.is-primary {
                    border-color: var(--line-strong);
                    background: var(--surface-raised);
                }

                .target-manager.random-mode .primary-label {
                    color: var(--text-sub);
                }

                .target-chip .target-id {
                    margin-right: auto;
                }

                .target-chip .primary-label {
                    color: #e0b957;
                    font-size: 0.75rem;
                }

                .target-chip button {
                    border: 1px solid var(--line-strong);
                    background: #0e1114;
                    color: var(--gray);
                    cursor: pointer;
                    padding: 5px 9px;
                    font: inherit;
                    font-size: 0.75rem;
                    transition: 0.2s ease;
                }

                .target-chip button:hover {
                    color: var(--gray-light);
                    border-color: var(--gray);
                }


                .card {
                    background: rgba(17, 19, 21, 0.96);
                    border: 1px solid var(--line);
                    border-radius: 5px;
                    padding: 22px;
                    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
                    animation: slideInFade 0.6s ease-out both;
                    position: relative;
                    transition: all 0.3s ease;
                    border-top: 2px solid var(--account-accent);
                }

                .card:nth-child(1) { animation-delay: 0.05s; }
                .card:nth-child(2) { animation-delay: 0.1s; }
                .card:nth-child(3) { animation-delay: 0.15s; }
                .card:nth-child(4) { animation-delay: 0.2s; }

                .card:hover {
                    border-color: var(--line-strong);
                    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.38);
                }

                .card h3 {
                    font-size: 1.3rem;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--line);
                    padding-bottom: 14px;
                    color: var(--gray-light);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                }

                .status-badge {
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.8rem;
                    border: 1px solid;
                    transition: all 0.2s ease;
                }

                .status-on {
                    background: rgba(122, 155, 90, 0.15);
                    color: #9fbf7f;
                    border-color: rgba(122, 155, 90, 0.4);
                }

                .status-off {
                    background: rgba(139, 90, 90, 0.15);
                    color: #c9a5a5;
                    border-color: rgba(139, 90, 90, 0.4);
                }

                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--line);
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                    color: var(--gray);
                }

                .stat-item:hover {
                    background: rgba(255, 255, 255, 0.035);
                    padding-left: 5px;
                }

                .stat-item span:last-child {
                    font-weight: 700;
                    color: #9fbf7f;
                }

                .btn-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 20px;
                }

                .btn {
                    flex: 1;
                    min-width: 130px;
                    padding: 11px 18px;
                    border: 1.5px solid;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    text-decoration: none;
                    text-align: center;
                    color: #f5f3f1;
                    display: inline-block;
                    font-size: 0.85rem;
                    position: relative;
                    letter-spacing: 0.5px;
                }

                .btn:hover {
                    transform: translateY(-1px);
                }

                .btn-primary {
                    background: #30353a;
                    border-color: var(--line-strong);
                }

                .btn-primary:hover {
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
                    border-color: var(--gray);
                }

                .btn-success {
                    background: #3d4349;
                    border-color: #626a72;
                }

                .btn-success:hover {
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
                    border-color: var(--gray-light);
                }

                .btn-danger {
                    background: #24282c;
                    border-color: #596068;
                }

                .btn-danger:hover {
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
                    border-color: var(--gray-light);
                }

                .btn-warning {
                    background: #4b5158;
                    border-color: #737b84;
                }

                .btn-warning:hover {
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.08);
                    border-color: var(--gray-light);
                }

                form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                label {
                    font-size: 0.85rem;
                    color: var(--gray);
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }

                input[type="text"],
                input[type="number"],
                select {
                    width: 100%;
                    background: #0d0f11;
                    border: 1px solid var(--line);
                    padding: 11px 14px;
                    border-radius: 8px;
                    color: #e8e6e4;
                    outline: none;
                    font-size: 0.9rem;
                    transition: all 0.25s ease;
                }

                input:focus {
                    border-color: var(--gray);
                    box-shadow: 0 0 8px rgba(255, 255, 255, 0.08);
                    background: #121518;
                }

                input::placeholder {
                    color: #5a5350;
                }

                select {
                    appearance: none;
                }

                form button {
                    margin-top: 5px;
                }

                /* Accordion Styles */
                .accordion-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .accordion-item {
                    background: #0d0f11;
                    border: 1px solid var(--line);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .accordion-item:hover {
                    border-color: var(--line-strong);
                    background: #15181b;
                }

                .accordion-header {
                    padding: 12px 15px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                    color: var(--gray-light);
                    transition: all 0.25s ease;
                    user-select: none;
                }

                .accordion-header:hover {
                    color: var(--gray-light);
                }

                .accordion-icon {
                    font-size: 1.2rem;
                    transition: transform 0.3s ease;
                }

                .accordion-item.active .accordion-icon {
                    transform: rotate(180deg);
                }

                .accordion-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                    padding: 0 15px;
                }

                .accordion-item.active .accordion-content {
                    max-height: 500px;
                    padding: 15px;
                }

                .accordion-content-inner {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                @media (max-width: 768px) {
                    header h1 { font-size: 2rem; letter-spacing: 2px; }
                    .grid { grid-template-columns: 1fr; }
                    .btn-group { flex-direction: column; }
                    .btn { min-width: 100%; }
                    body { padding: 20px 10px; }
                    .dashboard-nav { margin-bottom: 18px; }
                    .dashboard-nav button { min-width: 125px; padding: 10px 12px; }
                    .task-row { align-items: flex-start; flex-wrap: wrap; }
                    .task-state { margin-right: 0; }
                    .task-row .btn { width: 100%; }
                    .target-title,
                    .target-add,
                    .target-mode { align-items: stretch; flex-direction: column; }
                    .target-add .btn,
                    .target-mode select { width: 100%; }
                }
            </style>
        </head>
        <body style="--account-accent: #a8afb7;">
            <div class="container">
                <header>
                    <h1>◆ لوحة التحكم ◆</h1>
                    <p>نظام إدارة ديسكورد سيلفبوت المتقدم</p>
                </header>

                <nav class="dashboard-nav" aria-label="أقسام لوحة التحكم">
                    <button type="button" class="active" data-panel-target="overview">⚙️ النظرة العامة</button>
                    <button type="button" data-panel-target="tasks">⚡ إدارة المهام</button>
                    <button type="button" data-panel-target="channels">🎙️ القنوات والرسائل</button>
                </nav>

                <div style="display:flex; flex-direction:column; gap:25px;">
                    <div class="grid dashboard-panel active" data-panel="overview">
                            <!-- حالة النظام -->
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
                            <span>وحدة الكتابة</span>
                            <span class="status-badge ${botState.isChatActive ? 'status-on' : 'status-off'}">${botState.isChatActive ? 'مفعلة' : 'معطلة'}</span>
                        </div>
                        <div class="stat-item">
                            <span>المهام الأساسية</span>
                            <span class="status-badge ${botState.isTaskRunning ? 'status-on' : 'status-off'}">${botState.isTaskRunning ? 'مفعلة' : 'متوقفة'}</span>
                        </div>
                        <div class="stat-item">
                            <span>الخطة ب</span>
                            <span class="status-badge ${botState.isPlanBRunning ? 'status-on' : 'status-off'}">${botState.isPlanBRunning ? 'مشغلة' : 'متوقفة'}</span>
                        </div>
                        <div class="btn-group">
                            <a href="/api/toggle/voice" class="btn btn-primary">${botState.isVoiceActive ? '🔇 إيقاف صوت' : '🔊 تشغيل صوت'}</a>
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
                        <div class="stat-item"><span>آخر نشاط</span> <span style="font-size:0.85rem">${s.lastActiveTime || 'لا يوجد'}</span></div>
                    </div>
                </div>

                <div class="grid dashboard-panel" data-panel="tasks">
                    <div class="card task-manager">
                        <h3>⚡ إدارة المهام</h3>
                        <div class="task-list">
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">01</span>ذكريات</span>
                                <span class="task-state">${taskActive('task1') ? 'مفعلة' : 'متوقفة'}</span>
                                <a href="/api/toggle-task/task1" class="btn ${taskActive('task1') ? 'btn-danger' : 'btn-success'}">${taskActive('task1') ? '⏹ إيقاف' : '▶ تشغيل'}</a>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">02</span>بخشيش</span>
                                <span class="task-state">${taskActive('task2') ? 'مفعلة' : 'متوقفة'}</span>
                                <a href="/api/toggle-task/task2" class="btn ${taskActive('task2') ? 'btn-danger' : 'btn-success'}">${taskActive('task2') ? '⏹ إيقاف' : '▶ تشغيل'}</a>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">03</span>عمل / جريمة</span>
                                <span class="task-state">${taskActive('task3') ? 'مفعلة' : 'متوقفة'}</span>
                                <a href="/api/toggle-task/task3" class="btn ${taskActive('task3') ? 'btn-danger' : 'btn-success'}">${taskActive('task3') ? '⏹ إيقاف' : '▶ تشغيل'}</a>
                            </div>
                            <div class="task-row">
                                <span class="task-name"><span class="task-number">04</span>هجوم</span>
                                <span class="task-state">${taskActive('task4') ? 'مفعلة' : 'متوقفة'}</span>
                                <a href="/api/toggle-task/task4" class="btn ${taskActive('task4') ? 'btn-danger' : 'btn-success'}">${taskActive('task4') ? '⏹ إيقاف' : '▶ تشغيل'}</a>
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
                            <div class="form-group">
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
                            <a href="/api/toggle-planb" class="btn ${planBActive ? 'btn-danger' : 'btn-success'}">${planBActive ? '⏹ إيقاف' : '▶ تشغيل'}</a>
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

                <div class="grid dashboard-panel" data-panel="channels">
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
                    </div>
                </div>
            </div>

            <script>
                document.querySelectorAll('[data-panel-target]').forEach(button => {
                    button.addEventListener('click', function(event) {
                        event.preventDefault();
                        const target = this.getAttribute('data-panel-target');
                        document.querySelectorAll('[data-panel-target]').forEach(item => item.classList.remove('active'));
                        document.querySelectorAll('[data-panel]').forEach(panel => {
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
    res.redirect('/');
});

app.get('/api/toggle-task/:task', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('toggleTask', req.params.task);
    }
    res.redirect('/');
});

app.get('/api/toggle-planb', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('togglePlanB');
    }
    res.redirect('/');
});

app.post('/api/update-tasks-config', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('updateTasksConfig', req.body);
    }
    res.redirect('/');
});

app.post('/api/add-account', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('addAccount', req.body || {});
    }
    res.json({ success: true });
});

app.post('/api/delete-account/:id', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('deleteAccount', req.params.id);
    }
    res.json({ success: true });
});

app.get('/api/select-account/:id', (req, res) => {
    if (global.botEmitter) {
        global.botEmitter.emit('selectAccount', req.params.id);
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
