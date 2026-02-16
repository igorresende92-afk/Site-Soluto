<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;

class CardService extends Service
{
    private int $userId;

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    private function validateOwnership(int $id): void
    {
        $stmt = $this->db->prepare("SELECT id FROM credit_cards WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
        if (!$stmt->fetch()) {
            Response::error('Cartão não encontrado ou acesso negado', 403);
        }
    }

    public function list(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$this->userId]);
        return array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'limit' => (float) $r['credit_limit'],
                'closingDay' => (int) $r['closing_day'],
                'dueDay' => (int) $r['due_day'],
                'color' => $r['color'],
                'createdAt' => $r['created_at'],
            ];
        }, $stmt->fetchAll());
    }

    public function create(array $input): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO credit_cards (user_id, name, credit_limit, closing_day, due_day, color) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $this->userId,
            $input['name'] ?? 'Cartão',
            $input['limit'] ?? 0,
            $input['closingDay'] ?? 1,
            $input['dueDay'] ?? 10,
            $input['color'] ?? '#7c3aed',
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $input): void
    {
        $this->validateOwnership($id);

        $stmt = $this->db->prepare(
            "UPDATE credit_cards SET name=?, credit_limit=?, closing_day=?, due_day=?, color=? WHERE id=? AND user_id=?"
        );
        $stmt->execute([
            $input['name'] ?? 'Cartão',
            $input['limit'] ?? 0,
            $input['closingDay'] ?? 1,
            $input['dueDay'] ?? 10,
            $input['color'] ?? '#7c3aed',
            $id,
            $this->userId,
        ]);
    }

    public function delete(int $id): void
    {
        $this->validateOwnership($id);

        $stmt = $this->db->prepare("DELETE FROM credit_cards WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
    }
}
