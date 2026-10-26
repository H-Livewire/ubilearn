<?php
namespace App\Http\Controllers;
use App\Models\ExamPaper;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
class ExamPaperController extends Controller
{
    public const EDUCATION = ['nursery'=>'Awali','primary'=>'Primary','olevel'=>'O-Level','alevel'=>'A-Level','college'=>'College / University'];
    public const CLASSES = ['primary'=>['Standard 2'=>'Class 2','Standard 4'=>'Class 4','Standard 7'=>'Class 7'],'olevel'=>['Form 2'=>'Form 2','Form 4'=>'Form 4'],'alevel'=>['Form 5'=>'Form 5','Form 6'=>'Form 6'],'college'=>['Certificate'=>'Certificate','Diploma'=>'Diploma','Degree'=>'Degree'],'nursery'=>['Baby class'=>'Baby class','Middle class'=>'Middle class','Pre-unit'=>'Pre-unit']];
    public const REGIONS = ['Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro','Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu','Singida','Songwe','Tabora','Tanga','Kaskazini Pemba','Kaskazini Unguja','Kusini Pemba','Kusini Unguja','Mjini Magharibi'];
    public const TYPES = ['NECTA','Mock','Pre-Mock','Pre-NECTA','Joint','Monthly','Midterm','Terminal','Annual','Practice'];
    private function options(): array {
        return ['education'=>self::EDUCATION,'regions'=>self::REGIONS,'types'=>self::TYPES,'classes'=>self::CLASSES];
    }
    public function index(Request $request) {
        $filters=$request->validate(['q'=>'nullable|string|max:120','education'=>'nullable|in:'.implode(',',array_keys(self::EDUCATION)), 'class_name'=>'nullable|string|max:80','region'=>'nullable|in:'.implode(',',self::REGIONS),'subject'=>'nullable|string|max:80','year'=>'nullable|integer|between:1900,2100','exam_type'=>'nullable|in:'.implode(',',self::TYPES),'answers'=>'nullable|in:yes,no']);
        $query=ExamPaper::where('published',true)->whereNotNull('files->question->path');
        foreach(['education','class_name','region','subject','year','exam_type'] as $field) {
            if(empty($filters[$field])) continue;
            if($field==='class_name' && ($filters['education']??'')==='primary' && preg_match('/^(?:class|standard)\s+(2|4|7)$/i',$filters[$field],$match)) {
                $query->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(class_name)'),['standard '.$match[1],'class '.$match[1]]);
            } else {$query->where($field,$filters[$field]);}
        }
        if(!empty($filters['answers']))$query->where('has_answers',$filters['answers']==='yes');
        if(!empty($filters['q']))$query->where(function($q)use($filters){foreach(['title','subject','region','organizer'] as $field)$q->orWhere($field,'like','%'.$filters['q'].'%');});
        if($request->expectsJson()) {
            return response()->json(['papers'=>$query->orderByDesc('year')->orderBy('title')->paginate(6, ['*'], 'page', max(1, $request->integer('page', 1)))->withQueryString()]);
        }
        $available=ExamPaper::where('published',true)->whereNotNull('files->question->path');
        $levels=[];$levelTotals=[];
        if(empty($filters['education'])) {
            foreach(array_keys(self::EDUCATION) as $level) {
                $levelTotals[$level]=(clone $query)->where('education',$level)->count();
                $levels[$level]=(clone $query)->where('education',$level)->orderByDesc('year')->orderBy('title')->limit(6)->get();
            }
        }
        return Inertia::render('examinations/index',[
            'papers'=>$query->orderByDesc('year')->orderBy('title')->paginate(6, ['*'], 'page', max(1, $request->integer('page', 1)))->withQueryString(),
            'filters'=>$filters,'options'=>$this->options(),'levels'=>$levels,'levelTotals'=>$levelTotals,
            'subjects'=>(clone $available)->whereNotNull('subject')->distinct()->orderBy('subject')->pluck('subject'),
            'years'=>(clone $available)->whereNotNull('year')->distinct()->orderByDesc('year')->pluck('year'),
        ]);
    }
    public function show(ExamPaper $paper){abort_unless($paper->published && $paper->has_pdf,404);return Inertia::render('examinations/show',['paper'=>$paper]);}
    public function document(Request $request, ExamPaper $paper, string $kind) {
        abort_unless(in_array($kind,['question','marking','instructions'],true),404);
        abort_unless(($paper->published && $paper->has_pdf) || $request->user()?->role==='admin',404);
        $file=$paper->files[$kind]??null; abort_unless($file,404);
        $disk=Storage::disk($file['disk']); abort_unless($disk->exists($file['path']),404);
        return $disk->response($file['path'],$file['name'],['Content-Type'=>'application/pdf','X-Content-Type-Options'=>'nosniff','Cache-Control'=>'private, no-store'], $request->boolean('download')?'attachment':'inline');
    }

