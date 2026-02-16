<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\CategoryService;
use FinFlow\Utils\Response;

setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];

$service = new CategoryService();
$service->setUserId($userId);

try {
    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => listCategories($service),
        'POST' => createCategoryOrAction($service),
        'PUT' => updateCategory($service),
        'DELETE' => deleteCategory($service),
        default => Response::error('Método não suportado', 405),
    };
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function createCategoryOrAction(CategoryService $service): void
{
    $action = $_GET['action'] ?? '';
    if ($action === 'defaults') {
        $service->seedDefaults();
        Response::json(['ok' => true, 'message' => 'Categorias padrão geradas com sucesso']);
    } else {
        $input = jsonInput();
        $id = $service->create($input);
        Response::json(['id' => $id], 201);
    }
}

function listCategories(CategoryService $service): void
{
    Response::json($service->list());
}

function updateCategory(CategoryService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();
    $service->update($id, $input);
    Response::json(['ok' => true]);
}

function deleteCategory(CategoryService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $service->delete($id);
    Response::json(['ok' => true]);
}



