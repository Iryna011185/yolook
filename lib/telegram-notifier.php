<?php

declare(strict_types=1);

require_once __DIR__ . '/../telegram-config.php';

final class YolookTelegramNotifier
{
    public function notifyOrder(array $payload, array $options = []): bool
    {
        $chatIds = $this->getRecipientChatIds();

        if (count($chatIds) === 0) {
            return false;
        }

        $message = $this->buildOrderMessage($payload, $options);
        $hasSuccessfulDelivery = false;

        foreach ($chatIds as $chatId) {
            $response = $this->telegramApiRequest(YOLOOK_TELEGRAM_BOT_TOKEN, 'sendMessage', [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
            ]);

            if (is_array($response) && !empty($response['ok'])) {
                $hasSuccessfulDelivery = true;
            }
        }

        return $hasSuccessfulDelivery;
    }

    private function buildOrderMessage(array $payload, array $options = []): string
    {
        $customer = isset($payload['customer']) && is_array($payload['customer']) ? $payload['customer'] : [];
        $order = isset($payload['order']) && is_array($payload['order']) ? $payload['order'] : [];
        $meta = isset($payload['meta']) && is_array($payload['meta']) ? $payload['meta'] : [];
        $items = isset($order['items']) && is_array($order['items']) ? $order['items'] : [];
        $address = isset($customer['address']) && is_array($customer['address']) ? $customer['address'] : [];
        $deliveryMethod = trim((string) ($order['deliveryMethod'] ?? ''));
        $deliveryMethodLabel = trim((string) ($order['deliveryLabel'] ?? ''));

        $orderNumber = trim((string) ($options['orderNumber'] ?? ''));
        $invoiceNo = trim((string) ($options['invoiceNo'] ?? ''));
        $invoiceUrl = trim((string) ($options['invoiceUrl'] ?? ''));
        $paymentStateLabel = trim((string) ($options['paymentStateLabel'] ?? ''));

        $lines = [
            '<b>Новый заказ YOLOOK</b>',
            '',
        ];

        if ($orderNumber !== '') {
            $lines[] = '<b>Номер заказа:</b> ' . $this->escapeTelegram($orderNumber);
        }

        if ($paymentStateLabel !== '') {
            $lines[] = '<b>Статус оплаты:</b> ' . $this->escapeTelegram($paymentStateLabel);
        }

        if ($invoiceNo !== '') {
            $lines[] = '<b>Счет Express Pay:</b> ' . $this->escapeTelegram($invoiceNo);
        }

        if ($invoiceUrl !== '') {
            $lines[] = '<b>Ссылка на оплату:</b> ' . $this->escapeTelegram($invoiceUrl);
        }

        $lines[] = '<b>Имя:</b> ' . $this->escapeTelegram((string) ($customer['name'] ?? ''));
        $lines[] = '<b>Телефон:</b> ' . $this->escapeTelegram((string) ($customer['phone'] ?? ''));
        $lines[] = '<b>Email:</b> ' . $this->escapeTelegram((string) ($customer['email'] ?? 'Не указан'));
        $lines[] = '<b>Комментарий:</b> ' . $this->escapeTelegram((string) ($customer['comment'] ?? '—'));

        if ($deliveryMethodLabel !== '') {
            $lines[] = '<b>Доставка:</b> ' . $this->escapeTelegram($deliveryMethodLabel);
        }

        if ($deliveryMethod === 'belpost') {
            $lines[] = '<b>Область:</b> ' . $this->escapeTelegram((string) ($address['region'] ?? ''));
            $lines[] = '<b>Город:</b> ' . $this->escapeTelegram((string) ($address['city'] ?? ''));
            $lines[] = '<b>Улица:</b> ' . $this->escapeTelegram((string) ($address['street'] ?? ''));
            $lines[] = '<b>Дом:</b> ' . $this->escapeTelegram((string) ($address['house'] ?? ''));
            $lines[] = '<b>Квартира / офис:</b> ' . $this->escapeTelegram((string) ($address['apartment'] ?? 'Не указаны'));
            $lines[] = '<b>Индекс:</b> ' . $this->escapeTelegram((string) ($address['postalCode'] ?? ''));
        }

        if ($deliveryMethod === 'europost') {
            $lines[] = '<b>Отделение Европочты:</b> ' . $this->escapeTelegram((string) ($address['pickupPoint'] ?? ''));
        }

        $lines[] = '';
        $lines[] = '<b>Состав заказа:</b>';

        foreach ($items as $index => $item) {
            $name = $this->escapeTelegram((string) ($item['name'] ?? 'Товар'));
            $qty = (int) ($item['qty'] ?? 0);
            $linePrice = $this->formatByn((int) ($item['linePrice'] ?? 0));
            $lines[] = ($index + 1) . '. ' . $name . ' x ' . $qty . ' — ' . $linePrice;
        }

        $lines[] = '';
        $lines[] = '<b>Товаров:</b> ' . (int) ($order['totalQty'] ?? 0);
        $lines[] = '<b>Сумма:</b> ' . $this->formatByn((int) ($order['subtotal'] ?? 0));
        $lines[] = '<b>Скидка:</b> ' . $this->formatByn((int) ($order['discountAmount'] ?? 0));
        $lines[] = '<b>Итого:</b> ' . $this->formatByn((int) ($order['total'] ?? 0));

        $paymentLabel = trim((string) ($order['paymentLabel'] ?? ''));
        $paymentNote = trim((string) ($order['paymentNote'] ?? ''));
        $paymentAmount = (int) round((float) ($order['paymentAmount'] ?? 0));
        $outstandingAmount = (int) round((float) ($order['outstandingAmount'] ?? 0));
        $promoCode = trim((string) ($order['promoCode'] ?? ''));
        $submittedAt = trim((string) ($meta['submittedAt'] ?? ''));

        if ($paymentLabel !== '') {
            $lines[] = '<b>Оплата:</b> ' . $this->escapeTelegram($paymentLabel);
        }

        if ($paymentNote !== '') {
            $lines[] = '<b>Комментарий по оплате:</b> ' . $this->escapeTelegram($paymentNote);
        }

        if ($paymentAmount > 0) {
            $lines[] = '<b>К оплате онлайн сейчас:</b> ' . $this->formatByn($paymentAmount);
        }

        if ($outstandingAmount > 0) {
            $lines[] = '<b>Остаток при получении:</b> ' . $this->formatByn($outstandingAmount);
        }

        if ($promoCode !== '') {
            $lines[] = '<b>Промокод:</b> ' . $this->escapeTelegram($promoCode);
        }

        if ($submittedAt !== '') {
            $lines[] = '<b>Дата:</b> ' . $this->escapeTelegram($submittedAt);
        }

        return implode("\n", $lines);
    }

