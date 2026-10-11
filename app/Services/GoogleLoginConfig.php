<?php

namespace App\Services;

class GoogleLoginConfig
{
    public static function resolve(array $settings): array
    {
        $saved = !empty($settings['client_id']) && !empty($settings['client_secret']);
        return [
            'status' => $saved ? !empty($settings['active']) : (bool) config('services.google.status'),
            'client_id' => $saved ? $settings['client_id'] : config('services.google.client_id'),
            'client_secret' => $saved ? $settings['client_secret'] : config('services.google.client_secret'),
            'redirect' => $saved && !empty($settings['redirect']) ? $settings['redirect'] : config('services.google.redirect'),
        ];
    }

    public static function enabled(array $config): bool
    {
        return $config['status'] && !empty($config['client_id']) && !empty($config['client_secret']) && !empty($config['redirect']);
    }
}
