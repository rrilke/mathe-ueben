// ============================================================
// Configuration — change the app's behaviour here, not in the logic below
// ============================================================
const CONFIG = {
    // Add or remove a child by editing this list — the buttons build themselves.
    profiles: [
        { id: 'Alja', icon: '👧' },
        { id: 'Juri', icon: '👦' },
        { id: 'Mama', icon: '👩' },
        { id: 'Papa', icon: '👨' },
        { id: 'Gast', icon: '👤' },
    ],
    operations: [
        { id: 'addition',       symbol: '+',   name: 'Plus' },
        { id: 'subtraction',    symbol: '−',   name: 'Minus' },
        { id: 'mixed',          symbol: '+ −', name: 'Gemischt' },
        { id: 'multiplication', symbol: '×',   name: 'Malnehmen' },
    ],
    ranges: [
        { value: 5,  label: '0 bis 5',  desc: 'Leicht' },
        { value: 10, label: '0 bis 10', desc: 'Mittel' },
        { value: 20, label: '0 bis 20', desc: 'Schwer' },
    ],
    questionCounts: [5, 10, 20],
    icons: ['🍎','⭐','🧡','🦋','🐻','🌼','🍀','🐞','🍓','🌟','🐠','🍩','🍪','🦄','🐧','🍉','🍌','🍒','🦊','🐸'],

    defaultRange: 10,
    defaultQuestionCount: 10,
    multiplicationMaxFactor: 10, // times tables stay friendly regardless of range
    maxVisualIcons: 60,          // above this we hide helper symbols (too many to count)
    celebrationMs: 1500,
};

const OPERATOR_SYMBOLS = { addition: '+', subtraction: '−', multiplication: '×' };
const STORAGE_KEY = 'mathResults';
const STORAGE_VERSION = 2;

// ============================================================
// Game state
// ============================================================
let selectedProfile = null;
let selectedOperation = null;
let selectedRange = CONFIG.defaultRange;
let selectedQuestionCount = CONFIG.defaultQuestionCount;
let currentQuestion = 0;
let score = 0;
let questions = [];
let startTime = null;
let endTime = null;
let currentStreak = 0;
let bestStreak = 0;

// ============================================================
// DOM elements
// ============================================================
const pages = {
    settings: document.getElementById('settings-page'),
    quiz: document.getElementById('quiz-page'),
    correct: document.getElementById('correct-page'),
    results: document.getElementById('results-page'),
};
const profileContainer = document.getElementById('profile-buttons');
const operationContainer = document.getElementById('operation-buttons');
const rangeContainer = document.getElementById('range-buttons');
const countContainer = document.getElementById('count-buttons');
const startQuizBtn = document.getElementById('start-quiz-btn');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const backBtn = document.getElementById('back-btn');
const restartBtn = document.getElementById('restart-btn');
const answerInput = document.getElementById('answer-input');
const numpad = document.getElementById('numpad');
const soundToggle = document.getElementById('sound-toggle');
const visualToggle = document.getElementById('visual-toggle');

let visualAidsEnabled = true;
let soundEnabled = true;

// ============================================================
// Build the settings UI from CONFIG (data-driven)
// ============================================================
function buildSettings() {
    profileContainer.innerHTML = CONFIG.profiles.map(p => `
        <button class="profile-btn" data-profile="${p.id}">
            <span class="profile-icon">${p.icon}</span>
            <span class="profile-name">${p.id}</span>
        </button>`).join('');

    operationContainer.innerHTML = CONFIG.operations.map(o => `
        <button class="operation-btn" data-operation="${o.id}">
            <span class="operation-symbol">${o.symbol}</span>
            <span class="operation-name">${o.name}</span>
        </button>`).join('');

    rangeContainer.innerHTML = CONFIG.ranges.map(r => `
        <button class="range-btn${r.value === CONFIG.defaultRange ? ' selected' : ''}" data-range="${r.value}">
            <span class="range-label">${r.label}</span>
            <span class="range-desc">${r.desc}</span>
        </button>`).join('');

    countContainer.innerHTML = CONFIG.questionCounts.map(c => `
        <button class="count-btn${c === CONFIG.defaultQuestionCount ? ' selected' : ''}" data-count="${c}">
            ${c}
        </button>`).join('');

    // Single-select handlers for each group
    wireSingleSelect(profileContainer, '.profile-btn', btn => { selectedProfile = btn.dataset.profile; });
    wireSingleSelect(operationContainer, '.operation-btn', btn => { selectedOperation = btn.dataset.operation; });
    wireSingleSelect(rangeContainer, '.range-btn', btn => { selectedRange = parseInt(btn.dataset.range, 10); });
    wireSingleSelect(countContainer, '.count-btn', btn => { selectedQuestionCount = parseInt(btn.dataset.count, 10); });
}

