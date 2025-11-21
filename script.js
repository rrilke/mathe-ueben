// Game state
let selectedProfile = null;
let selectedOperation = null;
let selectedRange = 10;
let currentQuestion = 0;
let score = 0;
let questions = [];
let startTime = null;
let endTime = null;
let visualIcon = '🍎';

// DOM elements
const settingsPage = document.getElementById('settings-page');
const quizPage = document.getElementById('quiz-page');
const correctPage = document.getElementById('correct-page');
const resultsPage = document.getElementById('results-page');
const profileButtons = document.querySelectorAll('.profile-btn');
const operationButtons = document.querySelectorAll('.operation-btn');
const rangeButtons = document.querySelectorAll('.range-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const restartBtn = document.getElementById('restart-btn');
const answerInput = document.getElementById('answer-input');

// Event listeners
profileButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        profileButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedProfile = btn.dataset.profile;
        checkStartButton();
    });
});

operationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        operationButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedOperation = btn.dataset.operation;
        checkStartButton();
    });
});

rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        rangeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRange = parseInt(btn.dataset.range);
        checkStartButton();
    });
});

function checkStartButton() {
    startQuizBtn.disabled = !(selectedProfile && selectedOperation && selectedRange);
}

startQuizBtn.addEventListener('click', () => {
    if (selectedProfile && selectedOperation && selectedRange) {
        initializeQuiz();
        showPage('quiz');
    }
});

restartBtn.addEventListener('click', () => {
    resetGame();
    showPage('settings');
});

function initializeQuiz() {
    currentQuestion = 0;
    score = 0;
    const icons = ['🍎','⭐','🧡','🦋','🐻','🌼','🍀','🐞','🍓','🌟','🐠','🍩','🍪','🦄','🐧','🍉','🍌','🍒','🦊','🐸'];
    visualIcon = icons[Math.floor(Math.random() * icons.length)];
    questions = generateQuestions();
    startTime = Date.now();
    updateQuizDisplay();
}

function updateQuizDisplay() {
    const question = questions[currentQuestion];
    document.getElementById('num1').textContent = question.num1;
    document.getElementById('num2').textContent = question.num2;
    const showVisuals = typeof window.visualAidsEnabled === 'undefined' ? true : window.visualAidsEnabled;
    document.getElementById('num1-visual').style.display = showVisuals ? '' : 'none';
    document.getElementById('num2-visual').style.display = showVisuals ? '' : 'none';
    document.getElementById('visual-operator').style.display = showVisuals ? '' : 'none';
    if (showVisuals) {
        renderVisualAid('num1-visual', question.num1, question.icon);
        renderVisualAid('num2-visual', question.num2, question.icon);
        document.getElementById('visual-operator').textContent = question.operation === 'addition' ? '+' : '−';
    }
    document.getElementById('current-question').textContent = currentQuestion + 1;
    document.getElementById('current-score').textContent = score;
    const operatorSymbol = question.operation === 'addition' ? '+' : '−';
    document.getElementById('operator').textContent = operatorSymbol;
    answerInput.value = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    submitAnswerBtn.style.display = 'block';
    nextQuestionBtn.style.display = 'none';
    submitAnswerBtn.disabled = false;
    answerInput.disabled = false;
    answerInput.focus();
}

function renderVisualAid(elementId, value, iconChar) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    for (let i = 0; i < value; i++) {
        const icon = document.createElement('span');
        icon.className = 'visual-emoji';
        icon.textContent = iconChar;
        container.appendChild(icon);
    }
}

const visualToggle = document.getElementById('visual-toggle');
window.visualAidsEnabled = true;
if (visualToggle) {
    visualToggle.addEventListener('change', function() {
        window.visualAidsEnabled = visualToggle.checked;
        // Update display immediately when toggled
        if (document.getElementById('quiz-page').classList.contains('active')) {
            updateQuizDisplay();
        }
    });
}

function generateQuestions() {
    const questions = [];
    for (let i = 0; i < 10; i++) {
        let num1, num2, operation, correctAnswer;
        let icon = visualIcon;
        if (selectedOperation === 'mixed') {
            operation = Math.random() < 0.5 ? 'addition' : 'subtraction';
        } else {
            operation = selectedOperation;
        }
        if (operation === 'addition') {
            num1 = Math.floor(Math.random() * (selectedRange + 1));
            num2 = Math.floor(Math.random() * (selectedRange + 1));
            correctAnswer = num1 + num2;
        } else {
            num1 = Math.floor(Math.random() * (selectedRange + 1));
            num2 = Math.floor(Math.random() * (selectedRange + 1));
            if (num2 > num1) [num1, num2] = [num2, num1]; // Avoid negative results
            correctAnswer = num1 - num2;
        }
        questions.push({ num1, num2, operation, correctAnswer, icon });
    }
    return questions;
}

submitAnswerBtn.addEventListener('click', submitAnswer);
nextQuestionBtn.addEventListener('click', moveToNextQuestion);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

