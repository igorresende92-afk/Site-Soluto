<?php
/* ============================================
   Conectados Admin API
   Endpoints para gerenciar e-mails e perguntas
   Servidor LAMP (PHP 7.4+)
   ============================================ */

header('Content-Type: application/json; charset=utf-8');

// CORS (ajustar em produção se necessário)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================
// CONFIG
// ============================================

$ADMIN_EMAIL_HASH    = '264171cbd9fd365f55a7f91248b32683bc187e198cbbd08a312b59b972745ce9';
$ADMIN_PASSWORD_HASH = 'a35bc5bfeb7f7781b2c27b8855a3a42fdd0e898c0284cfb551622ee1d79d583c';
$EXTRAS_FILE         = __DIR__ . '/extras.json';
$DATA_JS_FILE        = dirname(__DIR__) . '/data.js';

// ============================================
// HELPERS
// ============================================

function respond($success, $data = null, $error = null, $httpCode = 200) {
    http_response_code($httpCode);
    $response = ['success' => $success];
    if ($data !== null) $response['data'] = $data;
    if ($error !== null) $response['error'] = $error;
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function verifyAuth($input) {
    global $ADMIN_EMAIL_HASH, $ADMIN_PASSWORD_HASH;

    $emailHash    = $input['auth']['email_hash'] ?? '';
    $passwordHash = $input['auth']['password_hash'] ?? '';

    return hash_equals($ADMIN_EMAIL_HASH, $emailHash)
        && hash_equals($ADMIN_PASSWORD_HASH, $passwordHash);
}

function loadExtras() {
    global $EXTRAS_FILE;

    if (!file_exists($EXTRAS_FILE)) {
        return ['extra_hashes' => [], 'extra_questions' => []];
    }

    $content = file_get_contents($EXTRAS_FILE);
    $data = json_decode($content, true);

    if (!$data) {
        return ['extra_hashes' => [], 'extra_questions' => []];
    }

    return [
        'extra_hashes'    => $data['extra_hashes'] ?? [],
        'extra_questions' => $data['extra_questions'] ?? [],
    ];
}

function saveExtras($data) {
    global $EXTRAS_FILE;

    $payload = [
        'extra_hashes'    => $data['extra_hashes'] ?? [],
        'extra_questions' => $data['extra_questions'] ?? [],
        'updated_at'      => date('Y-m-d H:i:s'),
    ];

    $result = file_put_contents(
        $EXTRAS_FILE,
        json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );

    return $result !== false;
}

// ============================================
// VALIDATION
// ============================================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, null, 'Método não permitido', 405);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['action'])) {
    respond(false, null, 'Requisição inválida', 400);
}

if (!verifyAuth($input)) {
    respond(false, null, 'Credenciais inválidas', 401);
}

// ============================================
// ACTIONS
// ============================================

$action = $input['action'];

switch ($action) {

    // --- Carregar extras do servidor ---
    case 'load_extras':
        $extras = loadExtras();
        respond(true, $extras);
        break;

    // --- Salvar extras no servidor ---
    case 'save_extras':
        $ok = saveExtras([
            'extra_hashes'    => $input['extra_hashes'] ?? [],
            'extra_questions' => $input['extra_questions'] ?? [],
        ]);
        respond($ok, null, $ok ? null : 'Erro ao salvar extras');
        break;

    // --- Salvar data.js permanentemente ---
    case 'save_datajs':
        $code = $input['code'] ?? '';

        if (empty($code)) {
            respond(false, null, 'Nenhum código fornecido', 400);
        }

        // Valida que o código contém as variáveis esperadas
        if (strpos($code, 'AUTHORIZED_HASHES') === false || strpos($code, 'QUESTIONS') === false) {
            respond(false, null, 'Código inválido: deve conter AUTHORIZED_HASHES e QUESTIONS', 400);
        }

        // Backup do data.js atual
        $backupFile = null;
        if (file_exists($DATA_JS_FILE)) {
            $backupFile = $DATA_JS_FILE . '.' . date('Ymd_His') . '.bak';
            copy($DATA_JS_FILE, $backupFile);
        }

        // Escreve o novo data.js
        $bytes = file_put_contents($DATA_JS_FILE, $code, LOCK_EX);

        if ($bytes === false) {
            respond(false, null, 'Erro ao escrever data.js. Verifique permissões do arquivo.');
        }

        // Limpa extras após salvar (os dados agora estão no data.js)
        saveExtras(['extra_hashes' => [], 'extra_questions' => []]);

        respond(true, [
            'bytes_written' => $bytes,
            'backup'        => $backupFile ? basename($backupFile) : null,
            'saved_at'      => date('Y-m-d H:i:s'),
        ]);
        break;

    default:
        respond(false, null, 'Ação desconhecida: ' . $action, 400);
}
