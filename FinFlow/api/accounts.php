<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\AccountService;
use FinFlow\Utils\Response;

setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];

$service = new AccountService();
$service->setUserId($userId);

try {
    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => listAccounts($service),
        'POST' => createAccount($service),
        'PUT' => updateAccount($service),
        'DELETE' => deleteAccount($service),
        default => Response::error('Método não suportado', 405),
    };
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function listAccounts(AccountService $service): void
{
    Response::json($service->list());
}

function createAccount(AccountService $service): void
{
    $input = jsonInput();
    $id = $service->create($input);
    Response::json(['id' => $id], 201);
}

function updateAccount(AccountService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();
    $service->update($id, $input);
    Response::json(['ok' => true]);
}

function deleteAccount(AccountService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $service->delete($id);
    Response::json(['ok' => true]);
}