    private function discoverTelegramChatId(string $token): ?string
    {
        $response = $this->telegramApiRequest($token, 'getUpdates', [
            'limit' => 20,
            'timeout' => 5,
        ]);

        if (!is_array($response) || empty($response['ok']) || empty($response['result']) || !is_array($response['result'])) {
            return null;
        }

        $updates = array_reverse($response['result']);

        foreach ($updates as $update) {
            if (isset($update['message']['chat']['id'])) {
                return (string) $update['message']['chat']['id'];
            }

            if (isset($update['callback_query']['message']['chat']['id'])) {
                return (string) $update['callback_query']['message']['chat']['id'];
            }
        }

        return null;
    }

    private function getRecipientChatIds(): array
    {
        $chatIds = [];

        if (defined('YOLOOK_TELEGRAM_CHAT_IDS') && is_array(YOLOOK_TELEGRAM_CHAT_IDS)) {
            foreach (YOLOOK_TELEGRAM_CHAT_IDS as $chatId) {
                $normalizedChatId = trim((string) $chatId);

                if ($normalizedChatId !== '') {
                    $chatIds[] = $normalizedChatId;
                }
            }
        }

        if (count($chatIds) === 0) {
            $discoveredChatId = $this->discoverTelegramChatId(YOLOOK_TELEGRAM_BOT_TOKEN);

            if ($discoveredChatId !== null && $discoveredChatId !== '') {
                $chatIds[] = $discoveredChatId;
            }
        }

        return array_values(array_unique($chatIds));
    }

    private function telegramApiRequest(string $token, string $method, array $payload): ?array
    {
        $url = 'https://api.telegram.org/bot' . $token . '/' . $method;

        if (function_exists('curl_init')) {
            $ch = curl_init($url);

            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 20,
            ]);

            $responseBody = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);

            if (!is_string($responseBody) || $httpCode >= 400) {
                return null;
            }

            $decoded = json_decode($responseBody, true);
            return is_array($decoded) ? $decoded : null;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query($payload),
                'timeout' => 20,
            ],
        ]);

        $responseBody = @file_get_contents($url, false, $context);

        if (!is_string($responseBody) || $responseBody === '') {
            return null;
        }

        $decoded = json_decode($responseBody, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function formatByn(int $amount): string
    {
        return number_format($amount, 0, '.', ' ') . ' BYN';
    }

    private function escapeTelegram(string $value): string
    {
        $trimmed = trim($value);
        return htmlspecialchars($trimmed !== '' ? $trimmed : '—', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
