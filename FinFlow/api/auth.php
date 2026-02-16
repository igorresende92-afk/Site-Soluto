<?php

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\AuthService;
use FinFlow\Utils\Response;

setCorsHeaders(); // Keeps existing CORS logic for now

$action = $_GET['action'] ?? '';
$service = new AuthService();

try {
    match ($action) {
        'login' => handleLogin($service),
        'register' => handleRegister($service),
        'me' => handleMe(), // Keep existing handleMe for now or refactor
        default => Response::error('Ação inválida', 404),
    };
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function handleLogin(AuthService $service): void
{
    $input = jsonInput();
    $user = $service->login($input['email'] ?? '', $input['password'] ?? '');

    $token = createJWT([ // Keep createJWT from config.php for now
        'user_id' => $user['id'],
        'email' => $user['email'],
        'is_admin' => (bool) $user['is_admin'],
        'is_premium' => (bool) $user['is_premium'],
    ]);

    Response::json([
        'token' => $token,
        'user' => formatUser($user),
    ]);
}

function handleRegister(AuthService $service): void
{
    $input = jsonInput();
    $userId = $service->register($input['name'] ?? '', $input['email'] ?? '', $input['password'] ?? '');

    $token = createJWT([
        'user_id' => $userId,
        'email' => strtolower(trim($input['email'] ?? '')),
        'is_admin' => false,
        'is_premium' => false,
    ]);

    Response::json([
        'token' => $token,
        'user' => [
            'id' => $userId,
            'name' => trim($input['name'] ?? ''),
            'email' => strtolower(trim($input['email'] ?? '')),
            'isPremium' => false,
            'isAdmin' => false,
            'createdAt' => date('Y-m-d H:i:s'),
        ],
    ], 201);
}


function handleMe(): void
{
    $auth = getAuthUser();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();

    if (!$user)
        errorResponse('Usuário não encontrado', 404);

    jsonResponse(['user' => formatUser($user)]);
}

function formatUser(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'photo' => $user['photo'],
        'isPremium' => (bool) $user['is_premium'],
        'isAdmin' => (bool) $user['is_admin'],
        'createdAt' => $user['created_at'],
    ];
}


