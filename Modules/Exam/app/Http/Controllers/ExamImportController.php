<?php
namespace Modules\Exam\Http\Controllers;
use App\Http\Controllers\Controller;
use App\Services\ExamDocumentImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamQuestion;
use Modules\Exam\Models\ExamAttempt;
use Modules\Exam\Services\ExamQuestionService;
use Inertia\Inertia;
class ExamImportController extends Controller {
 public function index(Exam $exam){abort_unless($exam->status==='draft',422,'Unpublish the exam before importing questions.');return Inertia::render('online-examination/import',['exam'=>['id'=>$exam->id,'title'=>$exam->title]]);}
 public function extract(Request $r,Exam $exam,ExamDocumentImport $parser){
  abort_unless($exam->status==='draft',422);
  $r->validate(['document'=>'required|file|mimes:docx|max:10240']);
  $data=$parser->docx($r->file('document'));$data['questions']=$parser->questions($data['text']);return response()->json($data);
 }
 public function parse(Request $r,Exam $exam,ExamDocumentImport $parser){abort_unless($exam->status==='draft',422);$data=$r->validate(['text'=>'required|string|max:500000']);return response()->json(['questions'=>$parser->questions($data['text'])]);}
 public function store(Request $r,Exam $exam,ExamQuestionService $service){
  abort_unless($exam->status==='draft',422);
  $data=$r->validate(['reviewed'=>'accepted','questions'=>'required|array|min:1|max:200','questions.*.title'=>'required|string|max:10000','questions.*.marks'=>'required|numeric|min:0.5|max:1000','questions.*.choices'=>'present|array|max:8','questions.*.choices.*'=>'required|string|max:2000','questions.*.correct'=>'nullable|integer|min:0|max:7','questions.*.image'=>'nullable|integer|min:0|max:29','images'=>'present|array|max:30','images.*'=>'required|string|max:4000000']);
  foreach($data['questions'] as $q)if(count($q['choices'])===1 || ($q['choices'] && (!isset($q['correct']) || !array_key_exists($q['correct'],$q['choices']))))throw ValidationException::withMessages(['questions'=>'Chagua jibu sahihi kwa kila swali lenye choices (angalau mbili).']);
  $disk=config('filesystems.default');$paths=[];$imageFiles=[];
  if(array_sum(array_map('strlen',$data['images']))>20000000)throw ValidationException::withMessages(['questions'=>'Diagrams exceed 20 MB. Import fewer questions at a time.']);
  try {DB::transaction(function()use($data,$exam,$service,$disk,&$paths,&$imageFiles){
   $locked=Exam::whereKey($exam->id)->lockForUpdate()->firstOrFail();abort_unless($locked->status==='draft',422);
   foreach($data['questions'] as $q){
    $question=$service->createQuestion(['exam_id'=>$exam->id,'title'=>e(mb_substr($q['title'],0,240)),'description'=>'<p>'.nl2br(e($q['title'])).'</p>','question_type'=>$q['choices']?'multiple_choice':'short_answer','marks'=>$q['marks'],'options'=>[], 'question_options'=>array_map(fn($choice,$i)=>['option_text'=>e($choice),'is_correct'=>$i===$q['correct'],'sort'=>$i],$q['choices'],array_keys($q['choices']))]);
    if(isset($q['image'])){
     if(!isset($data['images'][$q['image']]))throw ValidationException::withMessages(['questions'=>'Invalid diagram selection.']);
     if(isset($imageFiles[$q['image']])){
      $question->update(['import_asset'=>$imageFiles[$q['image']],'description'=>$question->description.'<p><img src="/student/exam-diagrams/'.$question->id.'" alt="Question diagram" /></p>']);continue;
     }
     if(!preg_match('#^data:image/(png|jpeg);base64,(.+)$#s',$data['images'][$q['image']],$match))throw ValidationException::withMessages(['questions'=>'Invalid diagram image.']);
     $bytes=base64_decode($match[2],true);$info=$bytes?@getimagesizefromstring($bytes):false;
     if(!$info || !in_array($info['mime'],['image/png','image/jpeg'],true) || $info[0]*$info[1]>16000000)throw ValidationException::withMessages(['questions'=>'Diagram image is invalid or too large.']);
     if(app()->environment('production') && config('filesystems.disks.'.$disk.'.driver')==='local')throw ValidationException::withMessages(['questions'=>'Use Object Storage as the default disk before uploading diagrams.']);
     $path='exam-diagrams/'.\Illuminate\Support\Str::uuid().'.'.$match[1];if(!Storage::disk($disk)->put($path,$bytes))throw new \RuntimeException('Diagram storage failed.');$paths[]=$path;
     $imageFiles[$q['image']]=['disk'=>$disk,'path'=>$path,'mime'=>$info['mime']];
     $question->update(['import_asset'=>$imageFiles[$q['image']],'description'=>$question->description.'<p><img src="/student/exam-diagrams/'.$question->id.'" alt="Question diagram" /></p>']);
    }
   }
  });}catch(\Throwable $e){foreach($paths as $path)Storage::disk($disk)->delete($path);throw $e;}
  return redirect('/dashboard/exams/'.$exam->id.'/edit?tab=questions')->with('success','Maswali yameongezwa kwenye draft. Kagua kisha publish mtihani.');
 }
 public function image(Request $r,ExamQuestion $question){
  $user=$r->user();$exam=$question->exam;
  $staff=$user->role==='admin' || ($user->role==='instructor' && $user->instructor_id && $user->instructor?->status==='approved' && (int)$user->instructor_id===(int)$exam->instructor_id && strcasecmp(trim($user->instructor?->designation??''),'Teacher')===0);
  $learner=ExamAttempt::where('user_id',$user->id)->where('exam_id',$exam->id)->where(function($q){$q->where('status','in_progress')->orWhereNotNull('released_at');})->exists();
  abort_unless($staff || $learner,403);$file=$question->import_asset;abort_unless($file,404);
  return Storage::disk($file['disk'])->response($file['path'],null,['Content-Type'=>$file['mime'],'X-Content-Type-Options'=>'nosniff','Cache-Control'=>'private, no-store'],'inline');
 }
}
