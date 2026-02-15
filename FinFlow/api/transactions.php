<?php
/**
 * FinFlow API - Transactions CRUD
 */

require_once __DIR__ . '/config.php';
setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
$db = getDB();

match ($_SERVER['REQUEST_METHOD']) {
    'GET' => listTransactions(),
    'POST' => createTransaction(),
    'PUT' => updateTransaction(),
    'DELETE' => deleteTransaction(),
    default => errorResponse('Método não suportado', 405),
};

function listTransactions(): void
{
    global $db, $userId;

    $month = $_GET['month'] ?? null; // 'YYYY-MM'
    $accountId = $_GET['account_id'] ?? null;

    $sql = "SELECT * FROM transactions WHERE user_id = ?";
    $params = [$userId];

    if ($month) {
        $sql .= " AND DATE_FORMAT(date, '%Y-%m') = ?";
        $params[] = $month;
    }
    if ($accountId) {
        $sql .= " AND (account_id = ? OR to_account_id = ?)";
        $params[] = (int) $accountId;
        $params[] = (int) $accountId;
    }

    $sql .= " ORDER BY date DESC, id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(array_map('formatTransaction', $stmt->fetchAll()));
}

function createTransaction(): void
{
    global $db, $userId;
    $input = jsonInput();

    $stmt = $db->prepare(
        "INSERT INTO transactions
         (user_id, description, amount, type, date, account_id, to_account_id,
          credit_card_id, category_id, is_recurring, recurrence_count,
          recurrence_group_id, installment_current, installment_total, is_realized)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $userId,
        $input['description'] ?? '',
        $input['amount'] ?? 0,
        $input['type'] ?? 'expense',
        $input['date'] ?? date('Y-m-d'),
        $input['accountId'] ?? 0,
        $input['toAccountId'] ?? null,
        $input['creditCardId'] ?? null,
        $input['categoryId'] ?? 0,
        $input['isRecurring'] ? 1 : 0,
        $input['recurrenceCount'] ?? null,
        $input['recurrenceGroupId'] ?? null,
        $input['installmentCurrent'] ?? null,
        $input['installmentTotal'] ?? null,
        $input['isRealized'] ? 1 : 0,
    ]);

    jsonResponse(['id' => (int) $db->lastInsertId()], 201);
}

function updateTransaction(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();

    $stmt = $db->prepare(
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
        $input['accountId'] ?? 0,
        $input['toAccountId'] ?? null,
        $input['creditCardId'] ?? null,
        $input['categoryId'] ?? 0,
        $input['isRecurring'] ? 1 : 0,
        $input['recurrenceCount'] ?? null,
        $input['recurrenceGroupId'] ?? null,
        $input['installmentCurrent'] ?? null,
        $input['installmentTotal'] ?? null,
        $input['isRealized'] ? 1 : 0,
        $id,
        $userId,
    ]);

    jsonResponse(['ok' => true]);
}

function deleteTransaction(): void
{
    global $db, $userId;
    $id = (int) ($_GET['id'] ?? 0);

    $stmt = $db->prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    jsonResponse(['ok' => true]);
}

function formatTransaction(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'description' => $r['description'],
        'amount' => (float) $r['amount'],
        'type' => $r['type'],
        'date' => $r['date'],
        'accountId' => (int) $r['account_id'],
        'toAccountId' => $r['to_account_id'] ? (int) $r['to_account_id'] : null,
        'creditCardId' => $r['credit_card_id'] ? (int) $r['credit_card_id'] : null,
        'categoryId' => (int) $r['category_id'],
        'isRecurring' => (bool) $r['is_recurring'],
        'recurrenceCount' => $r['recurrence_count'] ? (int) $r['recurrence_count'] : null,
        'recurrenceGroupId' => $r['recurrence_group_id'],
        'installmentCurrent' => $r['installment_current'] ? (int) $r['installment_current'] : null,
        'installmentTotal' => $r['installment_total'] ? (int) $r['installment_total'] : null,
        'isRealized' => (bool) $r['is_realized'],
        'createdAt' => $r['created_at'],
    ];
}
