/* ============================================
   Conectados Admin - Logic
   Auth + Server-side persistence via PHP API
   ============================================ */

// ============================================
// ADMIN AUTH
// ============================================

const ADMIN_EMAIL_HASH = '264171cbd9fd365f55a7f91248b32683bc187e198cbbd08a312b59b972745ce9';
const ADMIN_PASSWORD_HASH = 'a35bc5bfeb7f7781b2c27b8855a3a42fdd0e898c0284cfb551622ee1d79d583c';
const ADMIN_SESSION_KEY = 'conectados_admin_session';
const API_URL = '../api/api.php';

// Auth hashes for API calls (set after login)
let authEmailHash = null;
let authPasswordHash = null;

// In-memory cache (synced with server)
let cachedExtraHashes = [];
let cachedExtraQuestions = [];

async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getAdminSession() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

function setAdminSession() {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        email_hash: authEmailHash,
        password_hash: authPasswordHash,
        timestamp: Date.now(),
    }));
}

function loadAdminSession() {
    try {
        const session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY));
        if (session && session.email_hash && session.password_hash) {
            authEmailHash = session.email_hash;
            authPasswordHash = session.password_hash;
            return true;
        }
    } catch { }
    return false;
}

function clearAdminSession() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    authEmailHash = null;
    authPasswordHash = null;
}

async function validateAdminCredentials(email, password) {
    const emailHash = await hashString(email.trim().toLowerCase());
    const passwordHash = await hashString(password);

    if (emailHash === ADMIN_EMAIL_HASH && passwordHash === ADMIN_PASSWORD_HASH) {
        authEmailHash = emailHash;
        authPasswordHash = passwordHash;
        return true;
    }
    return false;
}

// ============================================
// SERVER API
// ============================================

async function apiCall(action, extraData = {}) {
    const body = {
        action,
        auth: {
            email_hash: authEmailHash,
            password_hash: authPasswordHash,
        },
        ...extraData,
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok && response.status === 401) {
            clearAdminSession();
            showLoginScreen();
            showToast('⚠️ Sessão expirada. Faça login novamente.');
            return null;
        }

        return result;
    } catch (err) {
        console.error('API Error:', err);
        showToast('⚠️ Erro de conexão com o servidor.');
        return null;
    }
}

async function loadExtrasFromServer() {
    const result = await apiCall('load_extras');
    if (result && result.success) {
        cachedExtraHashes = result.data.extra_hashes || [];
        cachedExtraQuestions = result.data.extra_questions || [];
        return true;
    }
    return false;
}

async function saveExtrasToServer() {
    const result = await apiCall('save_extras', {
        extra_hashes: cachedExtraHashes,
        extra_questions: cachedExtraQuestions,
    });
    return result && result.success;
}

// ============================================
// SHA-256 UTILITY (for email hashing)
// ============================================

async function hashEmail(email) {
    const normalized = email.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// DATA HELPERS (use in-memory cache)
// ============================================

function getExtraHashes() {
    return cachedExtraHashes;
}

function getExtraQuestions() {
    return cachedExtraQuestions;
}

function getAllHashes() {
    return [...AUTHORIZED_HASHES, ...cachedExtraHashes.map(e => e.hash)];
}

function getAllQuestions() {
    return [...QUESTIONS, ...cachedExtraQuestions];
}

// ============================================
// LOGIN UI
// ============================================

const adminLoginScreen = document.getElementById('admin-login');
const adminPanel = document.getElementById('admin-panel');
const adminLoginForm = document.getElementById('admin-login-form');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginError = document.getElementById('admin-login-error');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLoginBtnText = document.querySelector('.admin-login-btn-text');
const adminLoginBtnLoading = document.querySelector('.admin-login-btn-loading');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

function showAdminPanel() {
    adminLoginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    initAdminPanel();
}

function showLoginScreen() {
    adminLoginScreen.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;
    if (!email || !password) return;

    adminLoginBtn.disabled = true;
    adminLoginBtnText.classList.add('hidden');
    adminLoginBtnLoading.classList.remove('hidden');
    adminLoginError.classList.add('hidden');

    await new Promise(r => setTimeout(r, 400));

    const isValid = await validateAdminCredentials(email, password);

    if (isValid) {
        setAdminSession();
        showAdminPanel();
    } else {
        adminLoginError.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }

    adminLoginBtn.disabled = false;
    adminLoginBtnText.classList.remove('hidden');
    adminLoginBtnLoading.classList.add('hidden');
});

