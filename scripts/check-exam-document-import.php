<?php
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();$app['env']='testing';
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:','session.driver'=>'array','filesystems.default'=>'local']);
Illuminate\Support\Facades\DB::purge('sqlite');
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamQuestion;
use Modules\Exam\Models\ExamQuestionOption;
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$parser=new App\Services\ExamDocumentImport;
$q=$parser->questions("Header\n1. What is 2 + 2?\nA) 3\nB) 4\n2. Explain a fraction.");check(count($q)===2 && $q[0]['choices']===['3','4'] && !$q[1]['choices'],'Question and choice splitting');
$png=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=');
$path=tempnam(sys_get_temp_dir(),'exam-docx');$zip=new ZipArchive;$zip->open($path,ZipArchive::OVERWRITE);
$zip->addFromString('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body><w:p><w:r><w:t>1. Evaluate </w:t></w:r><m:oMath><m:f><m:num><m:r><m:t>1</m:t></m:r></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath></w:p><w:p><w:r><w:t>A) Half</w:t></w:r></w:p><w:p><w:r><w:t>B) One</w:t></w:r></w:p></w:body></w:document>');$zip->addFromString('word/media/diagram.png',$png);$zip->close();
try{$doc=$parser->docx(new UploadedFile($path,'exam.docx',null,null,true));check(str_contains($doc['text'],'(1)/(2)') && count($doc['images'])===1,'DOCX equation and image extraction');}finally{unlink($path);}
$middleware=new App\Http\Middleware\ExamManagement;
foreach([['admin','Dactor','approved',true],['instructor','Teacher','approved',true],['instructor','Teacher','pending',false],['instructor','Mjasiriamali','approved',false],['student','Teacher','approved',false]] as [$role,$designation,$status,$allowed]){
 $user=new App\Models\User(['role'=>$role,'instructor_id'=>1]);$user->setRelation('instructor',new App\Models\Instructor(['designation'=>$designation,'status'=>$status]));$r=Request::create('/dashboard/exams');$r->setUserResolver(fn()=>$user);
 try{$middleware->handle($r,fn()=>true);check($allowed,'Forbidden designation accepted');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check(!$allowed && $e->getStatusCode()===403,'Teacher gate rejected permitted user');}
}
Schema::create('exams',function($t){$t->id();$t->string('title');$t->string('status');$t->integer('instructor_id')->default(1);$t->decimal('total_marks')->default(0);$t->integer('total_questions')->default(0);$t->timestamps();});
Schema::create('exam_questions',function($t){$t->id();$t->integer('exam_id');$t->string('title');$t->text('description')->nullable();$t->string('question_type');$t->decimal('marks');$t->integer('sort');$t->text('options')->nullable();$t->timestamps();});
Schema::create('exam_question_options',function($t){$t->id();$t->integer('exam_question_id');$t->text('option_text');$t->boolean('is_correct');$t->integer('sort');$t->timestamps();});
$m=require dirname(__DIR__).'/database/migrations/2026_10_14_130000_add_imported_question_images.php';$m->up();Storage::fake('local');
$exam=Exam::create(['title'=>'Imported Maths','status'=>'draft']);$controller=$app->make(Modules\Exam\Http\Controllers\ExamImportController::class);$service=$app->make(Modules\Exam\Services\ExamQuestionService::class);
$q[0]['correct']=1;$q[0]['image']=0;$q[1]['image']=0;$payload=['reviewed'=>true,'questions'=>$q,'images'=>['data:image/png;base64,'.base64_encode($png)]];
try{
 $controller->store(Request::create('/import','POST',$payload),$exam,$service);
 check(ExamQuestion::count()===2 && ExamQuestionOption::where('is_correct',true)->count()===1,'Imported questions/answer key');
 check($exam->fresh()->status==='draft' && $exam->fresh()->total_marks==2,'Draft and marks');
 $first=ExamQuestion::first();check(Storage::disk('local')->exists($first->import_asset['path']) && !isset($first->toArray()['import_asset']),'Stored private diagram');
 check(ExamQuestion::get()->pluck('import_asset.path')->unique()->count()===1,'Diagram deduplication');
 $bad=$payload;$bad['questions'][0]['correct']=null;
 try{$controller->store(Request::create('/import','POST',$bad),$exam,$service);throw new RuntimeException('Missing answer key accepted');}catch(Illuminate\Validation\ValidationException $e){}
 check(ExamQuestion::count()===2,'Invalid import wrote records');
 $bad=$payload;$bad['images']=['data:image/png;base64,not-an-image'];
 try{$controller->store(Request::create('/import','POST',$bad),$exam,$service);throw new RuntimeException('Invalid diagram accepted');}catch(Illuminate\Validation\ValidationException $e){}
 check(ExamQuestion::count()===2,'Invalid image did not roll back');
 $exam->update(['status'=>'published']);try{$controller->store(Request::create('/import','POST',$payload),$exam,$service);throw new RuntimeException('Published exam altered');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===422,'Published import guard');}
 echo "PASS: PDF-text question/choice splitting, DOCX equations/images, admin/approved Teacher gate, draft import, keys, private deduplicated diagrams, validation and atomic rollback.\n";
}finally{Storage::disk('local')->deleteDirectory('exam-diagrams');}
