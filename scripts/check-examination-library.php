<?php
// Isolated database and filesystem: no changes to the application's data.
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$app['env']='testing';
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:','session.driver'=>'array','filesystems.default'=>'local']);
Illuminate\Support\Facades\DB::purge('sqlite');
foreach(['2026_10_12_100000_create_exam_papers_table.php','2026_10_13_100000_add_files_to_exam_papers.php'] as $file){$m=require dirname(__DIR__).'/database/migrations/'.$file;$m->up();}
use App\Models\ExamPaper;
use App\Http\Controllers\ExamPaperController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
function results($c,$query=[]){$r=Request::create('/examinations','GET',$query);$r->headers->set('X-Inertia','true');return json_decode($c->index($r)->toResponse($r)->getContent(),true)['props']['papers'];}
Storage::fake('local');$c=new ExamPaperController;
check(results($c)['total']===0,'External source records must stay hidden');
$data=['title'=>'Owned practice paper','education'=>'primary','class_name'=>'Standard 7','region'=>'Dar es Salaam','subject'=>'Science','exam_type'=>'Annual','year'=>2026,'published'=>true];
$pdf="%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
try{
$c->save(Request::create('/dashboard/examination-papers','POST',$data,[],['question_file'=>UploadedFile::fake()->createWithContent('questions.pdf',$pdf),'marking_file'=>UploadedFile::fake()->createWithContent('answers.pdf',$pdf)]));
$p=ExamPaper::where('title',$data['title'])->firstOrFail();
try{$c->save(Request::create('/dashboard/examination-papers','POST',array_merge($data,['class_name'=>'Form 4']),[],['question_file'=>UploadedFile::fake()->createWithContent('bad-class.pdf',$pdf)]));throw new RuntimeException('Mismatched class accepted');}catch(Illuminate\Validation\ValidationException $e){check(isset($e->errors()['class_name']),'Invalid class rejected');}
check(results($c,['education'=>'primary','class_name'=>'Standard 7','exam_type'=>'Annual','region'=>'Dar es Salaam'])['total']===1,'Admin metadata appears in matching student filters');

check($p->has_pdf && $p->has_marking && $p->has_answers,'Upload metadata');
check(results($c,['education'=>'primary','class_name'=>'Class 7'])['total']===1,'Class labels match Standard records');
check(results($c,['education'=>'primary','class_name'=>'Standard 4'])['total']===0,'Different primary classes remain isolated');
check(Storage::disk('local')->exists($p->files['question']['path']),'Stored question PDF');
check(results($c,['region'=>'Dar es Salaam','answers'=>'yes'])['total']===1,'Region and answer filters');
// Each landing shelf must query its level independently of the global paginator.
$extra=[];
for($i=0;$i<8;$i++){$copy=$p->replicate();$copy->education='olevel';$copy->exam_type='Mock';$copy->title='O-Level '.$i;$copy->save();$extra[]=$copy->id;}
$r=Request::create('/examinations','GET');$r->headers->set('X-Inertia','true');
$props=json_decode($c->index($r)->toResponse($r)->getContent(),true)['props'];
check(count($props['levels']['primary'])===1 && count($props['levels']['olevel'])===6,'Independent bounded level shelves');
check($props['levels']['college']===[],'Empty university shelf');
check(results($c,['education'=>'olevel'])['total']===8,'View more includes all level papers');
check(results($c,['education'=>'olevel','region'=>'Arusha'])['total']===0,'Level filters remain combined');
$r=Request::create('/examinations','GET',['education'=>'olevel','exam_type'=>'Mock','region'=>'Dar es Salaam']);$r->headers->set('Accept','application/json');
$json=json_decode($c->index($r)->getContent(),true);
check($json['papers']['total']===8 && $json['papers']['data'][0]['education']==='olevel','Live level/type/region JSON filtering');
check(count($json['papers']['data'])===6 && $json['papers']['next_page_url']!==null,'First six papers have a next page');
$r=Request::create('/examinations','GET',['education'=>'olevel','exam_type'=>'Mock','region'=>'Dar es Salaam','page'=>2]);$r->headers->set('Accept','application/json');
$last=json_decode($c->index($r)->getContent(),true)['papers'];
check(count($last['data'])===2 && $last['next_page_url']===null,'Last page contains remaining papers only');
check(count(array_intersect(array_column($json['papers']['data'],'id'),array_column($last['data'],'id')))===0,'Load more pages do not overlap');
check(!isset($json['papers']['data'][0]['files']),'Live results do not expose storage metadata');
$r=Request::create('/examinations','GET',['education'=>'primary','exam_type'=>'Mock']);$r->headers->set('Accept','application/json');
check(json_decode($c->index($r)->getContent(),true)['papers']['total']===0,'Live filtering isolates levels');
ExamPaper::whereIn('id',$extra)->delete();
check(!isset($p->toArray()['files']) && !isset($p->toArray()['source_url']),'Private metadata hidden');
foreach([false,true] as $download){$r=Request::create('/files','GET',['download'=>$download]);$response=$c->document($r,$p,'question');check(str_starts_with($response->headers->get('Content-Disposition'),$download?'attachment':'inline'),'Inline/download disposition');check($response->headers->get('Content-Type')==='application/pdf','PDF content type');ob_start();$response->sendContent();$body=ob_get_clean();check($body===$pdf,'PDF bytes');}
$old=$p->files['question']['path'];$c->save(Request::create('/admin','POST',$data,[],['question_file'=>UploadedFile::fake()->createWithContent('replacement.pdf',$pdf)]),$p);check(!Storage::disk('local')->exists($old),'Old file cleaned after replacement');
$p->update(['published'=>false]);check(results($c)['total']===0,'Unpublished excluded');
try{$c->document(Request::create('/files'),$p,'question');throw new RuntimeException('Public hidden document');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===404,'Hidden document blocked');}
$r=Request::create('/files');$r->setUserResolver(fn()=>new App\Models\User(['role'=>'admin']));check($c->document($r,$p,'question')->getStatusCode()===200,'Admin can view hidden document');
try{$c->save(Request::create('/admin','POST',$data));throw new RuntimeException('Missing PDF accepted');}catch(Illuminate\Validation\ValidationException $e){}
try{$c->save(Request::create('/admin','POST',$data,[],['question_file'=>UploadedFile::fake()->createWithContent('bad.txt','not a PDF')]));throw new RuntimeException('Non PDF accepted');}catch(Illuminate\Validation\ValidationException $e){}
foreach($app['router']->getRoutes() as $route)if($route->uri()==='dashboard/examination-papers')check(in_array('role:admin',$route->gatherMiddleware(),true),'Admin role guard');
echo "PASS: PDF upload/replacement, filters, private metadata, inline view/download bytes, hidden-file permissions, PDF validation and admin route guards.\n";
}finally{Storage::disk('local')->deleteDirectory('examination-papers');}
