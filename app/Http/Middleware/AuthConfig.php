<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthConfig
{
    public function __construct(private SettingsService $settingsService) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $auth = $this->settingsService->getSetting([
            'type' => 'auth',
            'sub_type' => 'google',
        ])?->fields ?? [];

        $recaptcha = $this->settingsService->getSetting([
            'type' => 'auth',
            'sub_type' => 'recaptcha',
        ])?->fields ?? [];

        config(['services.google' => \App\Services\GoogleLoginConfig::resolve($auth)]);

        // Recaptcha configuration
        config([
            'captcha.status' => ($recaptcha['active'] ?? false),
            'captcha.secret' => ($recaptcha['secret_key'] ?? ''),
            'captcha.sitekey' => ($recaptcha['site_key'] ?? ''),
        ]);

        return $next($request);
    }
}
