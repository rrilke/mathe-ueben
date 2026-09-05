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
        { id: 'symbols',        symbol: '🍎?', name: 'Symbol-Rätsel' },
    ],
    ranges: [
        { value: 5,  label: '0 bis 5',  desc: 'Leicht' },
        { value: 10, label: '0 bis 10', desc: 'Mittel' },
        { value: 20, label: '0 bis 20', desc: 'Schwer' },
    ],
    // Symbol-Rätsel: how many symbols get a value (1..n). Replaces the ranges
    // above while that operation is selected.
    symbolLevels: [
        { value: 5,  label: '1 bis 5',  desc: 'Leicht' },
        { value: 10, label: '1 bis 10', desc: 'Schwer' },
    ],
    // Distinct, easy-to-tell-apart symbols for the Symbol-Rätsel legend.
    symbolAlphabet: ['🍎','⭐','🦋','🐻','🌼','🍀','🐞','🍓','🐠','🍩','🦄','🐧','🍉','🍒','🦊'],
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
let symbolLegend = [];   // Symbol-Rätsel: [{ icon, value }] for this round

// ============================================================
// DOM elements
// ============================================================
const pages = {
    settings: document.getElementById('settings-page'),
    symbols: document.getElementById('symbols-page'),
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
const symbolsBackBtn = document.getElementById('symbols-back-btn');
const symbolsStartBtn = document.getElementById('symbols-start-btn');
const restartBtn = document.getElementById('restart-btn');
const answerInput = document.getElementById('answer-input');
const numpad = document.getElementById('numpad');
const soundToggle = document.getElementById('sound-toggle');
const visualToggle = document.getElementById('visual-toggle');
const speakToggle = document.getElementById('speak-toggle');
const speakBtn = document.getElementById('speak-btn');

let visualAidsEnabled = true;
let soundEnabled = true;
let speakEnabled = true;

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

    renderRanges();

    countContainer.innerHTML = CONFIG.questionCounts.map(c => `
        <button class="count-btn${c === CONFIG.defaultQuestionCount ? ' selected' : ''}" data-count="${c}">
            ${c}
        </button>`).join('');

    // Single-select handlers for each group
    wireSingleSelect(profileContainer, '.profile-btn', btn => { selectedProfile = btn.dataset.profile; });
    wireSingleSelect(operationContainer, '.operation-btn', btn => {
        selectedOperation = btn.dataset.operation;
        renderRanges(); // Symbol-Rätsel offers its own two levels
    });
    wireSingleSelect(countContainer, '.count-btn', btn => { selectedQuestionCount = parseInt(btn.dataset.count, 10); });
}

// The Symbol-Rätsel has only two levels (1–5 / 1–10), the other operations
// the usual three ranges — so the buttons are rebuilt whenever the operation changes.
function rangeOptions() {
    return selectedOperation === 'symbols' ? CONFIG.symbolLevels : CONFIG.ranges;
}

function renderRanges() {
    const options = rangeOptions();
    if (!options.some(o => o.value === selectedRange)) {
        selectedRange = options.some(o => o.value === CONFIG.defaultRange)
            ? CONFIG.defaultRange
            : options[options.length - 1].value;
    }

    rangeContainer.style.gridTemplateColumns = `repeat(${options.length}, 1fr)`;
    rangeContainer.innerHTML = options.map(r => `
        <button class="range-btn${r.value === selectedRange ? ' selected' : ''}" data-range="${r.value}">
            <span class="range-label">${r.label}</span>
            <span class="range-desc">${r.desc}</span>
        </button>`).join('');

    wireSingleSelect(rangeContainer, '.range-btn', btn => { selectedRange = parseInt(btn.dataset.range, 10); });
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
        unlockSpeech(); // prime read-aloud inside the user gesture (iOS)
        initializeQuiz();
        if (selectedOperation === 'symbols') {
            renderLegendPage();     // learn the symbols first, then rechnen
            showPage('symbols');
        } else {
            startQuestions();
        }
    }
});

symbolsStartBtn.addEventListener('click', startQuestions);

