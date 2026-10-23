<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use GuzzleHttp\Psr7\UriResolver;
use GuzzleHttp\Psr7\Uri;

class NectaResultsService
{
    public const LEVELS = ['csee' => 'Kidato cha 4', 'acsee' => 'Kidato cha 6', 'ftna' => 'Kidato cha 2', 'psle' => 'Darasa la 7', 'sfna' => 'Darasa la 4'];
    private const HOSTS = ['www.necta.go.tz', 'necta.go.tz', 'onlinesys.necta.go.tz', 'matokeo.necta.go.tz', 'results.necta.go.tz'];

    public function document(string $url): DOMXPath
    {
        for ($i = 0; $i < 4; $i++) {
            if (!in_array(parse_url($url, PHP_URL_HOST), self::HOSTS, true) || parse_url($url, PHP_URL_SCHEME) !== 'https' || parse_url($url, PHP_URL_PORT) || parse_url($url, PHP_URL_USER) || parse_url($url, PHP_URL_PASS)) {
                throw new \RuntimeException('Chanzo cha matokeo hakijathibitishwa.');
            }
            $cached = Cache::get('necta:html:v2:'.hash('sha256', $url));
            if ($cached !== null) return $this->parseDocument($cached);
            $response = Http::connectTimeout(3)->timeout(8)->withoutRedirecting()->get($url);
            if ($response->redirect()) {
                $url = (string) UriResolver::resolve(new Uri($url), new Uri($response->header('Location')));
                continue;
            }
            $response->throw();
            if (strlen($response->body()) > 10000000) throw new \RuntimeException('Ukurasa wa chanzo ni mkubwa mno.');
            Cache::put('necta:html:v2:'.hash('sha256', $url), $response->body(), 3600);
            return $this->parseDocument($response->body());
        }
        throw new \RuntimeException('Chanzo hakipatikani kwa sasa.');
    }

    private function parseDocument(string $html): DOMXPath
    {
        $dom = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        try { $dom->loadHTML('<?xml encoding="UTF-8">'.$html); }
        finally { libxml_clear_errors(); libxml_use_internal_errors($previous); }
        return new DOMXPath($dom);
    }

    /** Resolve directory links only; never download or interpret candidate results. */
    public function schoolUrl(string $level, int $year, string $school): string
    {
        $school = strtoupper(trim($school));
        $primary = in_array($level, ['psle', 'sfna'], true);
        if (!isset(self::LEVELS[$level]) || !preg_match($primary ? '/^PS[0-9]{7,10}$/' : '/^[SP][0-9]{4}$/', $school)) {
            throw ValidationException::withMessages(['school' => $primary ? 'Andika namba ya shule, mfano PS0101001.' : 'Andika namba ya shule, mfano S0156 au P0156.']);
        }
        return Cache::remember('necta:school-link:v1:'.$level.':'.$year.':'.$school, 3600, function () use ($level, $year, $school, $primary) {
            $base = 'https://www.necta.go.tz/results/view/'.$level;
            $yearUrl = null;
            foreach ($this->links($base) as $link) {
                if (preg_match('~/results/'.preg_quote((string) $year, '~').'/'.preg_quote($level, '~').'/~i', $link['url'])) {
                    $yearUrl = $link['url']; break;
                }
            }
            if (!$yearUrl) throw ValidationException::withMessages(['year' => 'Mwaka huu haujaonekana kwenye orodha rasmi ya NECTA.']);
            $links = $this->links($yearUrl);
            if ($primary) {
                // Follow published region/district links matching the school code.
                $region = substr($school, 2, 2);
                $district = substr($school, 2, 4);
                $regionLink = collect($links)->first(fn ($link) => preg_match('~^reg_(?:ps)?'.preg_quote($region, '~').'\.html?$~i', $link['file']));
                if ($regionLink) {
                    $districtLink = collect($this->links($regionLink['url']))->first(fn ($link) => preg_match('~^distr_(?:ps)?'.preg_quote($district, '~').'\.html?$~i', $link['file']));
                    if ($districtLink) $links = $this->links($districtLink['url']);
                }
            }
            foreach ($links as $link) {
                if (preg_match('~^(?:shl_)?'.preg_quote($school, '~').'\.html?$~i', $link['file'])) return $link['url'];
            }
            throw ValidationException::withMessages(['school' => 'Shule hii haijaonekana kwenye matokeo ya mwaka na kiwango ulichochagua. Hakiki namba ya shule.']);
        });
    }

    private function links(string $base): array
    {
        $links = [];
        foreach ($this->document($base)->query('//a[@href]') as $anchor) {
            $url = (string) UriResolver::resolve(new Uri($base), new Uri($anchor->getAttribute('href')));
            if (parse_url($url, PHP_URL_SCHEME) !== 'https' || !in_array(strtolower(parse_url($url, PHP_URL_HOST) ?? ''), self::HOSTS, true) || parse_url($url, PHP_URL_PORT) || parse_url($url, PHP_URL_USER) || parse_url($url, PHP_URL_PASS)) continue;
            $path = parse_url($url, PHP_URL_PATH) ?? '';
            if (!str_contains($path, '/results/')) continue;
            $links[] = ['url' => $url, 'file' => basename($path)];
        }
        return $links;
    }
}
