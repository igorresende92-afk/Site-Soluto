/* ============================================
   Conectados - Game Logic + Auth
   Auth: SHA-256 hashed emails, 1h session
   Data: loaded from data.js + server extras
   ============================================ */

// ============================================
// AUTH MODULE
// ============================================

/*
 * AUTHORIZED_HASHES e QUESTIONS são carregados do data.js (global).
 * E-mails e perguntas extras (adicionados via Admin) vêm do servidor (api/api.php).
 * Para gerenciar: acesse /conectados/admin/
 */

// Cached server extras (loaded on init)
let _serverExtraHashes = [];
let _serverExtraQuestions = [];

async function loadServerExtras() {
    try {
        const response = await fetch('api/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'load_extras',
                auth: {
                    email_hash: '264171cbd9fd365f55a7f91248b32683bc187e198cbbd08a312b59b972745ce9',
                    password_hash: 'a35bc5bfeb7f7781b2c27b8855a3a42fdd0e898c0284cfb551622ee1d79d583c',
                },
            }),
        });
        const result = await response.json();
        if (result.success) {
            _serverExtraHashes = result.data.extra_hashes || [];
            _serverExtraQuestions = result.data.extra_questions || [];
        }
    } catch {
        // Silently fail — game works with data.js alone
    }
}

function getAllAuthorizedHashes() {
    return [...AUTHORIZED_HASHES, ..._serverExtraHashes.map(e => e.hash)];
}

function getAllQuestions() {
    return [...QUESTIONS, ..._serverExtraQuestions];
}

const SESSION_KEY = 'conectados_session';
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hora

async function hashEmail(email) {
    const normalized = email.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function saveSession(name, email) {
    const session = { name, email, timestamp: Date.now() };
    localStorage.setItem(SESSION_KEY, btoa(JSON.stringify(session)));
}

function getSession() {
    const encoded = localStorage.getItem(SESSION_KEY);
    if (!encoded) return null;
    try {
        const session = JSON.parse(atob(encoded));
        if (Date.now() - session.timestamp > SESSION_DURATION_MS) {
            clearSession();
            return null;
        }
        return session;
    } catch {
        clearSession();
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

async function validateEmail(email) {
    const hash = await hashEmail(email);
    return getAllAuthorizedHashes().includes(hash);
}

// ============================================
// DECK LOGIC
// ============================================

class ConectadosDeck {
    constructor(questions) {
        this.originalQuestions = [...questions];
        this.deck = [];
        this.currentIndex = 0;
        this.shuffle();
    }

    shuffle() {
        this.deck = [...this.originalQuestions];
        // Fisher-Yates shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        this.currentIndex = 0;
    }

    draw() {
        if (this.currentIndex >= this.deck.length) {
            return { question: null, action: 'reshuffle' };
        }
        const question = this.deck[this.currentIndex];
        this.currentIndex++;
        return { question, action: 'draw' };
    }

    get remaining() { return this.deck.length - this.currentIndex; }
    get total() { return this.deck.length; }
    get drawn() { return this.currentIndex; }
}

// ============================================
// DOM ELEMENTS
// ============================================

// Login
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginNameInput = document.getElementById('login-name');
const loginEmailInput = document.getElementById('login-email');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const loginBtnText = document.querySelector('.login-btn-text');
const loginBtnLoading = document.querySelector('.login-btn-loading');

// Manual
const manualOverlay = document.getElementById('manual-overlay');
const manualCloseBtn = document.getElementById('manual-close');
const manualStartBtn = document.getElementById('manual-start');
const manualBtn = document.getElementById('manual-btn');

// Game
const appScreen = document.getElementById('app');
const card = document.getElementById('card');
const cardWrapper = document.getElementById('card-wrapper');
const messageText = document.getElementById('message-text');
const cardNumber = document.getElementById('card-number');
const cardContainer = document.getElementById('card-container');
const shuffleBtn = document.getElementById('shuffle-btn');
const toast = document.getElementById('toast');
const counterCurrent = document.getElementById('counter-current');
const counterTotal = document.getElementById('counter-total');
const cardCounter = document.getElementById('card-counter');
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');

// ============================================
// STATE
// ============================================

let deck = null;
let isFlipped = false;
let isAnimating = false;
let currentQuestion = null;

// ============================================
// SCREEN MANAGEMENT
// ============================================

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    manualOverlay.classList.add('hidden');
}

function showManual() {
    manualOverlay.classList.remove('hidden');
}

function hideManual() {
    manualOverlay.classList.add('hidden');
}

function showGameScreen(userName) {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');

    if (userName) {
        const firstName = userName.split(' ')[0];
        welcomeText.textContent = `Olá, ${firstName}! Toque na carta`;
    }

    initGame();
}

// ============================================
// LOGIN LOGIC
// ============================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = loginNameInput.value.trim();
    const email = loginEmailInput.value.trim();
    if (!name || !email) return;

    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginBtnLoading.classList.remove('hidden');
    loginError.classList.add('hidden');
    loginEmailInput.classList.remove('error');

    await new Promise(r => setTimeout(r, 600));

    const isValid = await validateEmail(email);

    if (isValid) {
        saveSession(name, email);
        // Show manual first, then game
        loginScreen.classList.add('hidden');
        showManual();
    } else {
        loginError.classList.remove('hidden');
        loginEmailInput.classList.add('error');
        loginEmailInput.focus();
    }

    loginBtn.disabled = false;
    loginBtnText.classList.remove('hidden');
    loginBtnLoading.classList.add('hidden');
});

