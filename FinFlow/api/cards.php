<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\CardService;
use FinFlow\Utils\Response;

setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];

$service = new CardService();
$service->setUserId($userId);

try {
    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => listCards($service),
        'POST' => createCard($service),
        'PUT' => updateCard($service),
        'DELETE' => deleteCard($service),
        default => Response::error('Método não suportado', 405),
    };
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function listCards(CardService $service): void
{
    Response::json($service->list());
}

function createCard(CardService $service): void
{
    $id = $service->create(jsonInput());
    Response::json(['id' => $id], 201);
}

function updateCard(CardService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $service->update($id, jsonInput());
    Response::json(['ok' => true]);
}

function deleteCard(CardService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $service->delete($id);
    Response::json(['ok' => true]);
}

