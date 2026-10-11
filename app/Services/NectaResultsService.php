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

    public function lookup(string $level, int $year, string $index): array
    {
        $index = strtoupper(trim($index));
        $index = preg_replace('~[.\-]~', '/', $index);
        $index = preg_replace('~/'.preg_quote((string) $year, '~').'$~', '', $index);
        if (!preg_match('~^([SP]\d{4}|PS\d{7,})/(\d{4})$~', $index, $match)) {
            throw ValidationException::withMessages(['index' => 'Andika namba kamili, mfano S0156/0001 au P0156/0001.']);
        }
        $entry = collect($this->years($level))->firstWhere('year', $year);
        if (!$entry) throw ValidationException::withMessages(['year' => 'Matokeo ya mwaka huu hayajaonekana kwenye orodha rasmi ya NECTA.']);
        $key = 'necta:lookup:v3:'.$level.':'.$year.':'.$index;
        return Cache::remember($key, 3600, function () use ($entry, $match, $index) {
            $directory = $this->browse($entry['key']);
            $centre = collect($directory['children'])->first(fn ($child) => preg_match('~^'.preg_quote($match[1], '~').'\b~i', ($child['centre'] ?? '').' '.$child['label']));
            if (!$centre) throw ValidationException::withMessages(['index' => 'Kituo hakijaonekana kwenye orodha hii. Hakiki namba au fungua NECTA kwa matokeo ya shule za msingi.']);
            $results = $this->browse($centre['key']);
            $candidate = collect($results['candidates'])->first(fn ($row) => strtoupper($row['index']) === $index);
            if (!$candidate) throw ValidationException::withMessages(['index' => 'Namba hii haijaonekana kwenye kituo. Hakiki mwaka, kiwango na namba ya mtihani.']);
            return ['candidate' => $candidate, 'source' => $results['source']];
        });
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

    public function resultSummary(array $cells): array
    {
        $division = null; $points = null; $status = 'Not available';
        foreach ($cells as $position => $cell) {
            if (!in_array(strtoupper(trim($cell)), ['M', 'F'], true)) continue;
            $aggregate = trim($cells[$position + 1] ?? '');
            $reportedDivision = strtoupper(trim($cells[$position + 2] ?? ''));
            if (!in_array($reportedDivision, ['I', 'II', 'III', 'IV', '0'], true)) continue;
            $division = $reportedDivision;
            $points = is_numeric($aggregate) ? (float) $aggregate : null;
            $status = $division === '0' ? 'Failed' : 'Passed';
            break;
        }
        if ($division === null) {
            foreach ($cells as $cell) {
                if (preg_match('/^ABS(?:ENT)?$/i', trim($cell))) $status = 'Absent';
                elseif (preg_match('/^(W[\/ -]?H|WITHHELD)$/i', trim($cell))) $status = 'Withheld';
            }
        }
        return ['division' => $division, 'points' => $points, 'status' => $status];
    }

    public function browse(string $key): array
    {
        $url = Cache::get('necta:url:'.$key);
        if (!$url) throw ValidationException::withMessages(['key' => 'Chagua mwaka tena; orodha imeisha muda.']);
        $doc = $this->document($url);
        $candidates = [];
        // Some NECTA pages omit opening <tr> tags. Read cells in table order
        // and start each candidate at its examination number instead.
        foreach ($doc->query('//table[not(.//table)]') as $table) {
            $groups = []; $cells = [];
            foreach ($doc->query('.//td', $table) as $cell) {
                $text = trim(preg_replace('/\s+/u', ' ', $cell->textContent));
                if (preg_match('~^[SP]\d{4}/\d{4}$|^PS\d+[/-]\d+$~i', $text)) {
                    if ($cells) $groups[] = $cells;
                    $cells = [$text];
                } elseif ($cells) { $cells[] = $text; }
            }
            if ($cells) $groups[] = $cells;
            foreach ($groups as $cells) {
                $grades = [];
                preg_match_all("/([A-Z][A-Z\/._]{1,30}(?:\s+(?:STUD|SCIENCE|KNOW))?)\s*[-:]\s*['’]?([A-FS]\+?)['’]?/", implode(' ', $cells), $matches, PREG_SET_ORDER);
                foreach ($matches as $grade) $grades[trim($grade[1])] = $grade[2];
                $candidates[] = ['index' => $cells[0], 'cells' => $cells, 'grades' => $grades, 'summary' => $this->resultSummary($cells)];
            }
        }
        $links = [];
        if (!$candidates) {
            foreach ($doc->query('//a[@href]') as $anchor) {
                $href = $anchor->getAttribute('href');
                $next = (string) UriResolver::resolve(new Uri($url), new Uri($href));
                $label = trim(preg_replace('/\s+/u', ' ', $anchor->textContent));
                if (!$label || $next === $url || !preg_match('~\.(?:html?|php)(?:\?.*)?$~i', $next) || !in_array(parse_url($next, PHP_URL_HOST), self::HOSTS, true) || !str_contains($next, '/results/')) continue;
                if (strlen($label) < 3) continue;
                $links[$next] = ['label' => $label, 'centre' => strtoupper(pathinfo(parse_url($next, PHP_URL_PATH), PATHINFO_FILENAME)), 'key' => $this->rememberUrl($next)];
            }
        }
        return ['source' => $url, 'children' => array_values($links), 'candidates' => $candidates];
    }
}