function wireSingleSelect(container, selector, onSelect) {
    const buttons = container.querySelectorAll(selector);
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(btn);
            unlockAudio();
            checkStartButton();
        });
    });
}

function checkStartButton() {
    startQuizBtn.disabled = !(selectedProfile && selectedOperation && selectedRange && selectedQuestionCount);
}

// ============================================================
// Quiz lifecycle
// ============================================================
startQuizBtn.addEventListener('click', () => {
    if (selectedProfile && selectedOperation && selectedRange && selectedQuestionCount) {
        initializeQuiz();
        showPage('quiz');
    }
});

backBtn.addEventListener('click', () => {
    showPage('settings');
});

restartBtn.addEventListener('click', () => {
    resetGame();
    showPage('settings');
});

function initializeQuiz() {
    currentQuestion = 0;
    score = 0;
    currentStreak = 0;
    bestStreak = 0;
    questions = generateQuestions();
    startTime = Date.now();
    updateQuizDisplay();
}

function generateQuestions() {
    const list = [];
    for (let i = 0; i < selectedQuestionCount; i++) {
        const icon = CONFIG.icons[Math.floor(Math.random() * CONFIG.icons.length)];
        let operation = selectedOperation;
        if (operation === 'mixed') {
            operation = Math.random() < 0.5 ? 'addition' : 'subtraction';
        }

        let num1, num2, correctAnswer;
        if (operation === 'addition') {
            num1 = randInt(selectedRange);
            num2 = randInt(selectedRange);
            correctAnswer = num1 + num2;
        } else if (operation === 'subtraction') {
            num1 = randInt(selectedRange);
            num2 = randInt(selectedRange);
            if (num2 > num1) [num1, num2] = [num2, num1]; // never negative
            correctAnswer = num1 - num2;
        } else { // multiplication — keep factors in times-table range
            const cap = Math.min(selectedRange, CONFIG.multiplicationMaxFactor);
            num1 = randInt(cap);
            num2 = randInt(cap);
            correctAnswer = num1 * num2;
        }

        list.push({ num1, num2, operation, correctAnswer, icon });
    }
    return list;
}

function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

function updateQuizDisplay() {
    const question = questions[currentQuestion];

    document.getElementById('num1').textContent = question.num1;
    document.getElementById('num2').textContent = question.num2;
    document.getElementById('operator').textContent = OPERATOR_SYMBOLS[question.operation];

    document.getElementById('current-question').textContent = currentQuestion + 1;
    document.getElementById('total-questions').textContent = selectedQuestionCount;
    document.getElementById('current-score').textContent = score;
    updateStreakDisplay();

    renderVisuals(question);

    answerInput.value = '';
    const feedback = document.getElementById('feedback');
    feedback.textContent = '';
    feedback.className = 'feedback';
    submitAnswerBtn.style.display = 'block';
    nextQuestionBtn.style.display = 'none';
    submitAnswerBtn.disabled = false;
    answerInput.disabled = false;
    answerInput.focus();
}

function updateStreakDisplay() {
    const streakEl = document.getElementById('streak-display');
    if (!streakEl) return;
    if (currentStreak >= 2) {
        streakEl.textContent = `🔥 ${currentStreak}`;
        streakEl.style.visibility = 'visible';
    } else {
        streakEl.style.visibility = 'hidden';
    }
}

