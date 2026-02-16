<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;

class CategoryService extends Service
{
    private int $userId;

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    public function getUserId(): int
    {
        return $this->userId;
    }

    private function validateOwnership(int $id): void
    {
        $stmt = $this->db->prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
        if (!$stmt->fetch()) {
            Response::error('Categoria não encontrada ou acesso negado', 403);
        }
    }

    public function create(array $input): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO categories (user_id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $this->userId,
            $input['name'] ?? 'Nova Categoria',
            $input['icon'] ?? 'Tag',
            $input['type'] ?? 'expense',
            $input['color'] ?? '#e2e8f0',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $input): void
    {
        $this->validateOwnership($id);

        $stmt = $this->db->prepare(
            "UPDATE categories SET name=?, icon=?, type=?, color=? WHERE id=? AND user_id=?"
        );
        $stmt->execute([
            $input['name'] ?? 'Categoria',
            $input['icon'] ?? 'Tag',
            $input['type'] ?? 'expense',
            $input['color'] ?? '#e2e8f0',
            $id,
            $this->userId,
        ]);
    }

    public function delete(int $id): void
    {
        $this->validateOwnership($id);
        $stmt = $this->db->prepare("DELETE FROM categories WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
    }

    public function list(): array
    {
        $stmt = $this->db->prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY type, name");
        $stmt->execute([$this->userId]);
        return array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'icon' => $r['icon'],
                'type' => $r['type'],
                'color' => $r['color'],
            ];
        }, $stmt->fetchAll());
    }

    public function seedDefaults(): void
    {
        $categories = [
            // Income
            ['Salário', 'Banknote', 'income', '#2ed573'],
            ['Freelance', 'Laptop', 'income', '#00f3ff'],
            ['Investimentos', 'TrendingUp', 'income', '#7c3aed'],
            ['Presentes', 'Gift', 'income', '#ff4757'],
            ['Cashback', 'RefreshCcw', 'income', '#ffa502'],

            // Expenses
            ['Alimentação', 'UtensilsCrossed', 'expense', '#ff6b6b'],
            ['Transporte', 'Car', 'expense', '#ffa502'],
            ['Moradia', 'Home', 'expense', '#1e90ff'],
            ['Saúde', 'Heart', 'expense', '#ff4757'],
            ['Educação', 'GraduationCap', 'expense', '#2ed573'],
            ['Lazer', 'Gamepad2', 'expense', '#d63031'],
            ['Assinaturas', 'CreditCard', 'expense', '#00cec9'],
            ['Compras', 'ShoppingBag', 'expense', '#fd79a8'],
            ['Viagem', 'Plane', 'expense', '#0984e3'],
            ['Pets', 'Cat', 'expense', '#6c5ce7'],
            ['Casa', 'Sofa', 'expense', '#e17055'],
            ['Cuidados Pessoais', 'Smile', 'expense', '#fdcb6e'],
            ['Outros', 'MoreHorizontal', 'expense', '#636e72'],
        ];

        $stmt = $this->db->prepare("INSERT IGNORE INTO categories (user_id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)");

        foreach ($categories as $cat) {
            $check = $this->db->prepare("SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?");
            $check->execute([$this->userId, $cat[0], $cat[2]]);
            if (!$check->fetch()) {
                $stmt->execute([$this->userId, ...$cat]);
            }
        }
    }
}
