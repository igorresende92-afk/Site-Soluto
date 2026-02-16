<?php

namespace FinFlow\Services;

use FinFlow\Utils\Response;
use FinFlow\Utils\Validator;
use PDO;

class TransactionService extends Service
{
    private int $userId;

    public function setUserId(int $userId): void
    {
        $this->userId = $userId;
    }

    public function validateOwnership(string $table, int $id): void
    {
        if ($id <= 0)
            return;

        $stmt = $this->db->prepare("SELECT id FROM $table WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
        if (!$stmt->fetch()) {
            Response::error("Recurso não encontrado ou acesso negado (Tabela: $table, ID: $id)", 403);
        }
    }

    public function recalculateBalance(int $accountId): void
    {
        if ($accountId <= 0)
            return;

        // 1. Income
        $stmt = $this->db->prepare("SELECT SUM(amount) FROM transactions WHERE account_id = ? AND type = 'income' AND is_realized = 1");
        $stmt->execute([$accountId]);
        $income = (float) $stmt->fetchColumn();

        // 2. Expense
        $stmt = $this->db->prepare("SELECT SUM(amount) FROM transactions WHERE account_id = ? AND type = 'expense' AND is_realized = 1");
        $stmt->execute([$accountId]);
        $expense = (float) $stmt->fetchColumn();

        // 3. Transfers Sent
        $stmt = $this->db->prepare("SELECT SUM(amount) FROM transactions WHERE account_id = ? AND type = 'transfer' AND is_realized = 1");
        $stmt->execute([$accountId]);
        $transfersSent = (float) $stmt->fetchColumn();

        // 4. Transfers Received
        $stmt = $this->db->prepare("SELECT SUM(amount) FROM transactions WHERE to_account_id = ? AND type = 'transfer' AND is_realized = 1");
        $stmt->execute([$accountId]);
        $transfersReceived = (float) $stmt->fetchColumn();

        $finalBalance = $income - $expense - $transfersSent + $transfersReceived;

        $stmt = $this->db->prepare("UPDATE accounts SET balance = ? WHERE id = ?");
        $stmt->execute([$finalBalance, $accountId]);
    }

    public function create(array $input): int
    {
        Validator::required($input, ['description', 'amount', 'type', 'accountId', 'categoryId']);

        $accountId = (int) ($input['accountId'] ?? 0);
        $this->validateOwnership('accounts', $accountId);

        $categoryId = (int) ($input['categoryId'] ?? 0);
        $this->validateOwnership('categories', $categoryId);

        if (!empty($input['creditCardId'])) {
            $this->validateOwnership('credit_cards', (int) $input['creditCardId']);
        }

        $toAccountId = null;
        if (($input['type'] ?? '') === 'transfer' && !empty($input['toAccountId'])) {
            $toAccountId = (int) $input['toAccountId'];
            $this->validateOwnership('accounts', $toAccountId);
        }

        $stmt = $this->db->prepare(
            "INSERT INTO transactions
             (user_id, description, amount, type, date, account_id, to_account_id,
              credit_card_id, category_id, is_recurring, recurrence_count,
              recurrence_group_id, installment_current, installment_total, is_realized)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $this->userId,
            $input['description'] ?? '',
            $input['amount'] ?? 0,
            $input['type'] ?? 'expense',
            $input['date'] ?? date('Y-m-d'),
            $accountId,
            $toAccountId,
            $input['creditCardId'] ?? null,
            $categoryId,
            !empty($input['isRecurring']) ? 1 : 0,
            $input['recurrenceCount'] ?? null,
            $input['recurrenceGroupId'] ?? null,
            $input['installmentCurrent'] ?? null,
            $input['installmentTotal'] ?? null,
            !empty($input['isRealized']) ? 1 : 0,
        ]);

        $newId = (int) $this->db->lastInsertId();

        $this->recalculateBalance($accountId);
        if ($toAccountId) {
            $this->recalculateBalance($toAccountId);
        }

        return $newId;
    }

    public function update(int $id, array $input): void
    {
        $this->validateOwnership('transactions', $id);

        // Get old transaction data
        $stmt = $this->db->prepare("SELECT account_id, to_account_id FROM transactions WHERE id = ?");
        $stmt->execute([$id]);
        $oldTx = $stmt->fetch();

        $accountId = (int) ($input['accountId'] ?? 0);
        if ($accountId)
            $this->validateOwnership('accounts', $accountId);

        $categoryId = (int) ($input['categoryId'] ?? 0);
        if ($categoryId)
            $this->validateOwnership('categories', $categoryId);

        if (!empty($input['creditCardId'])) {
            $this->validateOwnership('credit_cards', (int) $input['creditCardId']);
        }

        $toAccountId = null;
        if (($input['type'] ?? '') === 'transfer' && !empty($input['toAccountId'])) {
            $toAccountId = (int) $input['toAccountId'];
            $this->validateOwnership('accounts', $toAccountId);
        }

        $stmt = $this->db->prepare(
            "UPDATE transactions SET
             description=?, amount=?, type=?, date=?, account_id=?, to_account_id=?,
             credit_card_id=?, category_id=?, is_recurring=?, recurrence_count=?,
             recurrence_group_id=?, installment_current=?, installment_total=?, is_realized=?
             WHERE id=? AND user_id=?"
        );
        $stmt->execute([
            $input['description'] ?? '',
            $input['amount'] ?? 0,
            $input['type'] ?? 'expense',
            $input['date'] ?? date('Y-m-d'),
            $accountId,
            $toAccountId,
            $input['creditCardId'] ?? null,
            $categoryId,
            !empty($input['isRecurring']) ? 1 : 0,
            $input['recurrenceCount'] ?? null,
            $input['recurrenceGroupId'] ?? null,
            $input['installmentCurrent'] ?? null,
            $input['installmentTotal'] ?? null,
            !empty($input['isRealized']) ? 1 : 0,
            $id,
            $this->userId,
        ]);

        // Recalculate balances
        $accountsToUpdate = array_unique(array_filter([
            (int) $oldTx['account_id'],
            (int) $oldTx['to_account_id'],
            $accountId,
            $toAccountId
        ]));

        foreach ($accountsToUpdate as $accId) {
            if ($accId > 0)
                $this->recalculateBalance($accId);
        }
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare("SELECT account_id, to_account_id FROM transactions WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $this->userId]);
        $tx = $stmt->fetch();

        if (!$tx) {
            Response::error('Transação não encontrada', 404);
        }

        $stmt = $this->db->prepare("DELETE FROM transactions WHERE id = ?");
        $stmt->execute([$id]);

        if ($tx['account_id'])
            $this->recalculateBalance((int) $tx['account_id']);
        if ($tx['to_account_id'])
            $this->recalculateBalance((int) $tx['to_account_id']);
    }
}