symbolsBackBtn.addEventListener('click', () => {
    showPage('settings');
});

// Enter the question flow — the clock starts here, so memorising the symbol
// legend doesn't count against the time.
function startQuestions() {
    startTime = Date.now();
    showPage('quiz');
    updateQuizDisplay();
}

backBtn.addEventListener('click', () => {
    cancelSpeech();
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
    symbolLegend = selectedOperation === 'symbols' ? buildSymbolLegend(selectedRange) : [];
    questions = generateQuestions();
    startTime = Date.now();
}

function generateQuestions() {
    if (selectedOperation === 'symbols') return generateSymbolQuestions();

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

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function shuffled(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ------------------------------------------------------------
// Symbol-Rätsel: each symbol stands for a number 1..count; the questions then
// only show the symbols, so the child has to substitute before rechnen.
// ------------------------------------------------------------
function buildSymbolLegend(count) {
    const values = shuffled(Array.from({ length: count }, (_, i) => i + 1));
    return shuffled(CONFIG.symbolAlphabet)
        .slice(0, count)
        .map((icon, i) => ({ icon, value: values[i] }));
}

function generateSymbolQuestions() {
    const list = [];
    for (let i = 0; i < selectedQuestionCount; i++) {
        let a = pickRandom(symbolLegend);
        let b = pickRandom(symbolLegend);
        while (symbolLegend.length > 1 && b === a) b = pickRandom(symbolLegend); // two different symbols

        const operation = Math.random() < 0.5 ? 'addition' : 'subtraction';
        if (operation === 'subtraction' && b.value > a.value) [a, b] = [b, a]; // never negative

        list.push({
            kind: 'symbols',
            operation,
            sym1: a.icon,
            sym2: b.icon,
            num1: a.value,
            num2: b.value,
            correctAnswer: operation === 'addition' ? a.value + b.value : a.value - b.value,
            icon: a.icon,
        });
    }
    return list;
}

function updateQuizDisplay() {
    const question = questions[currentQuestion];
    const isSymbols = question.kind === 'symbols';

    const num1El = document.getElementById('num1');
    const num2El = document.getElementById('num2');
    num1El.textContent = isSymbols ? question.sym1 : question.num1;
    num2El.textContent = isSymbols ? question.sym2 : question.num2;
    num1El.classList.toggle('symbol-token', isSymbols);
    num2El.classList.toggle('symbol-token', isSymbols);
    document.getElementById('operator').textContent = OPERATOR_SYMBOLS[question.operation];

    // Reading "🍎 plus ⭐" aloud would either be nonsense or give the values away.
    speakBtn.style.display = isSymbols ? 'none' : '';

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

    if (isSymbols) cancelSpeech();
    else scheduleSpeak(question); // read the task aloud after a short delay
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

    // Symbol-Rätsel: the helper is the legend itself — with Hilfssymbole off
    // the child has to remember what each symbol is worth.
    if (question.kind === 'symbols') {
        visualRow.style.display = visualAidsEnabled ? '' : 'none';
        if (visualAidsEnabled) renderLegendStrip(visualRow);
        return;
    }

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
        caption: `Von ${q.num1} aus ${q.num2} weiterzählen`,
    });
}

// Minus: a number line; hop num2 steps back from num1 to land on the answer.
function renderNumberLine(row, q) {
    const answer = q.num1 - q.num2;
    buildNumberLine(row, {
        start: q.num1,
        end: answer,
        mode: 'back',
        caption: `Von ${q.num1} aus ${q.num2} zurückzählen`,
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
        // Mark the start and the hopped-over steps, but do NOT highlight the
        // destination — the child should count the hops to find the answer.
        if (i === opts.start) tick.classList.add('nl-start');
        else if (stepped) tick.classList.add(opts.mode === 'forward' ? 'nl-added' : 'nl-removed');

        const hop = document.createElement('span');
        hop.className = 'nl-hop';
        hop.textContent = stepped ? (opts.mode === 'forward' ? '↪' : '↩') : '';

        const dot = document.createElement('span');
        dot.className = 'nl-dot';

        const label = document.createElement('span');
        label.className = 'nl-label';
        // Only label the start ("von der man aus zählt"); the hop steps stay
        // unlabelled so the child has to count them instead of reading the answer.
        label.textContent = (i === opts.start) ? i : '';

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
        zero.textContent = `${q.num1} mal die ${q.num2}`;
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
    caption.textContent = Array(q.num1).fill(q.num2).join(' + ');
    wrap.appendChild(caption);

    row.appendChild(wrap);
}

// Symbol-Rätsel: the big "learn it first" board shown before the questions.
function renderLegendPage() {
    document.getElementById('symbol-legend').innerHTML = legendByValue().map(s => `
        <div class="legend-card">
            <span class="legend-icon">${s.icon}</span>
            <span class="legend-equals">=</span>
            <span class="legend-value">${s.value}</span>
        </div>`).join('');
}

// The same mapping as a compact strip under the question (the "Spickzettel").
function renderLegendStrip(row) {
    row.className = 'visual-row legend-row';
    row.innerHTML = `
        <div class="legend-strip">
            ${legendByValue().map(s => `
                <span class="legend-chip">
                    <span class="legend-chip-icon">${s.icon}</span>
                    <span class="legend-chip-value">${s.value}</span>
                </span>`).join('')}
        </div>`;
}

// Sorted 1, 2, 3 … — easier to memorise than a random order.
function legendByValue() {
    return symbolLegend.slice().sort((a, b) => a.value - b.value);
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

    cancelSpeech(); // stop any pending/ongoing read-aloud once she answers

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
// Read the task aloud (SpeechSynthesis) — e.g. "sieben plus acht"
// ============================================================
const SPEAK_WORD = { addition: 'plus', subtraction: 'minus', multiplication: 'mal' };
const SPEAK_DELAY_MS = 2000;
const speechOK = 'speechSynthesis' in window;
let speakTimer = null;
let germanVoice = null;

function loadGermanVoice() {
    if (!speechOK) return;
    const voices = window.speechSynthesis.getVoices() || [];
    germanVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('de')) || germanVoice;
}
if (speechOK) {
    loadGermanVoice();
    window.speechSynthesis.onvoiceschanged = loadGermanVoice;
}

// Prime the speech engine inside a user gesture (required by iOS/Safari).
function unlockSpeech() {
    if (!speechOK || !speakEnabled) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'de-DE';
    try { window.speechSynthesis.speak(u); } catch (e) { /* ignore */ }
}

function speakQuestion(q) {
    if (!speechOK || !speakEnabled || !q) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${q.num1} ${SPEAK_WORD[q.operation]} ${q.num2}`);
    u.lang = 'de-DE';
    u.rate = 0.85;
    if (germanVoice) u.voice = germanVoice;
    window.speechSynthesis.speak(u);
}

function cancelSpeech() {
    if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
    if (speechOK) window.speechSynthesis.cancel();
}

function scheduleSpeak(q) {
    cancelSpeech();
    if (!speakEnabled) return;
    speakTimer = setTimeout(() => speakQuestion(q), SPEAK_DELAY_MS);
}

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

speakToggle.addEventListener('change', () => {
    speakEnabled = speakToggle.checked;
    if (speakEnabled) unlockSpeech();
    else cancelSpeech();
});

speakBtn.addEventListener('click', () => {
    speakQuestion(questions[currentQuestion]); // direct tap = reliable on iOS
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
    cancelSpeech();
    selectedProfile = null;
    selectedOperation = null;
    selectedRange = CONFIG.defaultRange;
    selectedQuestionCount = CONFIG.defaultQuestionCount;
    currentQuestion = 0;
    score = 0;
    currentStreak = 0;
    bestStreak = 0;
    questions = [];
    symbolLegend = [];
    startTime = null;
    endTime = null;

    profileContainer.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('selected'));
    operationContainer.querySelectorAll('.operation-btn').forEach(b => b.classList.remove('selected'));
    renderRanges(); // back to the standard three ranges
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