function submitAnswer() {
    const userAnswer = parseInt(answerInput.value);
    
    if (isNaN(userAnswer)) {
        return; // Don't process if no answer
    }
    
    const question = questions[currentQuestion];
    const feedback = document.getElementById('feedback');
    
    if (userAnswer === question.correctAnswer) {
        // Check if this is a correction (next button was visible)
        const wasCorrection = nextQuestionBtn.style.display === 'block';
        
        score++;
        document.getElementById('current-score').textContent = score;
        
        // Show correct answer celebration page
        showPage('correct');
        
        // Move to next question after showing celebration
        setTimeout(() => {
            currentQuestion++;
            
            if (currentQuestion < 10) {
                showPage('quiz');
                updateQuizDisplay();
            } else {
                showResults();
            }
        }, 2000);
    } else {
        feedback.textContent = `✗ Nicht ganz. Versuche es nochmal!`;
        feedback.className = 'feedback incorrect';
        
        // Hide submit button, show next button
        submitAnswerBtn.style.display = 'none';
        nextQuestionBtn.style.display = 'block';
        
        // Keep input enabled so she can try again
        answerInput.focus();
    }
}

// Move to next question
function moveToNextQuestion() {
    currentQuestion++;
    
    if (currentQuestion < 10) {
        updateQuizDisplay();
    } else {
        showResults();
    }
}

// Show results
function showResults() {
    endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000); // Time in seconds
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('correct-count').textContent = score;
    document.getElementById('incorrect-count').textContent = 10 - score;
    
    // Display time
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    document.getElementById('time-taken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Save result to localStorage
    saveResult(selectedProfile, score, timeTaken);
    
    // Display ranking
    displayRanking(selectedProfile);
    
    // Set message based on score
    const messageElement = document.getElementById('score-message');
    if (score === 10) {
        messageElement.textContent = '🌟 Wow! Alles richtig! Du bist super!';
    } else if (score >= 8) {
        messageElement.textContent = '🎉 Toll gemacht! Fast alles richtig!';
    } else if (score >= 6) {
        messageElement.textContent = '👍 Gut gemacht! Übe weiter!';
    } else if (score >= 4) {
        messageElement.textContent = '💪 Das war schon ganz gut!';
    } else {
        messageElement.textContent = '📚 Üben, üben, üben! Du schaffst das!';
    }
    
    showPage('results');
}

// Save result to localStorage
function saveResult(profile, score, timeTaken) {
    const result = {
        profile: profile,
        score: score,
        time: timeTaken,
        timestamp: new Date().toLocaleString('de-DE'),
        date: Date.now()
    };
    
    // Get existing results
    let results = JSON.parse(localStorage.getItem('mathResults') || '[]');
    
    // Add new result
    results.push(result);
    
    // Save back to localStorage
    localStorage.setItem('mathResults', JSON.stringify(results));
}

// Display ranking for a profile
function displayRanking(profile) {
    const results = JSON.parse(localStorage.getItem('mathResults') || '[]');
    
    // Filter results for this profile and sort by score (desc) then time (asc)
    const profileResults = results
        .filter(r => r.profile === profile)
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Higher score first
            }
            return a.time - b.time; // Faster time first
        })
        .slice(0, 5); // Top 5
    
    const rankingList = document.getElementById('ranking-list');
    
    if (profileResults.length === 0) {
        rankingList.innerHTML = '<p class="no-results">Noch keine Ergebnisse</p>';
        return;
    }
    
    let html = '<table class="ranking-table">';
    html += '<thead><tr><th>Platz</th><th>Punkte</th><th>Zeit</th><th>Datum</th></tr></thead><tbody>';
    
    profileResults.forEach((result, index) => {
        const minutes = Math.floor(result.time / 60);
        const seconds = result.time % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        html += `<tr>
            <td>${index + 1}</td>
            <td>${result.score}/10</td>
            <td>${timeStr}</td>
            <td>${result.timestamp}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    rankingList.innerHTML = html;
}

// Show specific page
function showPage(pageName) {
    settingsPage.classList.remove('active');
    quizPage.classList.remove('active');
    correctPage.classList.remove('active');
    resultsPage.classList.remove('active');
    
    if (pageName === 'settings') {
        settingsPage.classList.add('active');
    } else if (pageName === 'quiz') {
        quizPage.classList.add('active');
    } else if (pageName === 'correct') {
        correctPage.classList.add('active');
    } else if (pageName === 'results') {
        resultsPage.classList.add('active');
    }
}

// Reset game
function resetGame() {
    selectedProfile = null;
    selectedOperation = null;
    selectedRange = 10;
    currentQuestion = 0;
    score = 0;
    questions = [];
    startTime = null;
    endTime = null;
    profileButtons.forEach(btn => btn.classList.remove('selected'));
    operationButtons.forEach(btn => btn.classList.remove('selected'));
    rangeButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.range === '10') {
            btn.classList.add('selected');
        }
    });
    startQuizBtn.disabled = true;
}
