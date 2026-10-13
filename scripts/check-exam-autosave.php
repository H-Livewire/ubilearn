<?php
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:','session.driver'=>'array']);
Illuminate\Support\Facades\DB::purge('sqlite');
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;
use Modules\Exam\Models\ExamAttempt;
use Illuminate\Http\Request;
Schema::create('exams',function($t){$t->id();$t->integer('duration_hours');$t->integer('duration_minutes');});
Schema::create('exam_attempts',function($t){$t->id();$t->integer('user_id');$t->integer('exam_id');$t->string('status');$t->timestamp('start_time');$t->timestamps();});
Schema::create('exam_questions',function($t){$t->id();$t->integer('exam_id');});
$m=require dirname(__DIR__).'/database/migrations/2026_10_14_100000_add_exam_attempt_drafts.php';$m->up();
Illuminate\Support\Facades\DB::table('exams')->insert(['id'=>1,'duration_hours'=>0,'duration_minutes'=>30]);
Illuminate\Support\Facades\DB::table('exam_questions')->insert([['id'=>1,'exam_id'=>1],['id'=>2,'exam_id'=>2]]);
$user=new App\Models\User;$user->id=7;Auth::setUser($user);
$a=ExamAttempt::create(['user_id'=>7,'exam_id'=>1,'status'=>'in_progress','start_time'=>now(),'deadline_at'=>now()->addMinutes(30)]);
$c=$app->make(Modules\Exam\Http\Controllers\ExamAttemptController::class);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$r=Request::create('/draft','POST',['answers'=>[['exam_question_id'=>1,'answer_data'=>'A']]]);
check($c->saveDraft($r,$a)->getStatusCode()===200,'Draft save');
check($a->fresh()->draft_answers[0]['answer_data']==='A','Saved answer restored from database');
try{$c->saveDraft(Request::create('/draft','POST',['answers'=>[['exam_question_id'=>2,'answer_data'=>'B']]]),$a);throw new RuntimeException('Foreign question accepted');}catch(Illuminate\Validation\ValidationException $e){}
$a->update(['user_id'=>8]);try{$c->saveDraft($r,$a);throw new RuntimeException('Foreign attempt accepted');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===403,'Ownership');}
$a->update(['user_id'=>7,'deadline_at'=>now()->subSecond()]);try{$c->saveDraft($r,$a);throw new RuntimeException('Expired save accepted');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===409,'Deadline');}
$a->update(['deadline_at'=>now()->addMinutes(5),'status'=>'completed']);try{$c->saveDraft($r,$a);throw new RuntimeException('Completed attempt save accepted');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===409,'Submitted state');}
echo "PASS: saved draft recovery, question membership, owner authorization, deadline enforcement and completed attempt protection.\n";
