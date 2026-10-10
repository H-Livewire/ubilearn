<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SmtpConfig
{
    public function __construct(private SettingsService $settingsService) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Authentication and account page views do not send email.
        if ($request->routeIs('login.*') || (
            $request->isMethodSafe()
            && $request->routeIs('student.index', 'register.index', 'forgot-password.index', 'reset-password.index')
        )) {
            return $next($request);
        }

        $smtp = $this->settingsService->getSetting(['type' => 'smtp'])['fields'];

        // SMTP configuration
        config([
            'mail.default' => $smtp['mail_mailer'],
            'mail.mailers.smtp.host' => $smtp['mail_host'],
            'mail.mailers.smtp.port' => intval($smtp['mail_port']),
            'mail.mailers.smtp.encryption' => $smtp['mail_encryption'],
            'mail.mailers.smtp.username' => $smtp['mail_username'],
            'mail.mailers.smtp.password' => $smtp['mail_password'],
            'mail.mailers.smtp.timeout' => null,
            // 'mail.mailers.smtp.local_domain' => $_SERVER['SERVER_NAME'],
            'mail.from.name' => $smtp['mail_from_name'],
            'mail.from.address' => $smtp['mail_from_address'],
        ]);

        // Check SMTP configuration from config
        if (config('mail.default') === 'smtp') {
            // Check if required SMTP credentials exist in config
            if (
                empty(config('mail.mailers.smtp.host')) ||
                empty(config('mail.mailers.smtp.port')) ||
                empty(config('mail.mailers.smtp.username')) ||
                empty(config('mail.mailers.smtp.password'))
            ) {
                if ($request->routeIs('register.store')) {
                    config(['mail.defer_registration_verification' => true]);

                    return $next($request);
                }

                return back()->with('error', 'SMTP configuration is incomplete. Email sending feature is not work right now.');
            }
        }

        return $next($request);
    }
}
