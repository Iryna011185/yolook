<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/app-env.php';
require_once __DIR__ . '/../../../../lib/checkout-payload.php';
require_once __DIR__ . '/../../../../lib/order-storage.php';
require_once __DIR__ . '/../../../../lib/telegram-notifier.php';
require_once __DIR__ . '/../../../../lib/express-pay-service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    yolook_json_response([
        'ok' => false,
        'message' => 'Разрешен только POST-запрос.',
    ], 405);
    exit;
}

$payload = yolook_read_request_payload();
$validationError = yolook_validate_order_payload($payload);

if ($validationError !== null) {
    yolook_json_response([
        'ok' => false,
        'message' => $validationError,
    ], 422);
    exit;
}

$orderPayload = isset($payload['order']) && is_array($payload['order']) ? $payload['order'] : [];
$paymentMethod = trim((string) ($orderPayload['paymentMethod'] ?? ''));

if (!in_array($paymentMethod, ['online', 'cod'], true)) {
    yolook_json_response([
        'ok' => false,
        'message' => 'Выберите корректный способ оплаты.',
    ], 422);
    exit;
}

$storage = new YolookOrderStorage();
$service = new ExpressPayService();
$notifier = new YolookTelegramNotifier();
$paymentAmount = (float) ($orderPayload['paymentAmount'] ?? ($orderPayload['total'] ?? 0));

try {
    $service->assertReady();

    $orderNumber = $storage->generateOrderNumber();
    $accountNo = $storage->buildAccountNo($orderNumber);
    $orderRecord = [
        'orderNumber' => $orderNumber,
        'createdAt' => yolook_now_iso8601(),
        'updatedAt' => yolook_now_iso8601(),
        'orderStatus' => 'awaiting_payment',
        'paymentProvider' => 'express_pay',
        'paymentStatus' => 'pending',
        'paidAt' => null,
        'customer' => $payload['customer'] ?? [],
        'order' => $orderPayload,
        'meta' => $payload['meta'] ?? [],
        'expressPayInvoiceNo' => null,
        'expressPayInvoiceUrl' => null,
        'expressPayAccountNo' => $accountNo,
        'expressPayStatusCode' => 1,
        'paymentMeta' => [],
    ];

    $storage->saveOrder($orderRecord);
    $storage->mapAccountToOrder($accountNo, $orderNumber);

    $invoice = $service->createInvoice($orderRecord);
    $orderRecord['expressPayInvoiceNo'] = $invoice['invoiceNo'];
    $orderRecord['expressPayInvoiceUrl'] = $invoice['invoiceUrl'];
    $orderRecord['paymentMeta'] = [
        'provider' => 'express_pay',
        'createdInvoiceAt' => yolook_now_iso8601(),
        'invoiceRequest' => $invoice['requestPayload'],
        'invoiceResponse' => $invoice['rawResponse'],
    ];

    $storage->saveOrder($orderRecord);
    $storage->mapInvoiceToOrder($invoice['invoiceNo'], $orderNumber);

    $notifier->notifyOrder($payload, [
        'orderNumber' => $orderNumber,
        'invoiceNo' => $invoice['invoiceNo'],
        'invoiceUrl' => $invoice['invoiceUrl'],
        'paymentStateLabel' => $paymentMethod === 'cod'
            ? 'Ожидает предоплату ' . number_format($paymentAmount, 0, '.', ' ') . ' BYN через Express Pay'
            : 'Ожидает онлайн-оплату через Express Pay',
    ]);

    yolook_json_response([
        'ok' => true,
        'orderNumber' => $orderNumber,
        'paymentProvider' => 'express_pay',
        'paymentStatus' => 'pending',
        'invoiceNo' => $invoice['invoiceNo'],
        'invoiceUrl' => $invoice['invoiceUrl'],
    ]);
} catch (Throwable $exception) {
    $storage->logApplicationEvent('express_pay_create_error', [
        'message' => $exception->getMessage(),
        'paymentMethod' => $paymentMethod,
    ]);

    yolook_json_response([
        'ok' => false,
        'message' => 'Не удалось создать счет Express Pay. ' . $exception->getMessage(),
    ], 502);
}
