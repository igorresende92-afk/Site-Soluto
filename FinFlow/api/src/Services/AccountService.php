<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;

class AccountService extends Service
{
    private int $userId;

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    private function validateOwnership(int $id): void
    {
        $stmt = $this->db->prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
        if (!$stmt->fetch()) {
            Response::error('Conta não encontrada ou acesso negado', 403);
        }
    }

    public function create(array $input): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO accounts (user_id, name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $this->userId,
            $input['name'] ?? 'Conta',
            $input['type'] ?? 'checking',
            $input['balance'] ?? 0, // Initial balance can be set on create, but confusing if calculated. 
            // For now, allow init, but ideally should be via transaction.
            $input['color'] ?? '#00f3ff',
            $input['icon'] ?? 'Wallet',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $input): void
    {
        $this->validateOwnership($id);

        $stmt = $this->db->prepare(
            "UPDATE accounts SET name=?, type=?, color=?, icon=? WHERE id=? AND user_id=?"
        );
        $stmt->execute([
            $input['name'] ?? 'Conta',
            $input['type'] ?? 'checking',
            $input['color'] ?? '#00f3ff',
            $input['icon'] ?? 'Wallet',
            $id,
            $this->userId,
        ]);
    }

    public function delete(int $id): void
    {
        $this->validateOwnership($id);

        // Maybe check dependencies?
        $stmt = $this->db->prepare("DELETE FROM accounts WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
    }

    public function list(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$this->userId]);
        return array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'type' => $r['type'],
                'balance' => (float) $r['balance'],
                'color' => $r['color'],
                'icon' => $r['icon'],
                'createdAt' => $r['created_at'],
            ];
        }, $stmt->fetchAll());
    }
}
