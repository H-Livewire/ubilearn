<?php

namespace App\Services;

class EducationPathwaysService
{
    private const SUBJECTS = [
        'PHY' => 'Physics', 'PHYS' => 'Physics', 'PHYSICS' => 'Physics',
        'CHEM' => 'Chemistry', 'CHEMISTRY' => 'Chemistry', 'BIO' => 'Biology', 'BIOLOGY' => 'Biology',
        'BAM' => 'Basic Applied Mathematics', 'A/MATH' => 'Advanced Mathematics', 'ADV/MATH' => 'Advanced Mathematics', 'MATH' => 'Advanced Mathematics',
        'B/MATH' => 'Basic Mathematics', 'HIST' => 'History', 'HISTORY' => 'History', 'GEO' => 'Geography', 'GEOGR' => 'Geography',
        'ENGL' => 'English', 'ENG' => 'English', 'KISW' => 'Kiswahili', 'KISW/K' => 'Kiswahili',
        'ECON' => 'Economics', 'COMM' => 'Commerce', 'ACCT' => 'Accountancy', 'ACC' => 'Accountancy', 'B/KEEPING' => 'Accountancy',
        'COMP' => 'Computer Science', 'COMPUTER' => 'Computer Science', 'AGRI' => 'Agriculture', 'NUTR' => 'Nutrition',
        'LIT' => 'Literature in English', 'FREN' => 'French', 'ARAB' => 'Arabic', 'ISLAM' => 'Elimu ya Dini ya Kiislam',
    ];

    public function advise(string $level, int $year, array $grades): array
    {
        $normalized = [];
        foreach ($grades as $subject => $grade) {
            $subject = self::SUBJECTS[strtoupper(trim($subject))] ?? trim($subject);
            $normalized[$subject] = strtoupper($grade);
        }
        $links = [
            ['title' => 'TCU — guidebook na vyuo vya degree', 'url' => 'https://tcu.go.tz/services/admissions-coordination-and-database-management/admission-guidebooks/undergraduate'],
            ['title' => 'NACTVET — vyuo, certificate na diploma', 'url' => 'https://www.nactvet.go.tz/page/students-admission/'],
            ['title' => 'TAMISEMI — shule za A-level na selection', 'url' => 'https://selform.tamisemi.go.tz/Content/selection-and-allocation/'],
        ];
        $combinations = [];
        if ($level === 'csee') {
            foreach ([
                'PCM' => [['Physics','Chemistry','Basic Mathematics'], ['Uhandisi','Sayansi ya kompyuta']],
                'PCB' => [['Physics','Chemistry','Biology'], ['Afya','Sayansi ya maabara']],
                'PGM' => [['Physics','Geography','Basic Mathematics'], ['Jiolojia','Uhandisi','Upimaji ardhi']],
                'CBG' => [['Chemistry','Biology','Geography'], ['Kilimo','Mazingira']],
                'HGL' => [['History','Geography','English'], ['Sheria','Elimu','Mawasiliano']],
                'HGK' => [['History','Geography','Kiswahili'], ['Elimu','Uandishi','Utawala']],
                'HKL' => [['History','Kiswahili','English'], ['Lugha','Elimu','Mawasiliano']],
                'EGM' => [['Economics','Geography','Basic Mathematics'], ['Uchumi','Biashara','Takwimu']],
                'ECA' => [['Economics','Commerce','Accountancy'], ['Uhasibu','Fedha','Biashara']],
            ] as $code => [$subjects, $careers]) {
                if (count(array_filter($subjects, fn ($s) => in_array($normalized[$s] ?? '', ['A','B','C'], true))) === 3) {
                    $combinations[] = ['code' => $code, 'careers' => $careers, 'assessment' => 'Masomo yanayohusiana: '.implode(', ', $subjects).'. Yamepita A–C. Hakiki combination na nafasi kwenye TAMISEMI; huu si uthibitisho wa selection.'];
                }
            }
        }
        $programmes = [];
        if (in_array($level, ['acsee', 'csee'], true)) {
            $catalogue = json_decode(file_get_contents(resource_path('admissions/'.($level === 'acsee' ? 'tcu' : 'nactvet').'-2026-2027.json')), true, 512, JSON_THROW_ON_ERROR);
            foreach ($catalogue['programmes'] as $programme) {
                $assessment = $level === 'acsee' ? $this->assess($programme, $normalized, $year) : $this->assessDiploma($programme, $normalized);
                if ($assessment === 'Haitimizi') continue;
                $programme['assessment'] = $assessment;
                $programme['careers'] = $this->careers($programme['title']);
                $programmes[] = $programme;
            }
            usort($programmes, fn ($a, $b) => [$a['assessment'] !== 'Inatimiza vigezo vilivyosomwa', $a['institution'], $a['title']] <=> [$b['assessment'] !== 'Inatimiza vigezo vilivyosomwa', $b['institution'], $b['title']]);
        }
        return [
            'combinations' => $combinations,
            'programmes' => $programmes,
            'schools' => $level === 'csee' ? json_decode(file_get_contents(resource_path('admissions/alevel-centres-2026.json')), true, 512, JSON_THROW_ON_ERROR) : [],
            'links' => $links,
            'message' => match ($level) {
                'csee' => 'Combination ni mwongozo wa masomo yaliyofaulu. Vigezo maalumu vya certificate/diploma vinapatikana NACTVET; shule na selection ziko TAMISEMI.',
                'acsee' => 'TCU 2026/2027: “Inatimiza vigezo vilivyosomwa” ni ukaguzi wa alama, si admission. “Hakiki vigezo” huhitaji taarifa nyingine kama O-level. Chuo ndicho kinathibitisha nafasi na udahili.',
                default => 'Mapendekezo ya vyuo yanaanza Form 4 / Form 6. Kwa kiwango hiki tumia matokeo na taarifa rasmi za uchaguzi wa shule.',
            },
        ];
    }

