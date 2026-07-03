<?php

declare(strict_types=1);

require_once __DIR__ . '/app-env.php';

final class YolookOrderStorage
{
    private string $ordersDirectory;
    private string $indexDirectory;
    private string $logsDirectory;

    public function __construct()
    {
        $this->ordersDirectory = yolook_storage_path('orders');
        $this->indexDirectory = yolook_storage_path('index');
        $this->logsDirectory = yolook_storage_path('logs/express-pay');

        yolook_ensure_directory($this->ordersDirectory);
        yolook_ensure_directory($this->indexDirectory);
        yolook_ensure_directory($this->logsDirectory);
    }

    public function generateOrderNumber(): string
    {
        return 'YL' . gmdate('ymdHis') . random_int(1000, 9999);
    }

    public function buildAccountNo(string $orderNumber): string
    {
        return substr($orderNumber, 0, 22);
    }

    public function saveOrder(array $order): void
    {
        if (empty($order['orderNumber'])) {
            throw new RuntimeException('Order number is required for persistence.');
        }

        $order['updatedAt'] = yolook_now_iso8601();
        $encoded = json_encode($order, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($encoded)) {
            throw new RuntimeException('Failed to encode order payload.');
        }

        file_put_contents($this->getOrderPath((string) $order['orderNumber']), $encoded, LOCK_EX);
    }

    public function loadOrder(string $orderNumber): ?array
    {
        $path = $this->getOrderPath($orderNumber);

        if (!is_file($path)) {
            return null;
        }

        $raw = file_get_contents($path);

        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    public function mapAccountToOrder(string $accountNo, string $orderNumber): void
    {
        $this->writeIndexFile('account-' . $this->normalizeIndexKey($accountNo) . '.txt', $orderNumber);
    }

    public function mapInvoiceToOrder(string $invoiceNo, string $orderNumber): void
    {
        $this->writeIndexFile('invoice-' . $this->normalizeIndexKey($invoiceNo) . '.txt', $orderNumber);
    }

    public function findByAccountOrInvoice(?string $accountNo, ?string $invoiceNo): ?array
    {
        $orderNumber = null;

        if ($invoiceNo !== null && $invoiceNo !== '') {
            $orderNumber = $this->readIndexFile('invoice-' . $this->normalizeIndexKey($invoiceNo) . '.txt');
        }

        if (($orderNumber === null || $orderNumber === '') && $accountNo !== null && $accountNo !== '') {
            $orderNumber = $this->readIndexFile('account-' . $this->normalizeIndexKey($accountNo) . '.txt');
        }

        if ($orderNumber === null || $orderNumber === '') {
            return null;
        }

        return $this->loadOrder($orderNumber);
    }

    public function logWebhookEvent(string $eventType, string $data, string $signature, array $meta = []): void
    {
        $entry = [
            'type' => $eventType,
            'loggedAt' => yolook_now_iso8601(),
            'signature' => $signature,
            'data' => $data,
            'meta' => $meta,
        ];

        $this->appendLogEntry($entry);
    }

    public function logApplicationEvent(string $eventType, array $context = []): void
    {
        $entry = [
            'type' => $eventType,
            'loggedAt' => yolook_now_iso8601(),
            'context' => $context,
        ];

        $this->appendLogEntry($entry);
    }

    private function getOrderPath(string $orderNumber): string
    {
        return $this->ordersDirectory . '/' . $this->normalizeIndexKey($orderNumber) . '.json';
    }

    private function writeIndexFile(string $fileName, string $value): void
    {
        file_put_contents($this->indexDirectory . '/' . $fileName, $value, LOCK_EX);
    }

    private function readIndexFile(string $fileName): ?string
    {
        $path = $this->indexDirectory . '/' . $fileName;

        if (!is_file($path)) {
            return null;
        }

        $value = trim((string) file_get_contents($path));

        return $value !== '' ? $value : null;
    }

    private function appendLogEntry(array $entry): void
    {
        $path = $this->logsDirectory . '/' . gmdate('Y-m-d') . '.log';
        $encoded = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!is_string($encoded)) {
            return;
        }

        file_put_contents($path, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX);
    }

    private function normalizeIndexKey(string $value): string
    {
        return preg_replace('/[^A-Za-z0-9._-]+/', '_', $value) ?? 'unknown';
    }
}