    public function destroy(ExamPaper $paper) {
        foreach(($paper->files??[]) as $file){if(isset($file['disk'],$file['path']))Storage::disk($file['disk'])->delete($file['path']);}
        $paper->delete();
        return back()->with('success','Mtihani umefutwa.');
    }
    public function destroyMany(Request $request) {
        $ids=$request->validate(['ids'=>'required|array|min:1|max:200','ids.*'=>'integer'])['ids'];
        $papers=ExamPaper::whereIn('id',$ids)->get();
        foreach($papers as $paper){
            foreach(($paper->files??[]) as $file){if(isset($file['disk'],$file['path']))Storage::disk($file['disk'])->delete($file['path']);}
            $paper->delete();
        }
        return back()->with('success',$papers->count().' mitihani imefutwa.');
    }
    public function destroyFile(ExamPaper $paper, string $kind) {
        abort_unless($kind==='marking',404);
        $files=$paper->files??[]; $file=$files[$kind]??null; abort_unless($file,404);
        Storage::disk($file['disk'])->delete($file['path']);
        unset($files[$kind]); $paper->files=$files; $paper->has_answers=false; $paper->save();
        return back()->with('success','Marking scheme imefutwa.');
    }
    public function cover(Request $request, ExamPaper $paper) {
        abort_unless($paper->published || $request->user()?->role==='admin',404);
        $file=$paper->files['cover']??null; abort_unless($file,404);
        $disk=Storage::disk($file['disk']); abort_unless($disk->exists($file['path']),404);
        return $disk->response($file['path'],'cover.webp',['Content-Type'=>$file['mime']??'image/webp','Cache-Control'=>'public, max-age=31536000, immutable','X-Content-Type-Options'=>'nosniff']);
    }
    public function saveCover(Request $request, ExamPaper $paper) {
        $request->validate(['cover'=>'required|file|mimes:webp,jpg,jpeg,png|max:512']);
        abort_unless($paper->has_pdf,422);
        $disk=config('filesystems.default'); $upload=$request->file('cover');
        $path=$upload->store('examination-covers',$disk);
        abort_unless($path,500);
        $files=$paper->files??[]; $old=$files['cover']??null;
        $files['cover']=['disk'=>$disk,'path'=>$path,'mime'=>$upload->getMimeType()];
        $paper->files=$files; $paper->save();
        if($old)Storage::disk($old['disk'])->delete($old['path']);
        return response()->json(['cover_v'=>$paper->cover_v]);
    }

