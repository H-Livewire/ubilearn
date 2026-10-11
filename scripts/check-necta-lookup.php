<?php
// Synthetic malformed-table regression fixture; no database changes.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['cache.default' => 'array']);
use Illuminate\Support\Facades\Http;
Http::preventStrayRequests();
Http::fake([
    'https://www.necta.go.tz/results/view/ftna' => Http::response('<a href="https://onlinesys.necta.go.tz/results/2025/ftna/ftna.htm">2025</a>'),
    'https://onlinesys.necta.go.tz/results/2025/ftna/ftna.htm' => Http::response('<a href="results/P1234.htm">EXAMPLE CENTRE</a>'),
    'https://onlinesys.necta.go.tz/results/2025/ftna/results/P1234.htm' => Http::response('<table><tr><td>CNO</td><td>SEX</td><td>SUBJECTS</td></tr><td>P1234/0001</td><td>F</td><td>HIST-\'A\' COMP STUD-\'C\'</td></tr><td>P1234/0002</td><td>M</td><td>ABS</td></tr></table>'),
]);
$s = new App\Services\NectaResultsService;
$r = $s->lookup('ftna', 2025, 'p1234.0001.2025');
if ($r['candidate']['index'] !== 'P1234/0001' || $r['candidate']['grades']['COMP STUD'] !== 'C') { fwrite(STDERR, 'Parser failed'); exit(1); }
$count = count(Http::recorded());
$s->lookup('ftna', 2025, 'P1234/0001');
if (count(Http::recorded()) !== $count) { fwrite(STDERR, 'Cache missed'); exit(1); }
try { $s->lookup('ftna', 2025, 'P1234/9999'); fwrite(STDERR, 'Missing candidate accepted'); exit(1); }
catch (Illuminate\Validation\ValidationException $e) {}
echo "PASS: malformed rows, number normalization, exact candidate, cache and missing result.\n";