adminLogoutBtn.addEventListener('click', () => {
    clearAdminSession();
    showLoginScreen();
    adminLoginForm.reset();
    adminLoginError.classList.add('hidden');
});

// Check existing session on load
if (loadAdminSession()) {
    showAdminPanel();
} else {
    showLoginScreen();
}

// ============================================
// DOM ELEMENTS (Admin Panel)
// ============================================

const tabEmails = document.getElementById('tab-emails');
const tabQuestions = document.getElementById('tab-questions');
const panelEmails = document.getElementById('panel-emails');
const panelQuestions = document.getElementById('panel-questions');

const emailInput = document.getElementById('input-email');
const addEmailBtn = document.getElementById('btn-add-email');
const emailList = document.getElementById('email-list');
const emailCountTab = document.getElementById('email-count');
const emailCountStat = document.getElementById('stat-emails');

const questionInput = document.getElementById('input-question');
const addQuestionBtn = document.getElementById('btn-add-question');
const questionList = document.getElementById('question-list');
const questionCountTab = document.getElementById('question-count');
const questionCountStat = document.getElementById('stat-questions');
const newQuestionCountStat = document.getElementById('stat-new-questions');

const exportBtn = document.getElementById('btn-export');
const exportModal = document.getElementById('export-modal');
const exportClose = document.getElementById('export-close');
const exportCode = document.getElementById('export-code');
const exportCopy = document.getElementById('export-copy');

const saveFileBtn = document.getElementById('btn-save-file');
const saveStatus = document.getElementById('save-status');

const toastEl = document.getElementById('admin-toast');
let toastTimeout;

// ============================================
// TOAST
// ============================================

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('visible'), 2800);
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tab) {
    tabEmails.classList.toggle('active', tab === 'emails');
    tabQuestions.classList.toggle('active', tab === 'questions');
    panelEmails.classList.toggle('active', tab === 'emails');
    panelQuestions.classList.toggle('active', tab === 'questions');
}

tabEmails.addEventListener('click', () => switchTab('emails'));
tabQuestions.addEventListener('click', () => switchTab('questions'));

// ============================================
// EMAIL MANAGEMENT
// ============================================

function renderEmails() {
    const extras = getExtraHashes();
    const totalCount = AUTHORIZED_HASHES.length + extras.length;

    emailCountTab.textContent = totalCount;
    emailCountStat.textContent = totalCount;

    let html = '';

    // Original hashes
    AUTHORIZED_HASHES.forEach((hash, i) => {
        const comment = getOriginalEmailComment(i);
        html += `
        <div class="list-item">
            <div class="item-number">${i + 1}</div>
            <div class="item-content">
                <div class="item-label">${comment || 'E-mail original'}</div>
                <div class="item-meta">${hash.substring(0, 16)}...${hash.substring(hash.length - 8)}</div>
            </div>
            <span class="item-badge badge-original">Original</span>
        </div>`;
    });

    // Extra hashes (from admin)
    extras.forEach((entry, i) => {
        const idx = AUTHORIZED_HASHES.length + i;
        html += `
        <div class="list-item">
            <div class="item-number">${idx + 1}</div>
            <div class="item-content">
                <div class="item-label">${entry.email}</div>
                <div class="item-meta">${entry.hash.substring(0, 16)}...${entry.hash.substring(entry.hash.length - 8)}</div>
            </div>
            <span class="item-badge badge-new">Novo</span>
            <div class="item-actions">
                <button class="btn-remove" onclick="removeEmail(${i})" title="Remover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>`;
    });

    if (totalCount === 0) {
        html = `<div class="list-empty"><div class="empty-icon">📧</div>Nenhum e-mail cadastrado</div>`;
    }

    emailList.innerHTML = html;
}

