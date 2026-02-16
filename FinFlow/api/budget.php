<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\BudgetService;
use FinFlow\Utils\Response;

setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];

$service = new BudgetService();
$service->setUserId($userId);

try {
    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => listGoals($service),
        'POST' => createGoal($service),
        'PUT' => updateGoal($service),
        'DELETE' => deleteGoal($service),
        default => Response::error('Método não suportado', 405),
    };
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function listGoals(BudgetService $service): void
{
    Response::json($service->list());
}

function createGoal(BudgetService $service): void
{
    $input = jsonInput();
    $id = $service->create($input);
    Response::json(['id' => $id], 201);
}

function updateGoal(BudgetService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();
    $service->update($id, $input);
    Response::json(['ok' => true]);
}

function deleteGoal(BudgetService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $service->delete($id);
    Response::json(['ok' => true]);
}

