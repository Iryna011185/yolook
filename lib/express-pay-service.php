<?php

declare(strict_types=1);

require_once __DIR__ . '/app-env.php';

final class ExpressPayService
{
    private string $baseUrl;
    private string $token;
    private string $secretWord;
    private string $serviceId;
    private string $currency;
    private string $returnUrl;
    private string $failUrl;
    private int $invoiceTtlDays;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) yolook_env('EXPRESS_PAY_BASE_URL', 'https://api.express-pay.by/v1'), '/');
        $this->token = (string) yolook_env('EXPRESS_PAY_TOKEN', '');
        $this->secretWord = (string) yolook_env('EXPRESS_PAY_SECRET_WORD', '');
        $this->serviceId = (string) yolook_env('EXPRESS_PAY_SERVICE_ID', '35786');
        $this->currency = (string) yolook_env('EXPRESS_PAY_CURRENCY', '933');
        $this->returnUrl = (string) yolook_env('EXPRESS_PAY_RETURN_URL', 'https://yolook.by/payment/success');
        $this->failUrl = (string) yolook_env('EXPRESS_PAY_FAIL_URL', 'https://yolook.by/payment/fail');
        $this->invoiceTtlDays = max(1, (int) yolook_env('EXPRESS_PAY_INVOICE_TTL_DAYS', '3'));
    }

    public function isEnabled(): bool
    {
        return yolook_env_bool('EXPRESS_PAY_ENABLED', false);
    }

    public function assertReady(): void
    {
        if (!$this->isEnabled()) {
            throw new RuntimeException('Express Pay отключен в конфигурации.');
        }

        if ($this->token === '' || $this->secretWord === '') {
            throw new RuntimeException('Не заполнены EXPRESS_PAY_TOKEN или EXPRESS_PAY_SECRET_WORD.');
        }
    }

    public function createInvoice(array $order): array
    {
        $this->assertReady();

        $orderNumber = trim((string) ($order['orderNumber'] ?? ''));
        $accountNo = trim((string) ($order['expressPayAccountNo'] ?? ''));
        $customer = isset($order['customer']) && is_array($order['customer']) ? $order['customer'] : [];
        $orderSummary = isset($order['order']) && is_array($order['order']) ? $order['order'] : [];
        $paymentMethod = trim((string) ($orderSummary['paymentMethod'] ?? ''));
        $paymentAmount = (float) ($orderSummary['paymentAmount'] ?? ($orderSummary['total'] ?? 0));
        $outstandingAmount = (float) ($orderSummary['outstandingAmount'] ?? 0);

        if ($orderNumber === '' || $accountNo === '') {
            throw new RuntimeException('Не удалось подготовить номер заказа для Express Pay.');
        }

        if ($paymentAmount <= 0) {
            throw new RuntimeException('Сумма к оплате должна быть больше нуля.');
        }

        $paymentDescription = $paymentMethod === 'cod'
            ? 'Предоплата по заказу №' . $orderNumber . ' на yolook.by'
            : 'Оплата заказа №' . $orderNumber . ' на yolook.by';

        if ($paymentMethod === 'cod' && $outstandingAmount > 0) {
            $paymentDescription .= '. Остаток к получению: ' . self::formatAmount($outstandingAmount) . ' BYN';
        }

        $payload = [
            'Token' => $this->token,
            'ServiceId' => $this->serviceId,
            'AccountNo' => $accountNo,
            'Amount' => self::formatAmount($paymentAmount),
            'Currency' => $this->currency,
            'Expiration' => gmdate('Ymd', strtotime('+' . $this->invoiceTtlDays . ' day')),
            'Info' => $paymentDescription,
            'ReturnType' => 'json',
            'ReturnUrl' => $this->appendOrderNumberToUrl($this->returnUrl, $orderNumber),
            'FailUrl' => $this->appendOrderNumberToUrl($this->failUrl, $orderNumber),
            'ReturnInvoiceUrl' => 1,
            'IsNameEditable' => 0,
            'IsAddressEditable' => 0,
            'IsAmountEditable' => 0,
        ];

        $email = trim((string) ($customer['email'] ?? ''));
        $phone = $this->normalizeSmsPhone((string) ($customer['phone'] ?? ''));

        if ($email !== '') {
            $payload['EmailNotification'] = $email;
        }

        if ($phone !== '') {
            $payload['SmsPhone'] = $phone;
        }

        $signature = self::computeSignatureForWebInvoice($payload, $this->secretWord);
        unset($payload['Token']);
        $payload['Signature'] = $signature;

        $response = $this->requestJson('POST', '/web_invoices', $payload, [], true);
        $invoiceNo = $this->extractScalarValue($response, [
            'ExpressPayInvoiceNo',
            'InvoiceNo',
            'invoice_no',
            'InvoiceNumber',
            'invoiceNumber',
        ]);
        $invoiceUrl = $this->extractScalarValue($response, [
            'ExpressPayInvoiceUrl',
            'InvoiceUrl',
            'invoice_url',
            'InvoiceURL',
            'InvoiceLink',
        ]);

        if ($invoiceNo === '' || $invoiceUrl === '') {
            throw new RuntimeException('Express Pay не вернул номер счета или ссылку на оплату.');
        }

        return [
            'invoiceNo' => $invoiceNo,
            'invoiceUrl' => $invoiceUrl,
            'signature' => $signature,
            'requestPayload' => $payload,
            'rawResponse' => $response,
        ];
    }

    public function getInvoiceStatus(string $invoiceNo): array
    {
        $this->assertReady();

        $signature = strtoupper(hash_hmac('sha1', $this->token . $invoiceNo, $this->secretWord));

        return $this->requestJson('GET', '/invoices/' . rawurlencode($invoiceNo) . '/status', [], [
            'token' => $this->token,
            'InvoiceNo' => $invoiceNo,
            'signature' => $signature,
        ]);
    }

    public static function computeSignatureForWebInvoice(array $params, string $secretWord): string
    {
        $normalized = [];

        foreach ($params as $key => $value) {
            $normalized[strtolower((string) $key)] = is_scalar($value) ? (string) $value : '';
        }

        $signatureFields = [
            'token',
            'serviceid',
            'accountno',
            'amount',
            'currency',
            'expiration',
            'info',
            'surname',
            'firstname',
            'patronymic',
            'city',
            'street',
            'house',
            'building',
            'apartment',
            'isnameeditable',
            'isaddresseditable',
            'isamounteditable',
            'emailnotification',
            'smsphone',
            'returntype',
            'returnurl',
            'failurl',
            'returninvoiceurl',
        ];

        $baseString = '';

        foreach ($signatureFields as $field) {
            $baseString .= $normalized[$field] ?? '';
        }

        return strtoupper(hash_hmac('sha1', $baseString, $secretWord));
    }

    public static function verifyWebhookSignature(string $rawData, string $signature, string $secretWord): bool
    {
        $computed = strtoupper(hash_hmac('sha1', $rawData, $secretWord));
        return hash_equals($computed, strtoupper(trim($signature)));
    }

    public function getSecretWord(): string
    {
        return $this->secretWord;
    }

    private function requestJson(
        string $method,
        string $path,
        array $payload = [],
        array $query = [],
        bool $sendAsFormUrlEncoded = false
    ): array
    {
        $url = $this->baseUrl . $path;

        if ($query !== []) {
            $url .= '?' . http_build_query($query);
        }

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            $headers = [
                'Accept: application/json',
            ];

            $options = [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 15,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_HTTPHEADER => $headers,
            ];

            if ($method !== 'GET') {
                if ($sendAsFormUrlEncoded) {
                    $encodedPayload = http_build_query($payload);
                    $headers[] = 'Content-Type: application/x-www-form-urlencoded';
                } else {
                    $encodedPayload = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $headers[] = 'Content-Type: application/json';
                }

                $options[CURLOPT_POSTFIELDS] = $encodedPayload;
                $options[CURLOPT_HTTPHEADER] = $headers;
            }

            curl_setopt_array($ch, $options);
            $responseBody = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if (!is_string($responseBody) || $responseBody === '') {
                throw new RuntimeException('Express Pay не ответил: ' . ($curlError !== '' ? $curlError : 'пустой ответ'));
            }

            $decoded = json_decode($responseBody, true);

            if (!is_array($decoded)) {
                throw new RuntimeException('Express Pay вернул некорректный JSON.');
            }

            if ($httpCode >= 400) {
                throw new RuntimeException($this->extractApiError($decoded, 'Express Pay вернул ошибку HTTP ' . $httpCode . '.'));
            }

            if (!$this->isSuccessfulApiResponse($decoded)) {
                throw new RuntimeException($this->extractApiError($decoded, 'Express Pay отклонил запрос.'));
            }

            return $decoded;
        }

        $contextOptions = [
            'http' => [
                'method' => $method,
                'header' => "Accept: application/json\r\n",
                'timeout' => 30,
                'ignore_errors' => true,
            ],
        ];

        if ($method !== 'GET') {
            if ($sendAsFormUrlEncoded) {
                $contextOptions['http']['header'] .= "Content-Type: application/x-www-form-urlencoded\r\n";
                $contextOptions['http']['content'] = http_build_query($payload);
            } else {
                $contextOptions['http']['header'] .= "Content-Type: application/json\r\n";
                $contextOptions['http']['content'] = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        $context = stream_context_create($contextOptions);
        $responseBody = @file_get_contents($url, false, $context);

        if (!is_string($responseBody) || $responseBody === '') {
            throw new RuntimeException('Express Pay не ответил на запрос.');
        }

        $decoded = json_decode($responseBody, true);

        if (!is_array($decoded)) {
            throw new RuntimeException('Express Pay вернул некорректный JSON.');
        }

        if (!$this->isSuccessfulApiResponse($decoded)) {
            throw new RuntimeException($this->extractApiError($decoded, 'Express Pay отклонил запрос.'));
        }

        return $decoded;
    }

    private function appendOrderNumberToUrl(string $url, string $orderNumber): string
    {
        $separator = strpos($url, '?') === false ? '?' : '&';
        return $url . $separator . 'order=' . rawurlencode($orderNumber);
    }

    private function normalizeSmsPhone(string $phone): string
    {
        $digitsOnly = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digitsOnly === '') {
            return '';
        }

        return substr($digitsOnly, 0, 16);
    }

    private function extractScalarValue(array $data, array $possibleKeys): string
    {
        foreach ($possibleKeys as $key) {
            if (isset($data[$key]) && is_scalar($data[$key])) {
                return trim((string) $data[$key]);
            }

            if (isset($data['Data'][$key]) && is_scalar($data['Data'][$key])) {
                return trim((string) $data['Data'][$key]);
            }
        }

        return '';
    }

    private function extractApiError(array $data, string $fallback): string
    {
        $possibleKeys = ['Message', 'message', 'Error', 'error', 'Errors', 'errors'];

        foreach ($possibleKeys as $key) {
            if (!isset($data[$key])) {
                continue;
            }

            if (is_scalar($data[$key])) {
                return (string) $data[$key];
            }

            if (is_array($data[$key])) {
                if (isset($data[$key]['Msg']) && is_scalar($data[$key]['Msg'])) {
                    return (string) $data[$key]['Msg'];
                }

                if (isset($data[$key]['Message']) && is_scalar($data[$key]['Message'])) {
                    return (string) $data[$key]['Message'];
                }

                return implode('; ', array_map('strval', $data[$key]));
            }
        }

        return $fallback;
    }

    private function isSuccessfulApiResponse(array $data): bool
    {
        if (isset($data['Success']) && $data['Success'] === true) {
            return true;
        }

        if (isset($data['success']) && $data['success'] === true) {
            return true;
        }

        return !(isset($data['Error']) || isset($data['error']) || isset($data['Errors']) || isset($data['errors']));
    }

    public static function formatAmount(float $amount): string
    {
        return number_format($amount, 2, ',', '');
    }
}
