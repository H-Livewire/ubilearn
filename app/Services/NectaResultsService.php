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
            if (!in_array(parse_url($url, PHP_URL_HOST), self::HOSTS, true) || parse_url($url, PHP_URL_SCHEME) !== 'https') {
                throw new \RuntimeException('Chanzo cha matokeo hakijathibitishwa.');
            }
            $response = Http::timeout(20)->withoutRedirecting()->get($url);
            if ($response->redirect()) {
                $url = (string) UriResolver::resolve(new Uri($url), new Uri($response->header('Location')));
                continue;
            }
            $response->throw();
            if (strlen($response->body()) > 10000000) throw new \RuntimeException('Ukurasa wa chanzo ni mkubwa mno.');
            $dom = new DOMDocument;
            $previous = libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="UTF-8">'.$response->body());
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
            return new DOMXPath($dom);
        }
        throw new \RuntimeException('Chanzo hakipatikani kwa sasa.');
    }

    public function years(string $level): array
    {
        $years = Cache::remember('necta:years:'.$level, 3600, function () use ($level) {
            $base = 'https://www.necta.go.tz/results/view/'.$level;
            $doc = $this->document($base);
            $years = [];
            foreach ($doc->query('//a[@href]') as $anchor) {
                $url = (string) UriResolver::resolve(new Uri($base), new Uri($anchor->getAttribute('href')));
                if (preg_match('~/results/(20\d{2})/~i', $url, $match) && str_contains(strtolower($url), $level)) {
                    $years[$match[1]] = ['year' => (int) $match[1], 'key' => $this->rememberUrl($url), 'url' => $url];
                }
            }
            krsort($years);
            return array_values($years);
        });
        foreach ($years as $year) $this->rememberUrl($year['url']);
        return $years;
    }

    private function rememberUrl(string $url): string
    {
        $key = hash('sha256', $url);
        Cache::put('necta:url:'.$key, $url, 86400);
        return $key;
    }

    public function browse(string $key): array
    {
        $url = Cache::get('necta:url:'.$key);
        if (!$url) throw ValidationException::withMessages(['key' => 'Chagua mwaka tena; orodha imeisha muda.']);
        $doc = $this->document($url);
        $candidates = [];
        foreach ($doc->query('//tr') as $row) {
            $cells = [];
            foreach ($doc->query('./td', $row) as $cell) $cells[] = trim(preg_replace('/\s+/u', ' ', $cell->textContent));
            if (!$cells || !preg_match('~^[SP]\d{4}/\d{4}$|^PS\d+[/-]\d+$~i', $cells[0])) continue;
            $grades = [];
            $raw = implode(' ', $cells);
            preg_match_all("/([A-Z][A-Z\/._]{1,30})\s*[-:]\s*['’]?([A-FS]\+?)['’]?/", $raw, $matches, PREG_SET_ORDER);
            foreach ($matches as $grade) $grades[trim($grade[1])] = $grade[2];
            $candidates[] = ['index' => $cells[0], 'cells' => $cells, 'grades' => $grades];
        }
        $links = [];
        if (!$candidates) {
            foreach ($doc->query('//a[@href]') as $anchor) {
                $href = $anchor->getAttribute('href');
                $next = (string) UriResolver::resolve(new Uri($url), new Uri($href));
                $label = trim(preg_replace('/\s+/u', ' ', $anchor->textContent));
                if (!$label || $next === $url || !preg_match('~\.(?:html?|php)(?:\?.*)?$~i', $next) || !in_array(parse_url($next, PHP_URL_HOST), self::HOSTS, true) || !str_contains($next, '/results/')) continue;
                if (strlen($label) < 3) continue;
                $links[$next] = ['label' => $label, 'key' => $this->rememberUrl($next)];
            }
        }
        return ['source' => $url, 'children' => array_values($links), 'candidates' => $candidates];
    }
}
