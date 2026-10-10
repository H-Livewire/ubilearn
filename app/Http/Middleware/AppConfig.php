<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AppConfig
{
    public function __construct(private SettingsService $settingsService) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (isInstallerRequest($request)) {
            return $next($request);
        }

        $systemSetting = $this->settingsService->getSetting(['type' => 'system']);
        $system = $systemSetting ? $systemSetting['fields'] : [];

        $storageSetting = $this->settingsService->getSetting(['type' => 'storage']);
        $storage = $storageSetting ? $storageSetting['fields'] : [];

        // App configuration
        config(['app.name' => $system['name'] ?? config('app.name')]);

        $storageDriver = $storage['storage_driver'] ?? 'local';
        $environmentDisk = config('filesystems.default', 'local');
        $mediaDisk = config('media-library.disk_name', 'public');
        if ($storageDriver === 'local' && !in_array($environmentDisk, ['local', 'public'], true)) {
            $storageDriver = $environmentDisk;
            $mediaDisk = $environmentDisk;
        }

        // Every configured driver's credentials are loaded regardless of
        // which one is currently active. A lesson/file already stored on
        // S3 or R2 must stay resolvable (e.g. via LessonVideoUrlResolver's
        // signed URLs) after the admin switches the active driver
        // elsewhere — only filesystems.default/media-library.disk_name
        // below decide where *new* uploads go.
        config([
            'filesystems.disks.s3.key' => ($storage['aws_access_key_id'] ?? '') ?: config('filesystems.disks.s3.key', ''),
            'filesystems.disks.s3.secret' => ($storage['aws_secret_access_key'] ?? '') ?: config('filesystems.disks.s3.secret', ''),
            'filesystems.disks.s3.region' => ($storage['aws_default_region'] ?? '') ?: config('filesystems.disks.s3.region', ''),
            'filesystems.disks.s3.bucket' => ($storage['aws_bucket'] ?? '') ?: config('filesystems.disks.s3.bucket', ''),
        ]);

        config([
            'filesystems.disks.r2.key' => ($storage['r2_access_key_id'] ?? '') ?: config('filesystems.disks.r2.key', ''),
            'filesystems.disks.r2.secret' => ($storage['r2_secret_access_key'] ?? '') ?: config('filesystems.disks.r2.secret', ''),
            'filesystems.disks.r2.region' => ($storage['r2_region'] ?? '') ?: config('filesystems.disks.r2.region', 'auto'),
            'filesystems.disks.r2.bucket' => ($storage['r2_bucket'] ?? '') ?: config('filesystems.disks.r2.bucket', ''),
            'filesystems.disks.r2.url' => ($storage['r2_public_url'] ?? '') ?: config('filesystems.disks.r2.url', ''),
            'filesystems.disks.r2.endpoint' => ($storage['r2_endpoint'] ?? '') ?: config('filesystems.disks.r2.endpoint', ''),
        ]);

        config([
            'services.bunny.library_id' => $storage['bunny_library_id'] ?? '',
            'services.bunny.api_key' => $storage['bunny_api_key'] ?? '',
            'services.bunny.token_auth_key' => $storage['bunny_token_auth_key'] ?? '',
        ]);

        // The active driver only decides where *new* uploads/media go.
        // Bunny only hosts lesson videos — it has no generic file API for
        // images/documents/previews, so those fall back to local while
        // Bunny is active.
        match ($storageDriver) {
            's3' => config(['filesystems.default' => 's3', 'media-library.disk_name' => 's3']),
            'r2' => config(['filesystems.default' => 'r2', 'media-library.disk_name' => 'r2']),
            default => config(['filesystems.default' => $environmentDisk, 'media-library.disk_name' => $mediaDisk]),
        };

        // Check S3 configuration from config
        if ($storageDriver === 's3') {
            // Check if required S3 credentials exist in config
            if (
                empty(config('filesystems.disks.s3.key')) ||
                empty(config('filesystems.disks.s3.secret')) ||
                empty(config('filesystems.disks.s3.region')) ||
                empty(config('filesystems.disks.s3.bucket'))
            ) {
                return back()->with('error', 'S3 storage configuration is incomplete. File will not upload to the S3 right now.');
            }
        }

        // Check R2 configuration from config
        if ($storageDriver === 'r2') {
            // Check if required R2 credentials exist in config. r2.url
            // (Public URL) is intentionally excluded — it's optional and
            // only affects whether images/documents/previews display, not
            // whether uploads work.
            if (
                empty(config('filesystems.disks.r2.key')) ||
                empty(config('filesystems.disks.r2.secret')) ||
                empty(config('filesystems.disks.r2.bucket')) ||
                empty(config('filesystems.disks.r2.endpoint'))
            ) {
                return back()->with('error', 'Cloudflare R2 storage configuration is incomplete. File will not upload to R2 right now.');
            }
        }

        // Check Bunny configuration from config
        if ($storageDriver === 'bunny') {
            if (
                empty(config('services.bunny.library_id')) ||
                empty(config('services.bunny.api_key')) ||
                empty(config('services.bunny.token_auth_key'))
            ) {
                return back()->with('error', 'Bunny Stream configuration is incomplete. Lesson videos will not upload to Bunny right now.');
            }
        }

        return $next($request);
    }
}