function getOriginalEmailComment(index) {
    const comments = [
        'igor.resende92@hotmail.com',
        'danisouzaesilva@gmail.com',
    ];
    return comments[index] || null;
}

async function addEmail() {
    const email = emailInput.value.trim();
    if (!email) return;

    if (!email.includes('@') || !email.includes('.')) {
        showToast('⚠️ E-mail inválido');
        return;
    }

    const hash = await hashEmail(email);
    const allHashes = getAllHashes();

    if (allHashes.includes(hash)) {
        showToast('⚠️ E-mail já cadastrado');
        return;
    }

    cachedExtraHashes.push({ email, hash, addedAt: new Date().toISOString() });

    // Sync to server
    const saved = await saveExtrasToServer();
    if (!saved) {
        cachedExtraHashes.pop(); // rollback
        showToast('⚠️ Erro ao salvar no servidor');
        return;
    }

    emailInput.value = '';
    renderEmails();
    showToast('✅ E-mail adicionado e salvo no servidor!');
}

async function removeEmail(index) {
    const removed = cachedExtraHashes.splice(index, 1);

    const saved = await saveExtrasToServer();
    if (!saved) {
        cachedExtraHashes.splice(index, 0, ...removed); // rollback
        showToast('⚠️ Erro ao salvar no servidor');
        return;
    }

    renderEmails();
    showToast('🗑️ E-mail removido');
}

addEmailBtn.addEventListener('click', addEmail);
emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addEmail(); }
});

// ============================================
// QUESTION MANAGEMENT
// ============================================

function renderQuestions() {
    const extras = getExtraQuestions();
    const totalCount = QUESTIONS.length + extras.length;

    questionCountTab.textContent = totalCount;
    questionCountStat.textContent = totalCount;
    newQuestionCountStat.textContent = extras.length;

    let html = '';

    // Original questions
    QUESTIONS.forEach((q) => {
        html += `
        <div class="list-item">
            <div class="item-number">#${q.id}</div>
            <div class="item-content">
                <div class="item-label">${q.text}</div>
            </div>
            <span class="item-badge badge-original">Original</span>
        </div>`;
    });

    // Extra questions
    extras.forEach((q, i) => {
        html += `
        <div class="list-item">
            <div class="item-number">#${q.id}</div>
            <div class="item-content">
                <div class="item-label">${q.text}</div>
            </div>
            <span class="item-badge badge-new">Nova</span>
            <div class="item-actions">
                <button class="btn-remove" onclick="removeQuestion(${i})" title="Remover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>`;
    });

    if (totalCount === 0) {
        html = `<div class="list-empty"><div class="empty-icon">🃏</div>Nenhuma pergunta cadastrada</div>`;
    }

    questionList.innerHTML = html;
}

async function addQuestion() {
    const text = questionInput.value.trim();
    if (!text) return;

    if (text.length < 10) {
        showToast('⚠️ Pergunta muito curta (mínimo 10 caracteres)');
        return;
    }

    const all = getAllQuestions();
    const nextId = all.length > 0 ? Math.max(...all.map(q => q.id)) + 1 : 1;

    cachedExtraQuestions.push({ id: nextId, text, addedAt: new Date().toISOString() });

    const saved = await saveExtrasToServer();
    if (!saved) {
        cachedExtraQuestions.pop(); // rollback
        showToast('⚠️ Erro ao salvar no servidor');
        return;
    }

    questionInput.value = '';
    renderQuestions();
    showToast('✅ Pergunta adicionada e salva no servidor!');
}

async function removeQuestion(index) {
    const removed = cachedExtraQuestions.splice(index, 1);

    const saved = await saveExtrasToServer();
    if (!saved) {
        cachedExtraQuestions.splice(index, 0, ...removed); // rollback
        showToast('⚠️ Erro ao salvar no servidor');
        return;
    }

    renderQuestions();
    showToast('🗑️ Pergunta removida');
}

addQuestionBtn.addEventListener('click', addQuestion);
questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addQuestion(); }
});

