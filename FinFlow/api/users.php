<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\UserService;
use FinFlow\Utils\Response;

setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];

$service = new UserService();
$service->setUserId($userId);

try {
    $action = $_GET['action'] ?? '';
    if ($action === 'export') {
        handleExport();
    } else {
        match ($_SERVER['REQUEST_METHOD']) {
            'PUT' => changePasswordOrProfile($service, $action),
            default => Response::error('Método não suportado', 405),
        };
    }
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function changePasswordOrProfile(UserService $service, string $action): void
{
    $input = jsonInput();

    if ($action === 'change_password') {
        $service->changePassword($input['currentPassword'] ?? '', $input['newPassword'] ?? '');
        Response::json(['ok' => true]);
    } else {
        // Assume profile update (name, photo)
        // Simplification: just pass input to updateProfile
        $service->updateProfile($input);
        Response::json(['ok' => true]);
    }
}

function handleExport(): void
{
    global $userId;
    $db = \FinFlow\Config\Database::getConnection();

    $data = [];
    $tables = ['accounts', 'credit_cards', 'categories', 'transactions', 'budget_goals'];

    foreach ($tables as $table) {
        $stmt = $db->prepare("SELECT * FROM $table WHERE user_id = ?");
        $stmt->execute([$userId]);
        $data[$table] = $stmt->fetchAll();
    }

    Response::json($data);
}

