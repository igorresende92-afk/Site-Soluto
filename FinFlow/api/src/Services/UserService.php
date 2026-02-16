<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;

class UserService extends Service
{
    private int $userId;

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    public function listAll(): array
    {
        $stmt = $this->db->query("SELECT id, name, email, photo, is_premium, is_admin, created_at FROM users ORDER BY id");
        return array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'email' => $r['email'],
                'photo' => $r['photo'],
                'isPremium' => (bool) $r['is_premium'],
                'isAdmin' => (bool) $r['is_admin'],
                'createdAt' => $r['created_at'],
            ];
        }, $stmt->fetchAll());
    }

    public function adminCreateUser(array $data): int
    {
        $name = trim($data['name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $password = $data['password'] ?? '';
        $isPremium = !empty($data['isPremium']) ? 1 : 0;
        $isAdmin = !empty($data['isAdmin']) ? 1 : 0;

        if (!$name || !$email || !$password) {
            Response::error('Nome, email e senha são obrigatórios');
        }

        $check = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            Response::error('Este e-mail já está cadastrado');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO users (name, email, password_hash, is_premium, is_admin) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hash, $isPremium, $isAdmin]);

        return (int) $this->db->lastInsertId();
    }

    public function adminUpdateUser(int $id, array $data): void
    {
        $fields = [];
        $params = [];

        if (isset($data['name'])) {
            $fields[] = 'name = ?';
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $email = strtolower(trim($data['email']));
            // Check duplicate email
            $check = $this->db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $check->execute([$email, $id]);
            if ($check->fetch()) {
                Response::error('E-mail já está em uso por outra conta');
            }
            $fields[] = 'email = ?';
            $params[] = $email;
        }
        if (!empty($data['password'])) {
            $fields[] = 'password_hash = ?';
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        if (isset($data['isPremium'])) {
            $fields[] = 'is_premium = ?';
            $params[] = $data['isPremium'] ? 1 : 0;
        }
        if (isset($data['isAdmin'])) {
            $fields[] = 'is_admin = ?';
            $params[] = $data['isAdmin'] ? 1 : 0;
        }

        if (empty($fields))
            return;

        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);
    }

    public function adminDeleteUser(int $id): void
    {
        // Prevent deleting current user handled in entry point
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
    }

    public function updateProfile(array $input): void
    {
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));

        if (!$name || !$email) {
            Response::error('Nome e e-mail são obrigatórios');
        }

        // Check if email is taken by another user
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $this->userId]);
        if ($stmt->fetch()) {
            Response::error('E-mail já está em uso por outra conta');
        }

        $stmt = $this->db->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
        $stmt->execute([$name, $email, $this->userId]);
    }

    public function changePassword(string $currentPassword, string $newPassword): void
    {
        if (strlen($newPassword) < 8) {
            Response::error('A nova senha deve ter pelo menos 8 caracteres');
        }

        $stmt = $this->db->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$this->userId]);
        $currentHashDB = $stmt->fetchColumn();

        // Check current password
        $isValid = password_verify($currentPassword, $currentHashDB);
        if (!$isValid && $currentHashDB === hash('sha256', $currentPassword)) {
            $isValid = true;
        }

        if (!$isValid) {
            Response::error('Senha atual incorreta', 401);
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->execute([$newHash, $this->userId]);
    }
}