    public function assess(array $programme, array $grades, int $year): string
    {
        $points = ($year === 2014 || $year === 2015)
            ? ['A'=>5,'B+'=>4,'B'=>3,'C'=>2]
            : ['A'=>5,'B'=>4,'C'=>3,'D'=>2,'E'=>1];
        $grades = array_diff_key($grades, array_flip(['Basic Applied Mathematics', 'GS', 'G/STUDIES', 'GENERAL STUDIES', 'General Studies']));
        $principal = array_filter($grades, fn ($g) => isset($points[$g]));
        $allPoints = array_map(fn ($g) => $points[$g], array_values($principal));
        rsort($allPoints);
        if (count($allPoints) < 2 || array_sum(array_slice($allPoints, 0, 2)) < 4) return 'Haitimizi';

        if (preg_match('/medicine|nursing|pharmacy|medical|dental|health/i', $programme['title'])) return 'Hakiki vigezo';
        $requirements = preg_replace('/\s+/', ' ', $programme['requirements']);
        // Only simple, complete subject-list rules may be automatically confirmed.
        // Conditional rules, O-level requirements and ambiguous prose stay for review.
        if (!preg_match('/^(Two|Three) principal passes in (?:the following subjects: ?)?([^\.]+)\.?$/i', $requirements, $match)) return 'Hakiki vigezo';
        if (preg_match('/\b(either|at least|minimum|except|excluding|provided|with|plus|must|not|additional)\b/i', $match[2])) return 'Hakiki vigezo';
        $aliases = ['English Language'=>'English','Accounting'=>'Accountancy','Advanced mathematics'=>'Advanced Mathematics','Kiswahili Language'=>'Kiswahili'];
        $subjects = preg_split('/,|\band\b|\bor\b/i', $match[2]);
        $subjects = array_values(array_filter(array_map(fn ($s) => $aliases[trim($s)] ?? trim($s), $subjects)));
        $known = array_unique(array_merge(array_values(self::SUBJECTS), array_keys($grades), ['Fine Arts','Chinese','Music','Theatre Arts','Sports','Physical Education']));
        if (array_diff($subjects, $known)) return 'Hakiki vigezo';
        $count = strtolower($match[1]) === 'three' ? 3 : 2;
        $values = [];
        foreach ($subjects as $subject) if (isset($principal[$subject])) $values[] = $points[$principal[$subject]];
        rsort($values);
        if (count($values) < $count) return 'Haitimizi';
        if ($programme['minimum_points'] === null) return 'Hakiki vigezo';
        return array_sum(array_slice($values, 0, $count)) >= $programme['minimum_points'] ? 'Inatimiza vigezo vilivyosomwa' : 'Haitimizi';
    }

    public function assessDiploma(array $programme, array $grades): string
    {
        $grades = array_diff_key($grades, array_flip(['ISLAM', 'B/KNOW', 'Elimu ya Dini ya Kiislam', 'Bible Knowledge']));
        $passes = count(array_filter($grades, fn ($g) => in_array($g, ['A', 'B', 'C', 'D'], true)));
        $rule = preg_replace('/\s+/', ' ', $programme['requirements']);
        if (!preg_match('/CSEE|Secondary Education/i', $rule)) return 'Haitimizi';
        if ($passes < 4) return 'Haitimizi';
        if (preg_match('/(?:four\s*(?:\(4\))?\s*(?:passes)|four\s*\(4\)\s*passes)\s+in\s+non[- ]religious\s+subjects\s*(?:\.|$)/i', $rule)
            && !preg_match('/including|except|minimum.*[BC]|grade|must|with.*(?:mathematics|physics|biology|chemistry)/i', $rule)) {
            return 'Inatimiza vigezo vilivyosomwa';
        }
        return 'Hakiki vigezo';
    }

    private function careers(string $title): array
    {
        $map = ['education'=>['Ualimu'], 'engineering'=>['Uhandisi'], 'medicine'=>['Udaktari'], 'nursing'=>['Uuguzi'], 'pharmacy'=>['Ufamasia'], 'account'=>['Uhasibu'], 'law'=>['Sheria'], 'computer'=>['Programu za kompyuta','TEHAMA'], 'information technology'=>['TEHAMA'], 'agricultur'=>['Kilimo'], 'econom'=>['Uchumi'], 'journal'=>['Uandishi wa habari'], 'business'=>['Biashara','Utawala'], 'tourism'=>['Utalii']];
        foreach ($map as $word => $careers) if (str_contains(strtolower($title), $word)) return $careers;
        return [];
    }
}
