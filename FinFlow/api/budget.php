<?php
/**
 * FinFlow API - Budget Goals CRUD
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
$db = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET' => listGoals(),
    'POST' => createGoal(),
    'PUT' => updateGoal(),
    'DELETE' => deleteGoal(),
    default => errorResponse('Método não suportado', 405),
};

function listGoals(): void
{
    global $db, $userId;
    $stmt = $db->prepare("SELECT * FROM budget_goals WHERE user_id = ? ORDER BY month DESC");
    $stmt->execute([$userId]);

    jsonResponse(array_map(function ($r) {
        return [
            'id' => (int) $r['id'],
            'categoryId' => (int) $r['category_id'],
            'month' => $r['month'],
            'limitAmount' => (float) $r['limit_amount'],
        ];
    }, $stmt->fetchAll()));
}

function createGoal(): void
{
    global $db, $userId;
    $input = jsonInput();

    $stmt = $db->prepare(
        "INSERT INTO budget_goals (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)"
    );
    $stmt->execute([
        $userId,
        $input['categoryId'] ?? 0,
        $input['month'] ?? date('Y-m'),
        $input['limitAmount'] ?? 0,
    ]);

    jsonResponse(['id' => (int) $db->lastInsertId()], 201);
}

function updateGoal(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();

    $stmt = $db->prepare(
        "UPDATE budget_goals SET category_id=?, month=?, limit_amount=? WHERE id=? AND user_id=?"
    );
    $stmt->execute([
        $input['categoryId'] ?? 0,
        $input['month'] ?? date('Y-m'),
        $input['limitAmount'] ?? 0,
        $id,
        $userId,
    ]);

    jsonResponse(['ok' => true]);
}

function deleteGoal(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);

    $stmt = $db->prepare("DELETE FROM budget_goals WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    jsonResponse(['ok' => true]);
}
