// Game state
let selectedOperation = null;
let selectedRange = 10; // Default range 0-10
let currentQuestion = 0;
let score = 0;
let questions = [];

// DOM elements
const settingsPage = document.getElementById('settings-page');
const quizPage = document.getElementById('quiz-page');
const correctPage = document.getElementById('correct-page');
const resultsPage = document.getElementById('results-page');
const operationButtons = document.querySelectorAll('.operation-btn');
const rangeButtons = document.querySelectorAll('.range-btn');
const startQuizBtn = document.getElementById('start-quiz-btn');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const restartBtn = document.getElementById('restart-btn');
const answerInput = document.getElementById('answer-input');

// Settings page - Operation selection
operationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        operationButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedOperation = btn.dataset.operation;
        checkStartButton();
    });
});

// Settings page - Range selection
rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        rangeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRange = parseInt(btn.dataset.range);
    });
});

// Check if start button should be enabled
function checkStartButton() {
    startQuizBtn.disabled = !selectedOperation;
}

// Start quiz
startQuizBtn.addEventListener('click', () => {
    if (selectedOperation) {
        initializeQuiz();
        showPage('quiz');
    }
});

// Submit answer
submitAnswerBtn.addEventListener('click', submitAnswer);

// Next question button
nextQuestionBtn.addEventListener('click', moveToNextQuestion);

// Enter key to submit or check correction
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // If next button is visible, user is correcting - treat as submit
        if (nextQuestionBtn.style.display === 'block') {
            submitAnswer();
        } else {
            submitAnswer();
        }
    }
});

// Restart quiz
restartBtn.addEventListener('click', () => {
    resetGame();
    showPage('settings');
});

// Initialize quiz
function initializeQuiz() {
    currentQuestion = 0;
    score = 0;
    questions = generateQuestions();
    updateQuizDisplay();
}

// Generate 10 random questions
function generateQuestions() {
    const questionsArray = [];
    for (let i = 0; i < 10; i++) {
        const num1 = Math.floor(Math.random() * (selectedRange + 1)); // 0 to selectedRange
        const num2 = Math.floor(Math.random() * (selectedRange + 1)); // 0 to selectedRange
        
        let correctAnswer;
        if (selectedOperation === 'addition') {
            correctAnswer = num1 + num2;
        } else {
            correctAnswer = num1 - num2;
        }
        
        questionsArray.push({
            num1: num1,
            num2: num2,
            correctAnswer: correctAnswer
        });
    }
    return questionsArray;
}

// Update quiz display
function updateQuizDisplay() {
    const question = questions[currentQuestion];
    document.getElementById('num1').textContent = question.num1;
    document.getElementById('num2').textContent = question.num2;
    document.getElementById('current-question').textContent = currentQuestion + 1;
    document.getElementById('current-score').textContent = score;
    
    // Set operator symbol
    const operatorSymbol = selectedOperation === 'addition' ? '+' : '−';
    document.getElementById('operator').textContent = operatorSymbol;
    
    // Clear input and feedback
    answerInput.value = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    
    // Reset buttons
    submitAnswerBtn.style.display = 'block';
    nextQuestionBtn.style.display = 'none';
    submitAnswerBtn.disabled = false;
    answerInput.disabled = false;
    
    // Focus on input
    answerInput.focus();
}

// Submit answer
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
    document.getElementById('final-score').textContent = score;
    document.getElementById('correct-count').textContent = score;
    document.getElementById('incorrect-count').textContent = 10 - score;
    
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
    selectedOperation = null;
    selectedRange = 10; // Reset to default
    currentQuestion = 0;
    score = 0;
    questions = [];
    operationButtons.forEach(btn => btn.classList.remove('selected'));
    rangeButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.range === '10') {
            btn.classList.add('selected');
        }
    });
    startQuizBtn.disabled = true;
}
