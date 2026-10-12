<?php
// Synthetic credentials only; no Zoom network requests or database writes.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['services.zoom' => ['client_id'=>'test-client','client_secret'=>'test-private','account_id'=>'test-account','meeting_sdk_key'=>'test-sdk','meeting_sdk_secret'=>'test-signature-secret']]);
$s = new Modules\Course\Services\ZoomLiveService;
if (!$s->zoomConfig['zoom_enabled'] || !$s->zoomConfig['zoom_web_sdk'] || count($s->zoomConfig) !== 3 || str_contains(json_encode($s->zoomConfig),'secret') || str_contains(json_encode($s->zoomConfig),'test-private')) exit(1);
$jwt = explode('.', $s->generateSignature('123456789', 0));
$expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $jwt[0].'.'.$jwt[1], 'test-signature-secret', true)), '+/', '-_'), '=');
if (!hash_equals($expected, $jwt[2])) exit(1);
config(['services.zoom' => []]);
$s = new Modules\Course\Services\ZoomLiveService;
if ($s->zoomConfig['zoom_enabled'] || $s->zoomConfig['zoom_web_sdk']) exit(1);
try { $s->createZoomToken(); exit(1); } catch(RuntimeException $e) {}
echo "PASS: environment-only config, public props exclude secrets, SDK signature and missing-credentials handling.\n";
