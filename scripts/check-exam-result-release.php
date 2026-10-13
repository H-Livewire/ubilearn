<?php
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:','session.driver'=>'array']);
Illuminate\Support\Facades\DB::purge('sqlite');
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;
use Modules\Exam\Models\ExamAttempt;
use Illuminate\Http\Request;
Schema::create('exams',function($t){$t->id();$t->integer('pass_mark')->default(5);$t->integer('instructor_id')->nullable();$t->integer('duration_hours');$t->integer('duration_minutes');});
Schema::create('exam_attempts',function($t){$t->id();$t->integer('user_id');$t->integer('exam_id');$t->string('status');$t->timestamp('start_time');$t->decimal('total_marks')->default(10);$t->decimal('obtained_marks')->default(0);$t->integer('correct_answers')->default(0);$t->integer('incorrect_answers')->default(0);$t->boolean('is_passed')->default(false);$t->timestamps();});
Schema::create('exam_questions',function($t){$t->id();$t->integer('exam_id');$t->integer('sort')->default(0);$t->string('question_type')->default('short_answer');$t->decimal('marks')->default(5);});
$m=require dirname(__DIR__).'/database/migrations/2026_10_14_100000_add_exam_attempt_drafts.php';$m->up();
$m=require dirname(__DIR__).'/database/migrations/2026_10_14_110000_add_exam_result_release.php';$m->up();
Schema::create('exam_attempt_answers',function($t){$t->id();$t->integer('exam_attempt_id');$t->integer('exam_question_id')->default(1);$t->text('answer_data')->nullable();$t->decimal('marks_obtained')->default(0);$t->boolean('is_correct')->nullable();$t->timestamps();});
Illuminate\Support\Facades\DB::table('exams')->insert(['id'=>1,'duration_hours'=>0,'duration_minutes'=>30]);
Illuminate\Support\Facades\DB::table('exam_questions')->insert([['id'=>1,'exam_id'=>1],['id'=>2,'exam_id'=>2]]);
$user=new App\Models\User;$user->id=7;Auth::setUser($user);
$a=ExamAttempt::create(['user_id'=>7,'exam_id'=>1,'status'=>'in_progress','start_time'=>now(),'deadline_at'=>now()->addMinutes(30)]);
$c=$app->make(Modules\Exam\Http\Controllers\ExamAttemptController::class);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$r=Request::create('/release','POST');
$a->update(['obtained_marks'=>80,'correct_answers'=>4]);
check(!array_key_exists('obtained_marks',$a->forStudent()),'Unreleased score exposed');
$user->role='instructor';$user->instructor_id=99;
try{$c->release($r,$a);throw new RuntimeException('Unrelated instructor allowed');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===403,'Teacher ownership');}
$user->role='admin';
try{$c->release($r,$a);throw new RuntimeException('In progress released');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===422,'Incomplete release blocked');}
$a->update(['status'=>'completed']);
Illuminate\Support\Facades\DB::table('exam_attempt_answers')->insert(['exam_attempt_id'=>$a->id,'is_correct'=>null]);
try{$c->release($r,$a);throw new RuntimeException('Unmarked answer released');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===422,'Pending marking blocked');}
Illuminate\Support\Facades\DB::table('exam_attempt_answers')->update(['is_correct'=>true]);
$c->release($r,$a);$a->refresh();
check($a->released_at && $a->released_by===7,'Release timestamp and actor');
check($a->forStudent()['obtained_marks']==80,'Released score hidden');
check(!array_key_exists('released_by',$a->forStudent()),'Private staff data exposed');
Illuminate\Support\Facades\DB::table('exam_questions')->insert(['id'=>3,'exam_id'=>1]);
Illuminate\Support\Facades\DB::table('exam_attempt_answers')->update(['exam_question_id'=>1,'is_correct'=>null]);
Illuminate\Support\Facades\DB::table('exam_attempt_answers')->insert(['exam_attempt_id'=>$a->id,'exam_question_id'=>3,'is_correct'=>null]);
$service=$app->make(Modules\Exam\Services\ExamAttemptService::class);
$service->reviewAttempt($a,[1=>4]);$a->refresh();
check($a->status==='submitted' && !$a->released_at,'Partial marking finalized prematurely');
$service->reviewAttempt($a,[3=>5]);$a->refresh();
check($a->status==='completed' && (float)$a->obtained_marks===9.0,'Incremental manual grades lost');
echo "PASS: withheld score payload, teacher ownership, incomplete/unmarked release rejection, release timestamp/actor and visible released score.\n";
