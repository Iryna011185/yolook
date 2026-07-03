<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/app-env.php';
require_once __DIR__ . '/../../../../lib/order-storage.php';
require_once __DIR__ . '/../../../../lib/express-pay-service.php';
require_once __DIR__ . '/../../../../lib/express-pay-order-state.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    yolook_json_response([
        'ok' => false,
        'message' => 'Разрешен только POST-запрос.',
    ], 405);
    exit;
}

$storage = new YolookOrderStorage();
$service = new ExpressPayService();
$data = isset($_POST['Data']) ? (string) $_POST['Data'] : '';
$signature = isset($_POST['Signature']) ? (string) $_POST['Signature'] : '';

if ($data === '' || $signature === '') {
    $rawBody = file_get_contents('php://input');

    if (is_string($rawBody) && $rawBody !== '') {
        parse_str($rawBody, $parsedBody);
        $data = $data !== '' ? $data : (string) ($parsedBody['Data'] ?? '');
        $signature = $signature !== '' ? $signature : (string) ($parsedBody['Signature'] ?? '');
    }
}

if ($data === '' || $signature === '') {
    $storage->logApplicationEvent('express_pay_webhook_invalid_payload', [
        'reason' => 'missing_data_or_signature',
    ]);

    yolook_json_response([
        'ok' => false,
        'message' => 'Webhook должен содержать Data и Signature.',
    ], 400);
    exit;
}

$storage->logWebhookEvent('received', $data, $signature);

if (!ExpressPayService::verifyWebhookSignature($data, $signature, $service->getSecretWord())) {
    $storage->logApplicationEvent('express_pay_webhook_signature_failed', [
        'signature' => yolook_mask_sensitive_value($signature),
    ]);

    yolook_json_response([
        'ok' => false,
        'message' => 'Подпись webhook не прошла проверку.',
    ], 403);
    exit;
}

$decoded = json_decode($data, true);

if (!is_array($decoded)) {
    yolook_json_response([
        'ok' => false,
        'message' => 'Поле Data не содержит валидный JSON.',
    ], 400);
    exit;
}

$invoiceNo = trim((string) ($decoded['InvoiceNo'] ?? ''));
$accountNo = trim((string) ($decoded['AccountNo'] ?? ''));
$statusCode = (int) ($decoded['Status'] ?? 0);
$order = $storage->findByAccountOrInvoice($accountNo, $invoiceNo);

if (!is_array($order)) {
    $storage->logApplicationEvent('express_pay_webhook_order_not_found', [
        'invoiceNo' => $invoiceNo,
        'accountNo' => $accountNo,
    ]);

    yolook_json_response([
        'ok' => false,
        'message' => 'Заказ для webhook не найден.',
    ], 404);
    exit;
}

$mappedState = yolook_map_express_pay_status($statusCode);
$mappedState = yolook_apply_payment_method_state($mappedState, $order);
$isDuplicateSuccessfulWebhook =
    (in_array((string) ($order['paymentStatus'] ?? ''), ['paid', 'deposit_paid'], true)) &&
    ($mappedState['isPaid'] === true);

if ($isDuplicateSuccessfulWebhook) {
    $storage->logApplicationEvent('express_pay_webhook_duplicate_paid', [
        'orderNumber' => $order['orderNumber'] ?? '',
        'invoiceNo' => $invoiceNo,
    ]);

    yolook_json_response([
        'ok' => true,
        'message' => 'Webhook уже был обработан ранее.',
    ]);
    exit;
}

$order['expressPayInvoiceNo'] = $invoiceNo !== '' ? $invoiceNo : ($order['expressPayInvoiceNo'] ?? null);
$order['expressPayAccountNo'] = $accountNo !== '' ? $accountNo : ($order['expressPayAccountNo'] ?? null);
$order['expressPayStatusCode'] = $statusCode;
$order['paymentStatus'] = $mappedState['paymentStatus'];
$order['orderStatus'] = $mappedState['orderStatus'];
$order['paymentMeta']['lastWebhookAt'] = yolook_now_iso8601();
$order['paymentMeta']['lastWebhookPayload'] = $decoded;

if ($mappedState['isPaid'] && empty($order['paidAt'])) {
    $order['paidAt'] = yolook_now_iso8601();
}

$storage->saveOrder($order);

if ($invoiceNo !== '') {
    $storage->mapInvoiceToOrder($invoiceNo, (string) ($order['orderNumber'] ?? ''));
}

if ($accountNo !== '') {
    $storage->mapAccountToOrder($accountNo, (string) ($order['orderNumber'] ?? ''));
}

yolook_json_response([
    'ok' => true,
    'message' => 'Webhook Express Pay обработан.',
    'orderNumber' => $order['orderNumber'] ?? '',
    'paymentStatus' => $order['paymentStatus'],
    'orderStatus' => $order['orderStatus'],
]);