loginEmailInput.addEventListener('input', () => {
    loginError.classList.add('hidden');
    loginEmailInput.classList.remove('error');
});

// Manual events
manualCloseBtn.addEventListener('click', () => {
    hideManual();
    const session = getSession();
    if (session && appScreen.classList.contains('hidden')) {
        showGameScreen(session.name);
    }
});

manualStartBtn.addEventListener('click', () => {
    hideManual();
    const session = getSession();
    if (session && appScreen.classList.contains('hidden')) {
        showGameScreen(session.name);
    }
});

// Manual button in game header
manualBtn.addEventListener('click', () => {
    showManual();
});

// Logout
logoutBtn.addEventListener('click', () => {
    clearSession();
    showLoginScreen();
    loginForm.reset();
    loginError.classList.add('hidden');
    loginEmailInput.classList.remove('error');
});

// ============================================
// GAME LOGIC
// ============================================

function initGame() {
    counterTotal.textContent = deck.total;
    counterCurrent.textContent = '0';
    deck.shuffle();
    flipToBack();
    loadNextQuestion();
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

function updateCounter() {
    counterCurrent.textContent = deck.drawn;
    cardCounter.classList.add('visible');
}

function loadNextQuestion() {
    const result = deck.draw();

    if (result.action === 'reshuffle') {
        showToast("Cartas finalizadas, reembaralhando...");
        deck.shuffle();
        counterCurrent.textContent = '0';
        setTimeout(() => {
            const newDraw = deck.draw();
            currentQuestion = newDraw.question;
            messageText.textContent = currentQuestion.text;
            cardNumber.textContent = `#${currentQuestion.id}`;
            updateCounter();
        }, 800);
        return;
    }

    currentQuestion = result.question;
    messageText.textContent = currentQuestion.text;
    cardNumber.textContent = `#${currentQuestion.id}`;
    updateCounter();
}

// Card Interaction
function handleCardTap() {
    if (isAnimating) return;

    if (!isFlipped) {
        flipToFront();
    } else {
        transitionToNextCard();
    }
}

function flipToFront() {
    isAnimating = true;
    isFlipped = true;
    card.classList.add('is-flipped');
    setTimeout(() => { isAnimating = false; }, 700);
}

function flipToBack() {
    isFlipped = false;
    card.classList.remove('is-flipped');
}

function transitionToNextCard() {
    isAnimating = true;
    cardWrapper.classList.add('exiting');

    setTimeout(() => {
        flipToBack();
        loadNextQuestion();
        cardWrapper.classList.remove('exiting');
        void cardWrapper.offsetWidth;
        cardWrapper.classList.add('entering');

        setTimeout(() => {
            cardWrapper.classList.remove('entering');
            isAnimating = false;
        }, 600);
    }, 500);
}

// Shuffle
function triggerShuffle() {
    if (isAnimating) return;
    isAnimating = true;

    shuffleBtn.classList.add('shuffling');
    setTimeout(() => shuffleBtn.classList.remove('shuffling'), 600);

    showToast("Baralho renovado!");
    cardWrapper.classList.add('exiting');

    setTimeout(() => {
        deck.shuffle();
        counterCurrent.textContent = '0';
        flipToBack();
        loadNextQuestion();

        cardWrapper.classList.remove('exiting');
        void cardWrapper.offsetWidth;
        cardWrapper.classList.add('entering');

        setTimeout(() => {
            cardWrapper.classList.remove('entering');
            isAnimating = false;
        }, 600);
    }, 500);
}

// Event Listeners (Game)
cardContainer.addEventListener('click', handleCardTap);
shuffleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerShuffle();
});

// ============================================
// APP INIT
// ============================================

(async function init() {
    // Load extras from server before creating deck
    await loadServerExtras();
    deck = new ConectadosDeck(getAllQuestions());

    const session = getSession();
    if (session) {
        // Show manual on every login
        showManual();
        // Prepare game behind
        loginScreen.classList.add('hidden');
    } else {
        showLoginScreen();
    }
})();
