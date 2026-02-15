<?php
/**
 * FinFlow API - Categories CRUD
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
$db = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET' => listCategories(),
    'POST' => createCategory(),
    'PUT' => updateCategory(),
    'DELETE' => deleteCategory(),
    default => errorResponse('Método não suportado', 405),
};

function listCategories(): void
{
    global $db, $userId;
    $stmt = $db->prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY type, name");
    $stmt->execute([$userId]);

    jsonResponse(array_map(function ($r) {
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'icon' => $r['icon'],
            'type' => $r['type'],
            'color' => $r['color'],
        ];
    }, $stmt->fetchAll()));
}

function createCategory(): void
{
    global $db, $userId;
    $input = jsonInput();

    $stmt = $db->prepare(
        "INSERT INTO categories (user_id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $userId,
        $input['name'] ?? 'Categoria',
        $input['icon'] ?? 'MoreHorizontal',
        $input['type'] ?? 'expense',
        $input['color'] ?? '#64748b',
    ]);

    jsonResponse(['id' => (int) $db->lastInsertId()], 201);
}

function updateCategory(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();

    $stmt = $db->prepare(
        "UPDATE categories SET name=?, icon=?, type=?, color=? WHERE id=? AND user_id=?"
    );
    $stmt->execute([
        $input['name'] ?? 'Categoria',
        $input['icon'] ?? 'MoreHorizontal',
        $input['type'] ?? 'expense',
        $input['color'] ?? '#64748b',
        $id,
        $userId,
    ]);

    jsonResponse(['ok' => true]);
}

function deleteCategory(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);

    $stmt = $db->prepare("DELETE FROM categories WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    jsonResponse(['ok' => true]);
}
