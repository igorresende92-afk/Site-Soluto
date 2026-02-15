<?php
/**
 * FinFlow API - Credit Cards CRUD
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
$db = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET' => listCards(),
    'POST' => createCard(),
    'PUT' => updateCard(),
    'DELETE' => deleteCard(),
    default => errorResponse('Método não suportado', 405),
};

function listCards(): void
{
    global $db, $userId;
    $stmt = $db->prepare("SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);

    jsonResponse(array_map(function ($r) {
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'limit' => (float) $r['credit_limit'],
            'closingDay' => (int) $r['closing_day'],
            'dueDay' => (int) $r['due_day'],
            'color' => $r['color'],
            'createdAt' => $r['created_at'],
        ];
    }, $stmt->fetchAll()));
}

function createCard(): void
{
    global $db, $userId;
    $input = jsonInput();

    $stmt = $db->prepare(
        "INSERT INTO credit_cards (user_id, name, credit_limit, closing_day, due_day, color) VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $userId,
        $input['name'] ?? 'Cartão',
        $input['limit'] ?? 0,
        $input['closingDay'] ?? 1,
        $input['dueDay'] ?? 10,
        $input['color'] ?? '#7c3aed',
    ]);

    jsonResponse(['id' => (int) $db->lastInsertId()], 201);
}

function updateCard(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();

    $stmt = $db->prepare(
        "UPDATE credit_cards SET name=?, credit_limit=?, closing_day=?, due_day=?, color=? WHERE id=? AND user_id=?"
    );
    $stmt->execute([
        $input['name'] ?? 'Cartão',
        $input['limit'] ?? 0,
        $input['closingDay'] ?? 1,
        $input['dueDay'] ?? 10,
        $input['color'] ?? '#7c3aed',
        $id,
        $userId,
    ]);

    jsonResponse(['ok' => true]);
}

function deleteCard(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);

    $stmt = $db->prepare("DELETE FROM credit_cards WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    jsonResponse(['ok' => true]);
}
