<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamQuestion;
class ExamManagement {
 public function handle(Request $request, Closure $next) {
  $user=$request->user();
  if($user?->role==='admin')return $next($request);
  abort_unless($user?->role==='instructor' && $user->instructor?->status==='approved' && strcasecmp(trim($user->instructor->designation),'Teacher')===0,403,'Online exam management is available to Teacher instructors only.');
  $exam=$request->route('exam')??$request->route('exam_id')??$request->input('exam_id');
  if($exam && !$exam instanceof Exam)$exam=Exam::findOrFail($exam);
  if($q=$request->route('exam_question')??$request->route('question')){$question=$q instanceof ExamQuestion?$q:ExamQuestion::findOrFail($q);$exam=$question->exam;}
  foreach(['exam_faq'=>\Modules\Exam\Models\ExamFaq::class,'exam_requirement'=>\Modules\Exam\Models\ExamRequirement::class,'exam_outcome'=>\Modules\Exam\Models\ExamOutcome::class,'exam_resource'=>\Modules\Exam\Models\ExamResource::class,'attempt'=>\Modules\Exam\Models\ExamAttempt::class] as $key=>$model) {
   if($id=$request->route($key)){ $record=$id instanceof \Illuminate\Database\Eloquent\Model?$id:$model::findOrFail($id);$exam=Exam::findOrFail($record->exam_id); }
  }
  if($request->is('dashboard/exam-questions/reorder')) {
   $data=$request->validate(['sortedData'=>'required|array|max:500','sortedData.*.id'=>'required|integer','sortedData.*.sort'=>'required|integer|min:0']);
   foreach($data['sortedData'] as $row)abort_unless((int)ExamQuestion::findOrFail($row['id'])->exam->instructor_id===(int)$user->instructor_id,403);
  }
  if($exam)abort_unless((int)$exam->instructor_id===(int)$user->instructor_id,403);
  if($request->filled('instructor_id'))abort_unless((int)$request->instructor_id===(int)$user->instructor_id,403);
  return $next($request);
 }
}
