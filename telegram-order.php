<?php

declare(strict_types=1);

require __DIR__ . '/telegram-config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'message' => 'Разрешен только POST-запрос.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$payload = readRequestPayload();
$validationError = validateOrderPayload($payload);

if ($validationError !== null) {
    http_response_code(422);
    echo json_encode([
        'ok' => false,
        'message' => $validationError,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$chatIds = getRecipientChatIds();

if (count($chatIds) === 0) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Не удалось определить chat_id. Напишите любое сообщение боту @' . YOLOOK_TELEGRAM_BOT_USERNAME . ' и повторите отправку.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$message = buildTelegramMessage($payload);
$deliveryErrors = [];

foreach ($chatIds as $chatId) {
    $telegramResponse = telegramApiRequest(YOLOOK_TELEGRAM_BOT_TOKEN, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true,
    ]);

    if (!is_array($telegramResponse) || empty($telegramResponse['ok'])) {
        $deliveryErrors[] = $chatId;
    }
}

if (count($deliveryErrors) === count($chatIds)) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'message' => 'Telegram не принял заявку. Проверьте токен бота и настройки чатов.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'ok' => true,
    'message' => 'Заявка отправлена в Telegram.',
], JSON_UNESCAPED_UNICODE);

function readRequestPayload(): array
{
    $rawBody = file_get_contents('php://input');

    if (is_string($rawBody) && $rawBody !== '') {
        $decoded = json_decode($rawBody, true);

        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return $_POST;
}

function validateOrderPayload(array $payload): ?string
{
    $customer = isset($payload['customer']) && is_array($payload['customer']) ? $payload['customer'] : [];
    $order = isset($payload['order']) && is_array($payload['order']) ? $payload['order'] : [];
    $items = isset($order['items']) && is_array($order['items']) ? $order['items'] : [];

    $name = trim((string) ($customer['name'] ?? ''));
    $phone = preg_replace('/\D+/', '', (string) ($customer['phone'] ?? ''));
    $email = trim((string) ($customer['email'] ?? ''));
    $consent = !empty($customer['consent']);
    $paymentMethod = trim((string) ($order['paymentMethod'] ?? ''));
    $deliveryMethod = trim((string) ($order['deliveryMethod'] ?? ''));
    $address = isset($customer['address']) && is_array($customer['address']) ? $customer['address'] : [];
    $region = trim((string) ($address['region'] ?? ''));
    $city = trim((string) ($address['city'] ?? ''));
    $street = trim((string) ($address['street'] ?? ''));
    $house = trim((string) ($address['house'] ?? ''));
    $pickupPoint = trim((string) ($address['pickupPoint'] ?? ''));
    $postalCode = preg_replace('/\D+/', '', (string) ($address['postalCode'] ?? ''));

    if ($name === '') {
        return 'Укажите фамилию, имя и отчество покупателя.';
    }

    if ($phone === '' || strlen($phone) !== 12 || strpos($phone, '375') !== 0) {
        return 'Укажите корректный телефон в формате +375.';
    }

    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        return 'Укажите корректный email.';
    }

    if (!$consent) {
        return 'Нужно подтвердить согласие на обработку персональных данных.';
    }

    if (count($items) === 0) {
        return 'Корзина пуста.';
    }

    if ($deliveryMethod === '') {
        return 'Выберите способ доставки.';
    }

    if ($deliveryMethod === 'belpost') {
        if ($region === '' || $city === '' || $street === '' || $house === '') {
            return 'Для Белпочты заполните область, город, улицу и дом.';
        }

        if ($postalCode === '' || strlen($postalCode) !== 6) {
            return 'Укажите корректный почтовый индекс для Белпочты.';
        }
    }

    if ($deliveryMethod === 'europost' && $pickupPoint === '') {
        return 'Для Европочты укажите номер отделения.';
    }

    if ($paymentMethod === '') {
        return 'Выберите способ оплаты.';
    }

    return null;
}

