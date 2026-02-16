<?php
/**
 * FinFlow API - Transactions CRUD
 */

require_once __DIR__ . '/bootstrap.php';

use FinFlow\Services\TransactionService;
use FinFlow\Utils\Response;

setCorsHeaders();
$auth = getAuthUser();
$userId = $auth['user_id'];
// $db = getDB(); // Not needed globally if using service for writes, but listTransactions still uses it.

$service = new TransactionService();
$service->setUserId($userId);

try {
    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => listTransactions(),
        'POST' => createTransaction($service),
        'PUT' => updateTransaction($service),
        'DELETE' => deleteTransaction($service),
        default => Response::error('Método não suportado', 405),
    };
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

function listTransactions(): void
{
    global $userId;
    $db = \FinFlow\Config\Database::getConnection();

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

function createTransaction(TransactionService $service): void
{
    $input = jsonInput();
    $id = $service->create($input);
    Response::json(['id' => $id], 201);
}

function updateTransaction(TransactionService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $input = jsonInput();
    $service->update($id, $input);
    Response::json(['ok' => true]);
}

function deleteTransaction(TransactionService $service): void
{
    $id = (int) ($_GET['id'] ?? 0);
    $service->delete($id);
    Response::json(['ok' => true]);
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
