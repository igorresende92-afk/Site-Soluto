<?php
/**
 * FinFlow API - Accounts CRUD
 * GET    /api/accounts.php         - List user accounts
 * POST   /api/accounts.php         - Create account
 * PUT    /api/accounts.php?id=X    - Update account
 * DELETE /api/accounts.php?id=X    - Delete account
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
$db = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET' => listAccounts(),
    'POST' => createAccount(),
    'PUT' => updateAccount(),
    'DELETE' => deleteAccount(),
    default => errorResponse('Método não suportado', 405),
};

function listAccounts(): void
{
    global $db, $userId;
    $stmt = $db->prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    jsonResponse(array_map(function ($r) {
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'type' => $r['type'],
            'balance' => (float) $r['balance'],
            'color' => $r['color'],
            'icon' => $r['icon'],
            'createdAt' => $r['created_at'],
        ];
    }, $rows));
}

function createAccount(): void
{
    global $db, $userId;
    $input = jsonInput();

    $stmt = $db->prepare(
        "INSERT INTO accounts (user_id, name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $userId,
        $input['name'] ?? 'Conta',
        $input['type'] ?? 'checking',
        $input['balance'] ?? 0,
        $input['color'] ?? '#00f3ff',
        $input['icon'] ?? 'Wallet',
    ]);

    jsonResponse(['id' => (int) $db->lastInsertId()], 201);
}

function updateAccount(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();

    $stmt = $db->prepare(
        "UPDATE accounts SET name=?, type=?, balance=?, color=?, icon=? WHERE id=? AND user_id=?"
    );
    $stmt->execute([
        $input['name'] ?? 'Conta',
        $input['type'] ?? 'checking',
        $input['balance'] ?? 0,
        $input['color'] ?? '#00f3ff',
        $input['icon'] ?? 'Wallet',
        $id,
        $userId,
    ]);

    jsonResponse(['ok' => true]);
}

function deleteAccount(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);

    $stmt = $db->prepare("DELETE FROM accounts WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    jsonResponse(['ok' => true]);
}
