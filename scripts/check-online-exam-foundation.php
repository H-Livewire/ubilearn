<?php
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
Illuminate\Support\Facades\DB::purge('sqlite');
Illuminate\Support\Facades\Schema::create('exam_questions',function($t){$t->id();$t->integer('exam_id');});
Illuminate\Support\Facades\DB::table('exam_questions')->insert([['id'=>1,'exam_id'=>10],['id'=>2,'exam_id'=>20]]);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
function validation($answers,$id=5){
 $attempt=new Modules\Exam\Models\ExamAttempt(['exam_id'=>10]);$attempt->id=5;
 $request=Modules\Exam\Http\Requests\ExamAttemptRequest::create('/student/exam-attempts/5/submit','POST',['exam_attempt_id'=>$id,'answers'=>$answers]);
 $route=new Illuminate\Routing\Route('POST','student/exam-attempts/{attempt}/submit',fn()=>null);$route->name('exam-attempts.submit');$route->bind($request);$route->setParameter('attempt',$attempt);$request->setRouteResolver(fn()=>$route);
 return Illuminate\Support\Facades\Validator::make($request->all(),$request->rules());
}
check(validation([['exam_question_id'=>1,'answer_data'=>'A']])->passes(),'Valid question rejected');
check(validation([['exam_question_id'=>2,'answer_data'=>'A']])->fails(),'Cross-exam question accepted');
check(validation([['exam_question_id'=>1,'answer_data'=>'A'],['exam_question_id'=>1,'answer_data'=>'B']])->fails(),'Duplicate question accepted');
check(validation([],99)->fails(),'Mismatched attempt accepted');
check(validation([])->passes(),'Unanswered exam cannot be submitted');
$route=$app['router']->getRoutes()->getByName('online-examination');check($route && $route->uri()==='online-examination','Missing public route');
echo "PASS: question membership, duplicate answers, route-bound attempt ID, unanswered submission and online examination route.\n";