function buildTelegramMessage(array $payload): string
{
    $customer = isset($payload['customer']) && is_array($payload['customer']) ? $payload['customer'] : [];
    $order = isset($payload['order']) && is_array($payload['order']) ? $payload['order'] : [];
    $meta = isset($payload['meta']) && is_array($payload['meta']) ? $payload['meta'] : [];
    $items = isset($order['items']) && is_array($order['items']) ? $order['items'] : [];
    $address = isset($customer['address']) && is_array($customer['address']) ? $customer['address'] : [];
    $deliveryMethod = trim((string) ($order['deliveryMethod'] ?? ''));
    $deliveryMethodLabel = trim((string) ($order['deliveryLabel'] ?? ''));

    $lines = [
        '<b>Новый заказ YOLOOK</b>',
        '',
        '<b>Имя:</b> ' . escapeTelegram((string) ($customer['name'] ?? '')),
        '<b>Телефон:</b> ' . escapeTelegram((string) ($customer['phone'] ?? '')),
        '<b>Email:</b> ' . escapeTelegram((string) ($customer['email'] ?? 'Не указан')),
        '<b>Комментарий:</b> ' . escapeTelegram((string) ($customer['comment'] ?? '—')),
    ];

    if ($deliveryMethodLabel !== '') {
        $lines[] = '<b>Доставка:</b> ' . escapeTelegram($deliveryMethodLabel);
    }

    if ($deliveryMethod === 'belpost') {
        $lines[] = '<b>Область:</b> ' . escapeTelegram((string) ($address['region'] ?? ''));
        $lines[] = '<b>Город:</b> ' . escapeTelegram((string) ($address['city'] ?? ''));
        $lines[] = '<b>Улица:</b> ' . escapeTelegram((string) ($address['street'] ?? ''));
        $lines[] = '<b>Дом:</b> ' . escapeTelegram((string) ($address['house'] ?? ''));
        $lines[] = '<b>Квартира / офис:</b> ' . escapeTelegram((string) ($address['apartment'] ?? 'Не указаны'));
        $lines[] = '<b>Индекс:</b> ' . escapeTelegram((string) ($address['postalCode'] ?? ''));
    }

    if ($deliveryMethod === 'europost') {
        $lines[] = '<b>Отделение Европочты:</b> ' . escapeTelegram((string) ($address['pickupPoint'] ?? ''));
    }

    $lines[] = '';
    $lines[] = '<b>Состав заказа:</b>';

    foreach ($items as $index => $item) {
        $name = escapeTelegram((string) ($item['name'] ?? 'Товар'));
        $qty = (int) ($item['qty'] ?? 0);
        $linePrice = formatByn((int) ($item['linePrice'] ?? 0));
        $lines[] = ($index + 1) . '. ' . $name . ' x ' . $qty . ' — ' . $linePrice;
    }

    $lines[] = '';
    $lines[] = '<b>Товаров:</b> ' . (int) ($order['totalQty'] ?? 0);
    $lines[] = '<b>Сумма:</b> ' . formatByn((int) ($order['subtotal'] ?? 0));
    $lines[] = '<b>Скидка:</b> ' . formatByn((int) ($order['discountAmount'] ?? 0));
    $lines[] = '<b>Итого:</b> ' . formatByn((int) ($order['total'] ?? 0));

    $paymentLabel = trim((string) ($order['paymentLabel'] ?? ''));
    $paymentNote = trim((string) ($order['paymentNote'] ?? ''));
    $paymentAmount = (int) round((float) ($order['paymentAmount'] ?? 0));
    $outstandingAmount = (int) round((float) ($order['outstandingAmount'] ?? 0));

    if ($paymentLabel !== '') {
        $lines[] = '<b>Оплата:</b> ' . escapeTelegram($paymentLabel);
    }

    if ($paymentNote !== '') {
        $lines[] = '<b>Комментарий по оплате:</b> ' . escapeTelegram($paymentNote);
    }

    if ($paymentAmount > 0) {
        $lines[] = '<b>К оплате онлайн сейчас:</b> ' . formatByn($paymentAmount);
    }

    if ($outstandingAmount > 0) {
        $lines[] = '<b>Остаток при получении:</b> ' . formatByn($outstandingAmount);
    }

    $promoCode = trim((string) ($order['promoCode'] ?? ''));

    if ($promoCode !== '') {
        $lines[] = '<b>Промокод:</b> ' . escapeTelegram($promoCode);
    }

    $submittedAt = trim((string) ($meta['submittedAt'] ?? ''));

    if ($submittedAt !== '') {
        $lines[] = '<b>Дата:</b> ' . escapeTelegram($submittedAt);
    }

    $pageUrl = trim((string) ($meta['pageUrl'] ?? ''));

    if ($pageUrl !== '') {
        $lines[] = '<b>Страница:</b> ' . escapeTelegram($pageUrl);
    }

    return implode("\n", $lines);
}

function discoverTelegramChatId(string $token): ?string
{
    $response = telegramApiRequest($token, 'getUpdates', [
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

function getRecipientChatIds(): array
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
        $discoveredChatId = discoverTelegramChatId(YOLOOK_TELEGRAM_BOT_TOKEN);

        if ($discoveredChatId !== null && $discoveredChatId !== '') {
            $chatIds[] = $discoveredChatId;
        }
    }

    return array_values(array_unique($chatIds));
}

function telegramApiRequest(string $token, string $method, array $payload): ?array
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

function formatByn(int $amount): string
{
    return number_format($amount, 0, '.', ' ') . ' BYN';
}

function escapeTelegram(string $value): string
{
    $trimmed = trim($value);
    return htmlspecialchars($trimmed !== '' ? $trimmed : '—', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
