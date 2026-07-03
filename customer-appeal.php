<?php

declare(strict_types=1);

require __DIR__ . '/telegram-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirectToAppeals('error');
}

$name = trim((string) ($_POST['name'] ?? ''));
$replyTo = trim((string) ($_POST['reply_to'] ?? ''));
$orderNumber = trim((string) ($_POST['order_number'] ?? ''));
$subject = trim((string) ($_POST['subject'] ?? ''));
$appealType = trim((string) ($_POST['appeal_type'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));
$consent = !empty($_POST['consent']);

if ($name === '' || $replyTo === '' || $subject === '' || $appealType === '' || $message === '' || !$consent) {
    redirectToAppeals('error');
}

$chatIds = getRecipientChatIds();

if (count($chatIds) === 0) {
    redirectToAppeals('error');
}

$text = buildAppealMessage([
    'name' => $name,
    'reply_to' => $replyTo,
    'order_number' => $orderNumber,
    'subject' => $subject,
    'appeal_type' => $appealType,
    'message' => $message,
]);

$sent = false;

foreach ($chatIds as $chatId) {
    $telegramResponse = telegramApiRequest(YOLOOK_TELEGRAM_BOT_TOKEN, 'sendMessage', [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true,
    ]);

    if (is_array($telegramResponse) && !empty($telegramResponse['ok'])) {
        $sent = true;
    }
}

redirectToAppeals($sent ? 'success' : 'error');

function buildAppealMessage(array $payload): string
{
    $appealTypeMap = [
        'question' => 'Вопрос',
        'claim' => 'Претензия',
        'proposal' => 'Предложение',
        'other' => 'Иное',
    ];

    $typeLabel = $appealTypeMap[$payload['appeal_type']] ?? 'Иное';

    $lines = [
        '<b>Новое электронное обращение YOLOOK</b>',
        '',
        '<b>Имя:</b> ' . escapeTelegram($payload['name']),
        '<b>Контакт для ответа:</b> ' . escapeTelegram($payload['reply_to']),
        '<b>Номер заказа:</b> ' . escapeTelegram($payload['order_number'] !== '' ? $payload['order_number'] : 'Не указан'),
        '<b>Тип обращения:</b> ' . escapeTelegram($typeLabel),
        '<b>Тема:</b> ' . escapeTelegram($payload['subject']),
        '<b>Текст:</b> ' . escapeTelegram($payload['message']),
        '<b>Дата:</b> ' . escapeTelegram(date(DATE_ATOM)),
    ];

    return implode("\n", $lines);
}

function redirectToAppeals(string $status): void
{
    header('Location: ./appeals.html?status=' . urlencode($status), true, 303);
    exit;
}

function escapeTelegram(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
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

    if (!is_string($responseBody)) {
        return null;
    }

    $decoded = json_decode($responseBody, true);
    return is_array($decoded) ? $decoded : null;
}
