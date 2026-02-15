<?php
/**
 * FinFlow API - Authentication Endpoints
 * POST /api/auth.php?action=login
 * POST /api/auth.php?action=register
 * GET  /api/auth.php?action=me
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();

$action = $_GET['action'] ?? '';

match ($action) {
    'login'    => handleLogin(),
    'register' => handleRegister(),
    'me'       => handleMe(),
    default    => errorResponse('Ação inválida', 404),
};

function handleLogin(): void {
    $input = jsonInput();
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (!$email || !$password) errorResponse('E-mail e senha são obrigatórios');

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) errorResponse('E-mail não encontrado', 401);

    // Frontend sends SHA-256 hashed password
    if ($user['password_hash'] !== $password) {
        errorResponse('Senha incorreta', 401);
    }

    $token = createJWT([
        'user_id'    => $user['id'],
        'email'      => $user['email'],
        'is_admin'   => (bool) $user['is_admin'],
        'is_premium' => (bool) $user['is_premium'],
    ]);

    jsonResponse([
        'token' => $token,
        'user'  => formatUser($user),
    ]);
}

function handleRegister(): void {
    $input = jsonInput();
    $name     = trim($input['name'] ?? '');
    $email    = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? ''; // Already SHA-256 hashed from frontend

    if (!$name || !$email || !$password) {
        errorResponse('Nome, e-mail e senha são obrigatórios');
    }

    $db = getDB();

    // Check duplicate
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) errorResponse('Este e-mail já está cadastrado');

    $stmt = $db->prepare(
        "INSERT INTO users (name, email, password_hash, is_premium, is_admin) VALUES (?, ?, ?, 0, 0)"
    );
    $stmt->execute([$name, $email, $password]);
    $userId = (int) $db->lastInsertId();

    // Seed default categories for new user
    seedCategoriesForUser($db, $userId);

    $token = createJWT([
        'user_id'    => $userId,
        'email'      => $email,
        'is_admin'   => false,
        'is_premium' => false,
    ]);

    jsonResponse([
        'token' => $token,
        'user'  => [
            'id'         => $userId,
            'name'       => $name,
            'email'      => $email,
            'isPremium'  => false,
            'isAdmin'    => false,
            'createdAt'  => date('Y-m-d H:i:s'),
        ],
    ], 201);
}

function handleMe(): void {
    $auth = getAuthUser();
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();

    if (!$user) errorResponse('Usuário não encontrado', 404);

    jsonResponse(['user' => formatUser($user)]);
}

function formatUser(array $user): array {
    return [
        'id'         => (int) $user['id'],
        'name'       => $user['name'],
        'email'      => $user['email'],
        'photo'      => $user['photo'],
        'isPremium'  => (bool) $user['is_premium'],
        'isAdmin'    => (bool) $user['is_admin'],
        'createdAt'  => $user['created_at'],
    ];
}

function seedCategoriesForUser(PDO $db, int $userId): void {
    $categories = [
        ['Salário', 'Banknote', 'income', '#2ed573'],
        ['Freelance', 'Laptop', 'income', '#00f3ff'],
        ['Investimentos', 'TrendingUp', 'income', '#7c3aed'],
        ['Outros', 'Plus', 'income', '#64748b'],
        ['Alimentação', 'UtensilsCrossed', 'expense', '#ff6b6b'],
        ['Transporte', 'Car', 'expense', '#ffa502'],
        ['Moradia', 'Home', 'expense', '#1e90ff'],
        ['Saúde', 'Heart', 'expense', '#ff4757'],
        ['Educação', 'GraduationCap', 'expense', '#2ed573'],
        ['Lazer', 'Gamepad2', 'expense', '#ff00ff'],
        ['Assinaturas', 'CreditCard', 'expense', '#00f3ff'],
        ['Compras', 'ShoppingBag', 'expense', '#f472b6'],
        ['Outros', 'MoreHorizontal', 'expense', '#64748b'],
    ];
    $stmt = $db->prepare(
        "INSERT INTO categories (user_id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)"
    );
    foreach ($categories as $cat) {
        $stmt->execute([$userId, ...$cat]);
    }
}