// ------------------------------------------------------------
// Visual helper symbols
// ------------------------------------------------------------
function renderVisuals(question) {
    const visualRow = document.querySelector('.visual-row');

    const totalIcons = question.operation === 'multiplication'
        ? question.num1 * question.num2
        : question.num1 + question.num2;

    const show = visualAidsEnabled && totalIcons <= CONFIG.maxVisualIcons;
    visualRow.style.display = show ? '' : 'none';
    if (!show) return;

    visualRow.innerHTML = '';
    if (question.operation === 'addition') {
        renderAddition(visualRow, question);
    } else if (question.operation === 'subtraction') {
        renderNumberLine(visualRow, question);
    } else {
        renderRepeatedAddition(visualRow, question);
    }
}

// Plus: a number line; hop num2 steps forward from num1 to land on the sum.
function renderAddition(row, q) {
    const sum = q.num1 + q.num2;
    buildNumberLine(row, {
        start: q.num1,
        end: sum,
        mode: 'forward',
        caption: `Von ${q.num1} aus ${q.num2} weiter → ${sum}`,
    });
}

// Minus: a number line; hop num2 steps back from num1 to land on the answer.
function renderNumberLine(row, q) {
    const answer = q.num1 - q.num2;
    buildNumberLine(row, {
        start: q.num1,
        end: answer,
        mode: 'back',
        caption: `Von ${q.num1} aus ${q.num2} zurück → ${answer}`,
    });
}

// Shared number-line renderer for plus (forward) and minus (back).
function buildNumberLine(row, opts) {
    row.className = 'visual-row numberline-row';

    const line = document.createElement('div');
    line.className = 'numberline';

    // Span only the active part of the line (no leading 0..start clutter).
    const lo = Math.min(opts.start, opts.end);
    const hi = Math.max(opts.start, opts.end);

    const track = document.createElement('div');
    track.className = 'nl-track';
    for (let i = lo; i <= hi; i++) {
        const stepped = opts.mode === 'forward'
            ? (i > opts.start && i <= opts.end)   // ticks hopped onto, going up
            : (i >= opts.end && i < opts.start);  // ticks hopped onto, going down

        const tick = document.createElement('div');
        tick.className = 'nl-tick';
        if (i === opts.start) tick.classList.add('nl-start');
        else if (i === opts.end) tick.classList.add('nl-land');
        else if (stepped) tick.classList.add(opts.mode === 'forward' ? 'nl-added' : 'nl-removed');

        const hop = document.createElement('span');
        hop.className = 'nl-hop';
        hop.textContent = stepped ? (opts.mode === 'forward' ? '↪' : '↩') : '';

        const dot = document.createElement('span');
        dot.className = 'nl-dot';

        const label = document.createElement('span');
        label.className = 'nl-label';
        label.textContent = i;

        tick.append(hop, dot, label);
        track.appendChild(tick);
    }
    line.appendChild(track);

    const caption = document.createElement('div');
    caption.className = 'nl-caption';
    caption.textContent = opts.caption;
    line.appendChild(caption);

    row.appendChild(line);
}

// Mal: num1 groups of num2 icons, joined with + (multiplication as repeated addition).
function renderRepeatedAddition(row, q) {
    row.className = 'visual-row repeated-row';

    const wrap = document.createElement('div');
    wrap.className = 'repeated';

    if (q.num1 === 0 || q.num2 === 0) {
        const zero = document.createElement('div');
        zero.className = 'nl-caption';
        zero.textContent = `${q.num1} × ${q.num2} = 0`;
        wrap.appendChild(zero);
        row.appendChild(wrap);
        return;
    }

    const groups = document.createElement('div');
    groups.className = 'repeated-groups';
    for (let g = 0; g < q.num1; g++) {
        if (g > 0) groups.appendChild(operatorEl('+'));
        const box = groupEl(q.num2, q.icon);
        box.classList.add('repeated-box');
        groups.appendChild(box);
    }
    wrap.appendChild(groups);

    const caption = document.createElement('div');
    caption.className = 'nl-caption';
    caption.textContent = `${Array(q.num1).fill(q.num2).join(' + ')} = ${q.num1 * q.num2}`;
    wrap.appendChild(caption);

    row.appendChild(wrap);
}

function groupEl(value, iconChar) {
    const container = document.createElement('div');
    container.className = 'visual-aid';
    for (let i = 0; i < value; i++) {
        container.appendChild(makeIcon(iconChar));
    }
    return container;
}

