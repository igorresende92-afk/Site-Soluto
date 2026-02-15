<?php
/**
 * FinFlow API - User Profile
 * PUT /api/users.php?action=update_name
 * PUT /api/users.php?action=update_photo
 * PUT /api/users.php?action=change_password
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';

match ($action) {
    'update_name' => updateName(),
    'update_photo' => updatePhoto(),
    'change_password' => changePassword(),
    'export' => exportData(),
    default => errorResponse('Ação inválida', 404),
};

function updateName(): void
{
    global $db, $userId;
    $input = jsonInput();
    $name = trim($input['name'] ?? '');
    if (!$name)
        errorResponse('Nome é obrigatório');

    $stmt = $db->prepare("UPDATE users SET name = ? WHERE id = ?");
    $stmt->execute([$name, $userId]);

    jsonResponse(['ok' => true]);
}

function updatePhoto(): void
{
    global $db, $userId;
    $input = jsonInput();

    $stmt = $db->prepare("UPDATE users SET photo = ? WHERE id = ?");
    $stmt->execute([$input['photo'] ?? null, $userId]);

    jsonResponse(['ok' => true]);
}

function changePassword(): void
{
    global $db, $userId;
    $input = jsonInput();
    $currentHash = $input['currentPassword'] ?? '';
    $newHash = $input['newPassword'] ?? '';

    if (!$currentHash || !$newHash)
        errorResponse('Senhas são obrigatórias');

    // Validate current password
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if ($user['password_hash'] !== $currentHash) {
        errorResponse('Senha atual incorreta', 401);
    }

    $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->execute([$newHash, $userId]);

    jsonResponse(['ok' => true]);
}

function exportData(): void
{
    global $db, $userId;

    $data = [];
    $tables = ['accounts', 'credit_cards', 'categories', 'transactions', 'budget_goals'];

    foreach ($tables as $table) {
        $stmt = $db->prepare("SELECT * FROM $table WHERE user_id = ?");
        $stmt->execute([$userId]);
        $data[$table] = $stmt->fetchAll();
    }

    jsonResponse($data);
}
