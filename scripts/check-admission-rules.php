<?php
// Run: php scripts/check-admission-rules.php (does not mutate the database).
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
function verify($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$e=new App\Services\EducationPathwaysService;
$p=['title'=>'Bachelor of Science','requirements'=>'Two principal passes in Physics, Chemistry and Advanced Mathematics.','minimum_points'=>4];
verify($e->assess($p,['Physics'=>'D','Chemistry'=>'D'],2026)==='Inatimiza vigezo vilivyosomwa','eligible');
verify($e->assess($p,['Physics'=>'E','Chemistry'=>'E'],2026)==='Haitimizi','low points');
verify($e->assess($p,['Physics'=>'D','Basic Applied Mathematics'=>'A'],2026)==='Haitimizi','subsidiary excluded');
verify($e->assess($p,['Physics'=>'D','GS'=>'A'],2026)==='Haitimizi','general studies excluded');
$p['requirements'].=' Plus an O-level pass in Mathematics.';
verify($e->assess($p,['Physics'=>'A','Chemistry'=>'A'],2026)==='Hakiki vigezo','conditional review');
$d=['requirements'=>'Holders of Certificate of Secondary Education Examination (CSEE) with at least four (4) passes in non-religious subjects'];
verify($e->assessDiploma($d,['Physics'=>'D','Chemistry'=>'D','Biology'=>'D','English'=>'D'])==='Inatimiza vigezo vilivyosomwa','diploma');
verify($e->assessDiploma($d,['Physics'=>'D','Chemistry'=>'D','Biology'=>'D','ISLAM'=>'D'])==='Haitimizi','religious excluded');
$guidance=$e->advise('acsee',2026,['PHY'=>'A','CHEM'=>'A','BIO'=>'A']);verify(count($guidance['programmes'])>0,'TCU recommendations');
$guidance=$e->advise('csee',2025,['PHY'=>'A','CHEM'=>'A','BIO'=>'A','B/MATH'=>'A','ENGL'=>'B']);verify(count($guidance['programmes'])>0 && count($guidance['combinations'])>=2 && count($guidance['schools'])===1067,'Form4 guidance');
echo "PASS: admission rules and catalogue checks.\n";
