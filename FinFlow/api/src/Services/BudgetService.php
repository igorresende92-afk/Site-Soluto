<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;

class BudgetService extends Service
{
    private int $userId;

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    private function validateOwnership(int $id): void
    {
        $stmt = $this->db->prepare("SELECT id FROM budget_goals WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
        if (!$stmt->fetch()) {
            Response::error('Meta não encontrada ou acesso negado', 403);
        }
    }

    private function validateCategory(int $categoryId): void
    {
        $stmt = $this->db->prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?");
        $stmt->execute([$categoryId, $this->userId]);
        if (!$stmt->fetch()) {
            Response::error('Categoria inválida', 400);
        }
    }

    public function create(array $input): int
    {
        $categoryId = (int) ($input['categoryId'] ?? 0);
        $this->validateCategory($categoryId);

        $stmt = $this->db->prepare(
            "INSERT INTO budget_goals (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount)"
        );
        $stmt->execute([
            $this->userId,
            $categoryId,
            $input['month'] ?? date('Y-m'),
            $input['limitAmount'] ?? 0,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $input): void
    {
        $this->validateOwnership($id);

        $categoryId = (int) ($input['categoryId'] ?? 0);
        if ($categoryId)
            $this->validateCategory($categoryId);

        $stmt = $this->db->prepare(
            "UPDATE budget_goals SET category_id=?, month=?, limit_amount=? WHERE id=? AND user_id=?"
        );
        $stmt->execute([
            $categoryId,
            $input['month'] ?? date('Y-m'),
            $input['limitAmount'] ?? 0,
            $id,
            $this->userId,
        ]);
    }

    public function delete(int $id): void
    {
        $this->validateOwnership($id);
        $stmt = $this->db->prepare("DELETE FROM budget_goals WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
    }

    public function list(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM budget_goals WHERE user_id = ? ORDER BY month DESC");
        $stmt->execute([$this->userId]);
        return array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'categoryId' => (int) $r['category_id'],
                'month' => $r['month'],
                'limitAmount' => (float) $r['limit_amount'],
            ];
        }, $stmt->fetchAll());
    }
}
