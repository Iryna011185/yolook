<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../../lib/app-env.php';
require_once __DIR__ . '/../../../../lib/order-storage.php';
require_once __DIR__ . '/../../../../lib/express-pay-service.php';
require_once __DIR__ . '/../../../../lib/express-pay-order-state.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    yolook_json_response([
        'ok' => false,
        'message' => 'Разрешен только GET-запрос.',
    ], 405);
    exit;
}

$storage = new YolookOrderStorage();
$service = new ExpressPayService();
$orderNumber = trim((string) ($_GET['order'] ?? ''));
$invoiceNo = trim((string) ($_GET['invoiceNo'] ?? ''));
$accountNo = trim((string) ($_GET['accountNo'] ?? ''));
$refresh = (string) ($_GET['refresh'] ?? '') === '1';
$order = null;

if ($orderNumber !== '') {
    $order = $storage->loadOrder($orderNumber);
} else {
    $order = $storage->findByAccountOrInvoice($accountNo, $invoiceNo);
}

if (!is_array($order)) {
    yolook_json_response([
        'ok' => false,
        'message' => 'Заказ не найден.',
    ], 404);
    exit;
}

if (
    $refresh &&
    $service->isEnabled() &&
    !empty($order['expressPayInvoiceNo']) &&
    (($order['paymentStatus'] ?? '') === 'pending' || ($order['paymentStatus'] ?? '') === 'partial')
) {
    try {
        $statusResponse = $service->getInvoiceStatus((string) $order['expressPayInvoiceNo']);
        $statusCode = (int) ($statusResponse['Status'] ?? ($statusResponse['Data']['Status'] ?? 0));
        $mappedState = yolook_map_express_pay_status($statusCode);
        $mappedState = yolook_apply_payment_method_state($mappedState, $order);

        if ($statusCode > 0) {
            $order['expressPayStatusCode'] = $statusCode;
            $order['paymentStatus'] = $mappedState['paymentStatus'];
            $order['orderStatus'] = $mappedState['orderStatus'];
            $order['paymentMeta']['lastStatusSyncAt'] = yolook_now_iso8601();
            $order['paymentMeta']['lastStatusSyncResponse'] = $statusResponse;

            if ($mappedState['isPaid'] && empty($order['paidAt'])) {
                $order['paidAt'] = yolook_now_iso8601();
            }

            $storage->saveOrder($order);
        }
    } catch (Throwable $exception) {
        $storage->logApplicationEvent('express_pay_status_refresh_error', [
            'orderNumber' => $order['orderNumber'] ?? '',
            'message' => $exception->getMessage(),
        ]);
    }
}

yolook_json_response([
    'ok' => true,
    'orderNumber' => $order['orderNumber'] ?? '',
    'orderStatus' => $order['orderStatus'] ?? '',
    'paymentStatus' => $order['paymentStatus'] ?? '',
    'paymentProvider' => $order['paymentProvider'] ?? '',
    'paidAt' => $order['paidAt'] ?? null,
    'invoiceNo' => $order['expressPayInvoiceNo'] ?? null,
    'invoiceUrl' => $order['expressPayInvoiceUrl'] ?? null,
    'accountNo' => $order['expressPayAccountNo'] ?? null,
    'expressPayStatusCode' => $order['expressPayStatusCode'] ?? null,
    'total' => $order['order']['total'] ?? null,
    'currency' => $order['order']['currency'] ?? 'BYN',
]);