// ============================================
// EXPORT / SAVE FUNCTIONALITY
// ============================================

function generateExportCode() {
    const extraHashEntries = getExtraHashes();
    const allQuestions = getAllQuestions();

    let code = `/* ============================================\n`;
    code += `   Conectados - Data Store\n`;
    code += `   Atualizado em: ${new Date().toLocaleString('pt-BR')}\n`;
    code += `   ============================================ */\n\n`;

    code += `const AUTHORIZED_HASHES = [\n`;
    AUTHORIZED_HASHES.forEach((hash, i) => {
        const comment = getOriginalEmailComment(i);
        code += `    '${hash}',${comment ? ` // ${comment}` : ''}\n`;
    });
    extraHashEntries.forEach(entry => {
        code += `    '${entry.hash}', // ${entry.email}\n`;
    });
    code += `];\n\n`;

    code += `const QUESTIONS = [\n`;
    allQuestions.forEach(q => {
        const escaped = q.text.replace(/"/g, '\\"');
        code += `    { id: ${q.id}, text: "${escaped}" },\n`;
    });
    code += `];\n`;

    return code;
}

// --- Save to server (writes data.js on disk) ---

async function saveDataJsToServer() {
    const code = generateExportCode();

    saveFileBtn.classList.add('saving');
    saveStatus.textContent = '💾 Salvando no servidor...';
    saveStatus.className = 'save-status';

    const result = await apiCall('save_datajs', { code });

    if (result && result.success) {
        // Limpa o cache local (dados agora estão no data.js)
        cachedExtraHashes = [];
        cachedExtraQuestions = [];

        saveStatus.textContent = `✅ data.js salvo! (${result.data.bytes_written} bytes) — Backup: ${result.data.backup || 'N/A'}`;
        saveStatus.className = 'save-status success';
        showToast('💾 data.js salvo permanentemente no servidor!');

        // Re-render para refletir que extras foram incorporados
        renderEmails();
        renderQuestions();
    } else {
        const errorMsg = result?.error || 'Erro desconhecido';
        saveStatus.textContent = `❌ Erro: ${errorMsg}`;
        saveStatus.className = 'save-status error';
        showToast('⚠️ Falha ao salvar data.js no servidor');
    }

    saveFileBtn.classList.remove('saving');
}

// --- Save Button Handler ---

saveFileBtn.addEventListener('click', () => {
    const hasExtras = cachedExtraHashes.length > 0 || cachedExtraQuestions.length > 0;

    if (!hasExtras) {
        showToast('ℹ️ Nenhuma alteração para salvar.');
        return;
    }

    saveDataJsToServer();
});

// --- Export Modal ---

function openExportModal() {
    exportCode.textContent = generateExportCode();
    exportModal.classList.add('visible');
}

function closeExportModal() {
    exportModal.classList.remove('visible');
}

async function copyExportCode() {
    try {
        await navigator.clipboard.writeText(exportCode.textContent);
        showToast('📋 Código copiado!');
    } catch {
        exportCode.select?.();
        showToast('⚠️ Copie manualmente (Ctrl+C)');
    }
}

exportBtn.addEventListener('click', openExportModal);
exportClose.addEventListener('click', closeExportModal);
exportCopy.addEventListener('click', copyExportCode);
exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) closeExportModal();
});

// ============================================
// INIT (called after successful login)
// ============================================

let adminInitialized = false;

async function initAdminPanel() {
    if (adminInitialized) return;
    adminInitialized = true;

    // Load extras from server
    saveStatus.textContent = '⏳ Carregando dados do servidor...';
    saveStatus.className = 'save-status';

    const loaded = await loadExtrasFromServer();

    if (loaded) {
        saveStatus.textContent = '🟢 Conectado ao servidor — alterações são salvas automaticamente.';
        saveStatus.className = 'save-status success';
    } else {
        saveStatus.textContent = '⚠️ Não foi possível carregar dados do servidor.';
        saveStatus.className = 'save-status error';
    }

    renderEmails();
    renderQuestions();
}
