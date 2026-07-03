<?php

declare(strict_types=1);

function yolook_read_request_payload(): array
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

function yolook_validate_order_payload(array $payload): ?string
{
    $customer = isset($payload['customer']) && is_array($payload['customer']) ? $payload['customer'] : [];
    $order = isset($payload['order']) && is_array($payload['order']) ? $payload['order'] : [];
    $items = isset($order['items']) && is_array($order['items']) ? $order['items'] : [];
    $address = isset($customer['address']) && is_array($customer['address']) ? $customer['address'] : [];

    $name = trim((string) ($customer['name'] ?? ''));
    $phone = preg_replace('/\D+/', '', (string) ($customer['phone'] ?? ''));
    $email = trim((string) ($customer['email'] ?? ''));
    $consent = !empty($customer['consent']);
    $paymentMethod = trim((string) ($order['paymentMethod'] ?? ''));
    $deliveryMethod = trim((string) ($order['deliveryMethod'] ?? ''));
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
