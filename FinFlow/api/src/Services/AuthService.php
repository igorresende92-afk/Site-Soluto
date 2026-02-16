<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;
use FinFlow\Services\CategoryService;

class AuthService extends Service
{
    public function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));

        if (!$email || !$password) {
            Response::error('E-mail e senha são obrigatórios');
        }

        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('E-mail não encontrado', 401);
        }

        // 1. Try modern hash (Bcrypt)
        if (password_verify($password, $user['password_hash'])) {
            if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$newHash, $user['id']]);
            }
        }
        // 2. Legacy SHA-256 fallback
        elseif ($user['password_hash'] === hash('sha256', $password)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$newHash, $user['id']]);
        } else {
            Response::error('Senha incorreta', 401);
        }

        return $user;
    }

    public function register(string $name, string $email, string $password): int
    {
        $name = trim($name);
        $email = strtolower(trim($email));

        if (!$name || !$email || !$password) {
            Response::error('Nome, e-mail e senha são obrigatórios');
        }

        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            Response::error('Este e-mail já está cadastrado');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->db->prepare(
            "INSERT INTO users (name, email, password_hash, is_premium, is_admin) VALUES (?, ?, ?, 0, 0)"
        );
        $stmt->execute([$name, $email, $hash]);

        $userId = (int) $this->db->lastInsertId();

        // Seed default categories
        $categoryService = new CategoryService();
        $categoryService->setUserId($userId);
        $categoryService->seedDefaults();

        return $userId;
    }
}