function operatorEl(symbol) {
    const op = document.createElement('span');
    op.className = 'visual-operator';
    op.textContent = symbol;
    return op;
}

function makeIcon(iconChar) {
    const icon = document.createElement('span');
    icon.className = 'visual-emoji';
    icon.textContent = iconChar;
    return icon;
}

// ============================================================
// Answering
// ============================================================
submitAnswerBtn.addEventListener('click', submitAnswer);
nextQuestionBtn.addEventListener('click', moveToNextQuestion);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAnswer();
});

function submitAnswer() {
    const userAnswer = parseInt(answerInput.value, 10);
    if (isNaN(userAnswer)) return;

    const question = questions[currentQuestion];
    const feedback = document.getElementById('feedback');

    if (userAnswer === question.correctAnswer) {
        score++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
        document.getElementById('current-score').textContent = score;
        playCorrect();

        showPage('correct');
        setTimeout(() => {
            currentQuestion++;
            if (currentQuestion < selectedQuestionCount) {
                showPage('quiz');
                updateQuizDisplay();
            } else {
                showResults();
            }
        }, CONFIG.celebrationMs);
    } else {
        currentStreak = 0;
        playWrong();
        feedback.textContent = '✗ Nicht ganz. Versuche es nochmal!';
        feedback.className = 'feedback incorrect';
        submitAnswerBtn.style.display = 'none';
        nextQuestionBtn.style.display = 'block';
        answerInput.focus();
    }
}

function moveToNextQuestion() {
    currentQuestion++;
    if (currentQuestion < selectedQuestionCount) {
        updateQuizDisplay();
    } else {
        showResults();
    }
}

// ============================================================
// Results
// ============================================================
function showResults() {
    endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const total = selectedQuestionCount;

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-total').textContent = total;
    document.getElementById('correct-count').textContent = score;
    document.getElementById('incorrect-count').textContent = total - score;
    document.getElementById('time-taken').textContent = formatTime(timeTaken);

    saveResult(selectedProfile, score, total, timeTaken);
    displayRanking(selectedProfile);
    displayBadges(score, total, timeTaken);

    document.getElementById('score-message').textContent = scoreMessage(score, total);
    playFinish();
    showPage('results');
}

function scoreMessage(score, total) {
    const ratio = score / total;
    if (ratio === 1)    return '🌟 Wow! Alles richtig! Du bist super!';
    if (ratio >= 0.8)   return '🎉 Toll gemacht! Fast alles richtig!';
    if (ratio >= 0.6)   return '👍 Gut gemacht! Übe weiter!';
    if (ratio >= 0.4)   return '💪 Das war schon ganz gut!';
    return '📚 Üben, üben, üben! Du schaffst das!';
}

function displayBadges(score, total, timeTaken) {
    const badges = [];
    if (score === total) badges.push({ icon: '🌟', label: 'Perfekt' });
    if (bestStreak >= 5) badges.push({ icon: '🔥', label: `Serie ${bestStreak}` });
    if (score >= total && total > 0 && timeTaken / total < 5) badges.push({ icon: '⚡', label: 'Blitzschnell' });

    const container = document.getElementById('badges');
    if (badges.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = badges.map(b =>
        `<div class="badge"><span class="badge-icon">${b.icon}</span><span class="badge-label">${b.label}</span></div>`
    ).join('');
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================
// Persistence (versioned)
// ============================================================
function loadResults() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;            // legacy v1 format
        if (parsed && Array.isArray(parsed.results)) return parsed.results;
        return [];
    } catch {
        return [];
    }
}

function persistResults(results) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, results }));
}

function saveResult(profile, score, total, timeTaken) {
    const results = loadResults();
    results.push({
        profile,
        score,
        total,
        time: timeTaken,
        timestamp: new Date().toLocaleString('de-DE'),
        date: Date.now(),
    });
    persistResults(results);
}

