<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\UserService;
use FinFlow\Services\CategoryService;
use FinFlow\Utils\Response;

setCorsHeaders();

$auth = getAuthUser();
if (!$auth['is_admin']) {
    Response::error('Acesso negado', 403);
}

$userService = new UserService();
$userService->setUserId($auth['user_id']);

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'users':
            if ($method !== 'GET')
                Response::error('Método não suportado', 405);
            Response::json($userService->listAll());
            break;

        case 'create_user':
            if ($method !== 'POST')
                Response::error('Método não suportado', 405);
            $data = jsonInput();
            $userId = $userService->adminCreateUser($data);

            // Seed default categories
            $categoryService = new CategoryService();
            $categoryService->setUserId($userId);
            $categoryService->seedDefaults();

            Response::json(['id' => $userId], 201);
            break;

        case 'update_user':
            if ($method !== 'PUT')
                Response::error('Método não suportado', 405);
            $id = (int) ($_GET['id'] ?? 0);
            $userService->adminUpdateUser($id, jsonInput());
            Response::json(['ok' => true]);
            break;

        case 'delete_user':
            if ($method !== 'DELETE')
                Response::error('Método não suportado', 405);
            $id = (int) ($_GET['id'] ?? 0);
            if ($id === $auth['user_id'])
                Response::error('Você não pode excluir seu próprio usuário');

            $userService->adminDeleteUser($id);
            Response::json(['ok' => true]);
            break;

        default:
            Response::error('Ação inválida', 404);
    }
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}



