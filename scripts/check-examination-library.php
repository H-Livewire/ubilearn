<?php
// Isolated in-memory database. Never changes the project's database.
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
Illuminate\Support\Facades\DB::purge('sqlite');
$m=require dirname(__DIR__).'/database/migrations/2026_10_12_100000_create_exam_papers_table.php';$m->up();
use App\Models\ExamPaper;
use App\Http\Controllers\ExamPaperController;
use Illuminate\Http\Request;
function check($ok,$message){if(!$ok){fwrite(STDERR,$message."\n");exit(1);}}
check(ExamPaper::count()===20,'Seed catalogue count');
$c=new ExamPaperController;
function results($c,$query){$r=Request::create('/examinations','GET',$query);$r->headers->set('X-Inertia','true');return json_decode($c->index($r)->toResponse($r)->getContent(),true)['props']['papers'];}
check(results($c,['region'=>'Kigoma'])['total']===2,'Region filter');
check(results($c,['region'=>'Pwani','subject'=>'Biology','class_name'=>'Form 4'])['total']===1,'Combined filters');
check(results($c,['q'=>'Mathematics'])['total']===2,'Search');
check(results($c,['education'=>'primary'])['total']===0,'Education filter');
check(results($c,['answers'=>'yes'])['total']===0,'No invented answers');
$p=ExamPaper::first();$p->update(['published'=>false]);check(results($c,[])['total']===19,'Hidden records excluded');
try{$c->show($p);exit(1);}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===404,'Hidden details');}
echo "PASS: catalogue migration, search, region/education/subject filters, answer availability and unpublished visibility.\n";
$r=Request::create('/dashboard/examination-papers','POST',['title'=>'Owned practice paper','education'=>'primary','class_name'=>'Standard 7','subject'=>'Science','source_url'=>'https://example.com/papers','has_answers'=>false,'published'=>true]);
config(['session.driver'=>'array']);
$c->save($r);
check(ExamPaper::where('title','Owned practice paper')->exists(),'Admin create');
$r=Request::create('/dashboard/examination-papers','POST',['title'=>'Unsafe URL','education'=>'primary','pdf_url'=>'javascript:alert(1)','has_answers'=>false,'published'=>true]);
try{$c->save($r);exit(1);}catch(Illuminate\Validation\ValidationException $e){}
$routes=$app['router']->getRoutes();
foreach($routes as $route)if($route->uri()==='dashboard/examination-papers')check(in_array('role:admin',$route->gatherMiddleware(),true),'Admin role guard');
echo "PASS: admin creation, unsafe document URL rejection and admin route guards.\n";
