<?php
/**
 * FinFlow API - Admin Endpoints
 * GET    /api/admin.php?action=users          → List all users
 * POST   /api/admin.php?action=create_user    → Create user
 * PUT    /api/admin.php?action=update_user&id= → Update user
 * DELETE /api/admin.php?action=delete_user&id= → Delete user
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();

$user = getAuthUser();
if (!$user['is_admin']) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado']);
    exit;
}

$db = getDB();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'users':
        if ($method !== 'GET') {
            http_response_code(405);
            exit;
        }
        $stmt = $db->query("SELECT id, name, email, photo, is_premium, is_admin, created_at FROM users ORDER BY id");
        $rows = $stmt->fetchAll();
        $result = array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'email' => $r['email'],
                'photo' => $r['photo'],
                'isPremium' => (bool) $r['is_premium'],
                'isAdmin' => (bool) $r['is_admin'],
                'createdAt' => $r['created_at'],
            ];
        }, $rows);
        echo json_encode($result);
        break;

    case 'create_user':
        if ($method !== 'POST') {
            http_response_code(405);
            exit;
        }
        $data = jsonInput();
        $name = trim($data['name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $password = $data['password'] ?? '';
        $isPremium = !empty($data['isPremium']);
        $isAdmin = !empty($data['isAdmin']);

        if (!$name || !$email || !$password) {
            errorResponse('Nome, email e senha são obrigatórios');
        }

        // Check duplicate email
        $check = $db->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            errorResponse('Este e-mail já está cadastrado');
        }

        $stmt = $db->prepare("INSERT INTO users (name, email, password_hash, is_premium, is_admin, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$name, $email, $password, $isPremium ? 1 : 0, $isAdmin ? 1 : 0]);

        $userId = (int) $db->lastInsertId();

        // Seed default categories for the new user
        seedCategoriesForUser($db, $userId);

        jsonResponse(['id' => $userId], 201);
        break;

    case 'update_user':
        if ($method !== 'PUT') {
            http_response_code(405);
            exit;
        }
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            errorResponse('ID obrigatório');
        }

        $data = jsonInput();
        $fields = [];
        $params = [];

        if (isset($data['name'])) {
            $fields[] = 'name = ?';
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $fields[] = 'email = ?';
            $params[] = strtolower(trim($data['email']));
        }
        if (!empty($data['password'])) {
            $fields[] = 'password_hash = ?';
            $params[] = $data['password'];
        }
        if (isset($data['isPremium'])) {
            $fields[] = 'is_premium = ?';
            $params[] = $data['isPremium'] ? 1 : 0;
        }
        if (isset($data['isAdmin'])) {
            $fields[] = 'is_admin = ?';
            $params[] = $data['isAdmin'] ? 1 : 0;
        }

        if (empty($fields)) {
            jsonResponse(['ok' => true]);
        }

        $params[] = $id;
        $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);
        jsonResponse(['ok' => true]);
        break;

    case 'delete_user':
        if ($method !== 'DELETE') {
            http_response_code(405);
            exit;
        }
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            errorResponse('ID obrigatório');
        }

        // Prevent deleting yourself
        if ($id === $user['user_id']) {
            errorResponse('Você não pode excluir seu próprio usuário');
        }

        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['ok' => true]);
        break;

    default:
        errorResponse('Ação inválida', 404);
}

function seedCategoriesForUser(PDO $db, int $userId): void
{
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
    $stmt = $db->prepare("INSERT INTO categories (user_id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)");
    foreach ($categories as $cat) {
        $stmt->execute([$userId, ...$cat]);
    }
}