    public function manage(Request $request){
        $f=$request->validate(['q'=>'nullable|string|max:120','per_page'=>'nullable|integer|in:10,15,20,25']);
        $perPage=(int)($f['per_page']??10);
        $query=ExamPaper::query();
        if(!empty($f['q'])) {
            $term='%'.addcslashes($f['q'],'%_\\').'%';
            $query->where(function($q)use($term){foreach(['title','subject','region','organizer','exam_type','class_name','year'] as $field)$q->orWhere($field,'like',$term);});
        }
        $papers=$query->select(['id','title','education','class_name','region','subject','year','exam_type','organizer','source_name','published','files'])->orderByDesc('id')->paginate($perPage)->withQueryString();
        if($request->expectsJson()) return response()->json($papers);
        return Inertia::render('examinations/manage',[
            'papers'=>$papers,
            'missingCovers'=>ExamPaper::whereNotNull('files->question->path')->whereNull('files->cover->path')->orderByDesc('id')->limit(60)->pluck('id'),
            'total'=>ExamPaper::count(),
            'filters'=>['q'=>$f['q']??'','per_page'=>$perPage],
            'options'=>$this->options(),
        ]);
    }
    public function save(Request $request, ?ExamPaper $paper=null){
        $data=$request->validate(['title'=>'required|string|max:255','education'=>'required|in:'.implode(',',array_keys(self::EDUCATION)),'class_name'=>'nullable|string|max:80','region'=>'nullable|in:'.implode(',',self::REGIONS),'subject'=>'nullable|string|max:80','year'=>'nullable|integer|between:1900,2100','exam_type'=>[!$paper && $request->input('education')!=='college'?'required':'nullable','in:'.implode(',',self::TYPES)],'organizer'=>'nullable|string|max:120','source_name'=>'nullable|string|max:120','published'=>'required|boolean']);
        $class=trim($data['class_name']??'');
        if($data['education']==='primary' && preg_match('/^(?:class|standard)\s+(2|4|7)$/i',$class,$match)) $class='Standard '.$match[1];
        if(in_array($data['education'],['olevel','alevel'],true) && preg_match('/^form\s+(2|4|5|6)$/i',$class,$match)) $class='Form '.$match[1];
        $legacy=$paper && $paper->education===$data['education'] && $paper->class_name===$class;
        if(!$legacy && ($class!=='' || $data['education']!=='college') && !array_key_exists($class,self::CLASSES[$data['education']])) {
            throw ValidationException::withMessages(['class_name'=>'Chagua darasa linalolingana na kiwango cha elimu.']);
        }
        $data['class_name']=$class?:null;
        $request->validate([
            'question_file'=>'nullable|file|mimes:pdf|max:10240',
            'marking_file'=>'nullable|file|mimes:pdf|max:10240',
            'instructions_file'=>'nullable|file|mimes:pdf|max:10240',
        ]);
        $paper ??= new ExamPaper;
        if(!$paper->has_pdf && !$request->hasFile('question_file')) throw ValidationException::withMessages(['question_file'=>'Upload PDF ya maswali.']);
        $disk=config('filesystems.default');
        if(($request->hasFile('question_file') || $request->hasFile('marking_file') || $request->hasFile('instructions_file')) && app()->environment('production') && config('filesystems.disks.'.$disk.'.driver')==='local') {
            throw ValidationException::withMessages(['question_file'=>'Unganisha Object Storage kwenye Laravel Cloud na iwe default disk ili PDF isifutike baada ya deploy.']);
        }
        $files=$paper->files??[]; $newPaths=[]; $oldPaths=[];
        try {
            foreach(['question','marking','instructions'] as $kind) if($request->hasFile($kind.'_file')) {
                $upload=$request->file($kind.'_file');
                $path=$upload->store('examination-papers',$disk);
                if(!$path) throw new \RuntimeException('PDF upload failed. Check Object Storage configuration.');
                $newPaths[]=[$disk,$path];
                if(isset($files[$kind]))$oldPaths[]=$files[$kind];
                if($kind==='question' && isset($files['cover'])){$oldPaths[]=$files['cover'];unset($files['cover']);}
                $files[$kind]=['disk'=>$disk,'path'=>$path,'name'=>$upload->getClientOriginalName(),'size'=>$upload->getSize()];
            }
            $data['has_answers']=isset($files['marking']['path']);
            $paper->fill($data); $paper->files=$files; $paper->save();
        } catch(\Throwable $e) {
            foreach($newPaths as [$fileDisk,$path])Storage::disk($fileDisk)->delete($path);
            throw $e;
        }
        foreach($oldPaths as $old)Storage::disk($old['disk'])->delete($old['path']);
        return back()->with('success','PDF za mtihani zimehifadhiwa.');

    }
}
