<?php

declare(strict_types=1);

yolook_load_env(dirname(__DIR__));

function yolook_load_env(string $projectRoot): void
{
    static $loaded = false;

    if ($loaded) {
        return;
    }

    $envPath = $projectRoot . '/.env';

    if (!is_file($envPath)) {
        $loaded = true;
        return;
    }

    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if (!is_array($lines)) {
        $loaded = true;
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);

        if ($trimmed === '' || strpos($trimmed, '#') === 0) {
            continue;
        }

        $delimiterPosition = strpos($trimmed, '=');

        if ($delimiterPosition === false) {
            continue;
        }

        $key = trim(substr($trimmed, 0, $delimiterPosition));
        $value = trim(substr($trimmed, $delimiterPosition + 1));

        if ($key === '') {
            continue;
        }

        if (
            (strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
            (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)
        ) {
            $value = substr($value, 1, -1);
        }

        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    $loaded = true;
}

function yolook_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);

    if ($value === false || $value === null || $value === '') {
        return $default;
    }

    return (string) $value;
}

function yolook_env_bool(string $key, bool $default = false): bool
{
    $value = yolook_env($key);

    if ($value === null) {
        return $default;
    }

    $normalized = strtolower(trim($value));

    return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
}

function yolook_project_root(): string
{
    return dirname(__DIR__);
}

function yolook_storage_path(string $relativePath = ''): string
{
    $base = yolook_project_root() . '/data';

    if ($relativePath === '') {
        return $base;
    }

    return $base . '/' . ltrim($relativePath, '/');
}

function yolook_ensure_directory(string $path): void
{
    if (is_dir($path)) {
        return;
    }

    mkdir($path, 0775, true);
}

function yolook_now_iso8601(): string
{
    return gmdate('c');
}

function yolook_json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function yolook_mask_sensitive_value(string $value): string
{
    if ($value === '') {
        return '';
    }

    if (strlen($value) <= 6) {
        return str_repeat('*', strlen($value));
    }

    return substr($value, 0, 3) . str_repeat('*', max(0, strlen($value) - 6)) . substr($value, -3);
}

