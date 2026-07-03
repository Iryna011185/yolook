<?php

declare(strict_types=1);

function yolook_map_express_pay_status(int $statusCode): array
{
    switch ($statusCode) {
        case 1:
            return [
                'paymentStatus' => 'pending',
                'orderStatus' => 'awaiting_payment',
                'isPaid' => false,
                'label' => 'Ожидает оплату',
            ];
        case 2:
            return [
                'paymentStatus' => 'expired',
                'orderStatus' => 'payment_expired',
                'isPaid' => false,
                'label' => 'Счет просрочен',
            ];
        case 3:
            return [
                'paymentStatus' => 'paid',
                'orderStatus' => 'processing',
                'isPaid' => true,
                'label' => 'Оплачен',
            ];
        case 4:
            return [
                'paymentStatus' => 'partial',
                'orderStatus' => 'partial_payment',
                'isPaid' => false,
                'label' => 'Оплачен частично',
            ];
        case 5:
            return [
                'paymentStatus' => 'cancelled',
                'orderStatus' => 'payment_cancelled',
                'isPaid' => false,
                'label' => 'Отменен',
            ];
        case 6:
            return [
                'paymentStatus' => 'paid',
                'orderStatus' => 'processing',
                'isPaid' => true,
                'label' => 'Оплачен банковской картой',
            ];
        case 7:
            return [
                'paymentStatus' => 'refunded',
                'orderStatus' => 'payment_refunded',
                'isPaid' => false,
                'label' => 'Платеж возвращен',
            ];
        default:
            return [
                'paymentStatus' => 'unknown',
                'orderStatus' => 'payment_unknown',
                'isPaid' => false,
                'label' => 'Неизвестный статус',
            ];
    }
}

function yolook_apply_payment_method_state(array $mappedState, array $order): array
{
    $paymentMethod = trim((string) ($order['order']['paymentMethod'] ?? ''));

    if ($mappedState['isPaid'] !== true || $paymentMethod !== 'cod') {
        return $mappedState;
    }

    return [
        'paymentStatus' => 'deposit_paid',
        'orderStatus' => 'processing',
        'isPaid' => true,
        'label' => 'Предоплата получена, остаток при получении',
    ];
}