function displayRanking(profile) {
    const results = loadResults()
        .filter(r => r.profile === profile)
        .sort((a, b) => {
            const aRatio = a.score / (a.total || 10);
            const bRatio = b.score / (b.total || 10);
            if (bRatio !== aRatio) return bRatio - aRatio; // best accuracy first
            return a.time - b.time;                         // then fastest
        })
        .slice(0, 5);

    const rankingList = document.getElementById('ranking-list');
    if (results.length === 0) {
        rankingList.innerHTML = '<p class="no-results">Noch keine Ergebnisse</p>';
        return;
    }

    const rows = results.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${r.score}/${r.total || 10}</td>
            <td>${formatTime(r.time)}</td>
            <td>${r.timestamp}</td>
        </tr>`).join('');

    rankingList.innerHTML = `
        <table class="ranking-table">
            <thead><tr><th>Platz</th><th>Punkte</th><th>Zeit</th><th>Datum</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <button id="clear-ranking-btn" class="clear-btn">Bestenliste löschen</button>`;

    document.getElementById('clear-ranking-btn').addEventListener('click', () => {
        if (confirm(`Bestenliste für ${profile} wirklich löschen?`)) {
            const remaining = loadResults().filter(r => r.profile !== profile);
            persistResults(remaining);
            displayRanking(profile);
        }
    });
}

// ============================================================
// Sound (Web Audio API — no asset files needed)
// ============================================================
let audioCtx = null;
function unlockAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freq, startOffset, duration, type = 'sine') {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = audioCtx.currentTime + startOffset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
}

function playCorrect() { unlockAudio(); tone(660, 0, 0.15); tone(880, 0.12, 0.2); }
function playWrong()   { unlockAudio(); tone(200, 0, 0.25, 'sawtooth'); }
function playFinish()  { unlockAudio(); [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.25)); }

// ============================================================
// Toggles
// ============================================================
visualToggle.addEventListener('change', () => {
    visualAidsEnabled = visualToggle.checked;
    if (pages.quiz.classList.contains('active')) {
        renderVisuals(questions[currentQuestion]);
    }
});

soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    if (soundEnabled) unlockAudio();
});

// ============================================================
// On-screen number pad (tablet friendly)
// ============================================================
function buildNumpad() {
    const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','OK'];
    numpad.innerHTML = keys.map(k => {
        const cls = k === '⌫' ? 'numpad-key numpad-back'
                  : k === 'OK' ? 'numpad-key numpad-ok'
                  : 'numpad-key';
        return `<button type="button" class="${cls}" data-key="${k}">${k}</button>`;
    }).join('');

    numpad.querySelectorAll('.numpad-key').forEach(btn => {
        btn.addEventListener('click', () => {
            unlockAudio();
            const k = btn.dataset.key;
            if (k === '⌫') {
                answerInput.value = answerInput.value.slice(0, -1);
            } else if (k === 'OK') {
                if (nextQuestionBtn.style.display === 'block') {
                    submitAnswer(); // retry after a wrong answer
                } else {
                    submitAnswer();
                }
            } else {
                answerInput.value += k;
            }
            answerInput.focus();
        });
    });
}

// ============================================================
// Page navigation & reset
// ============================================================
function showPage(pageName) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    if (pages[pageName]) pages[pageName].classList.add('active');
}

function resetGame() {
    selectedProfile = null;
    selectedOperation = null;
    selectedRange = CONFIG.defaultRange;
    selectedQuestionCount = CONFIG.defaultQuestionCount;
    currentQuestion = 0;
    score = 0;
    currentStreak = 0;
    bestStreak = 0;
    questions = [];
    startTime = null;
    endTime = null;

    profileContainer.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('selected'));
    operationContainer.querySelectorAll('.operation-btn').forEach(b => b.classList.remove('selected'));
    selectDefault(rangeContainer, '.range-btn', 'range', String(CONFIG.defaultRange));
    selectDefault(countContainer, '.count-btn', 'count', String(CONFIG.defaultQuestionCount));
    startQuizBtn.disabled = true;
}

function selectDefault(container, selector, dataKey, defaultValue) {
    container.querySelectorAll(selector).forEach(b => {
        b.classList.toggle('selected', b.dataset[dataKey] === defaultValue);
    });
}

// ============================================================
// Init
// ============================================================
buildSettings();
buildNumpad();
checkStartButton();
