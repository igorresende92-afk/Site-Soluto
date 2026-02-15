<?php
require_once __DIR__ . '/config.php';

$user = requireAuth();
if (!$user['is_admin']) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'users':
        if ($method !== 'GET') {
            http_response_code(405);
            exit;
        }
        $stmt = $pdo->query("SELECT id, name, email, photo, is_premium, is_admin, created_at FROM users ORDER BY id");
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
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $isPremium = !empty($data['isPremium']);
        $isAdmin = !empty($data['isAdmin']);

        if (!$name || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome, email e senha são obrigatórios']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, is_premium, is_admin, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$name, $email, $password, $isPremium ? 1 : 0, $isAdmin ? 1 : 0]);
        echo json_encode(['id' => (int) $pdo->lastInsertId()]);
        break;

    case 'update_user':
        if ($method !== 'PUT') {
            http_response_code(405);
            exit;
        }
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID obrigatório']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $fields = [];
        $params = [];

        if (isset($data['name'])) {
            $fields[] = 'name = ?';
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $fields[] = 'email = ?';
            $params[] = $data['email'];
        }
        if (!empty($data['password'])) {
            $fields[] = 'password = ?';
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
            echo json_encode(['ok' => true]);
            exit;
        }

        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);
        echo json_encode(['ok' => true]);
        break;

    case 'delete_user':
        if ($method !== 'DELETE') {
            http_response_code(405);
            exit;
        }
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID obrigatório']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida']);
}
