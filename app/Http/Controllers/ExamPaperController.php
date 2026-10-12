<?php
namespace App\Http\Controllers;
use App\Models\ExamPaper;
use Illuminate\Http\Request;
use Inertia\Inertia;
class ExamPaperController extends Controller
{
    public const EDUCATION = ['nursery'=>'Awali','primary'=>'Primary','olevel'=>'O-Level','alevel'=>'A-Level','college'=>'College / University'];
    public const REGIONS = ['Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro','Mtwara','Mwanza','Njombe','Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu','Singida','Songwe','Tabora','Tanga','Kaskazini Pemba','Kaskazini Unguja','Kusini Pemba','Kusini Unguja','Mjini Magharibi'];
    public const TYPES = ['NECTA','Mock','Pre-Mock','Pre-NECTA','Joint','Monthly','Midterm','Terminal','Annual','Practice'];
    private function options(): array {
        return ['education'=>self::EDUCATION,'regions'=>self::REGIONS,'types'=>self::TYPES];
    }
    public function index(Request $request) {
        $filters=$request->validate(['q'=>'nullable|string|max:120','education'=>'nullable|in:'.implode(',',array_keys(self::EDUCATION)), 'class_name'=>'nullable|string|max:80','region'=>'nullable|in:'.implode(',',self::REGIONS),'subject'=>'nullable|string|max:80','year'=>'nullable|integer|between:1900,2100','exam_type'=>'nullable|in:'.implode(',',self::TYPES),'answers'=>'nullable|in:yes,no']);
        $query=ExamPaper::where('published',true);
        foreach(['education','class_name','region','subject','year','exam_type'] as $field) if(!empty($filters[$field]))$query->where($field,$filters[$field]);
        if(!empty($filters['answers']))$query->where('has_answers',$filters['answers']==='yes');
        if(!empty($filters['q']))$query->where(function($q)use($filters){foreach(['title','subject','region','organizer'] as $field)$q->orWhere($field,'like','%'.$filters['q'].'%');});
        $available=ExamPaper::where('published',true);
        return Inertia::render('examinations/index',[
            'papers'=>$query->orderByDesc('year')->orderBy('title')->paginate(12)->withQueryString(),
            'filters'=>$filters,'options'=>$this->options(),
            'subjects'=>(clone $available)->whereNotNull('subject')->distinct()->orderBy('subject')->pluck('subject'),
            'years'=>(clone $available)->whereNotNull('year')->distinct()->orderByDesc('year')->pluck('year'),
        ]);
    }
    public function show(ExamPaper $paper){abort_unless($paper->published,404);return Inertia::render('examinations/show',['paper'=>$paper]);}
    public function manage(){return Inertia::render('examinations/manage',['papers'=>ExamPaper::orderByDesc('id')->paginate(20),'options'=>$this->options()]);}
    public function save(Request $request, ?ExamPaper $paper=null){
        $data=$request->validate(['title'=>'required|string|max:255','education'=>'required|in:'.implode(',',array_keys(self::EDUCATION)),'class_name'=>'nullable|string|max:80','region'=>'nullable|in:'.implode(',',self::REGIONS),'subject'=>'nullable|string|max:80','year'=>'nullable|integer|between:1900,2100','exam_type'=>'nullable|in:'.implode(',',self::TYPES),'organizer'=>'nullable|string|max:120','source_name'=>'nullable|string|max:120','source_url'=>'nullable|url:https|max:2000','pdf_url'=>'nullable|url:https|max:2000','answer_url'=>'nullable|url:https|max:2000','has_answers'=>'required|boolean','published'=>'required|boolean']);
        if(empty($data['source_url'])&&empty($data['pdf_url']))return back()->withErrors(['source_url'=>'Weka link ya chanzo au PDF.']);
        ($paper??new ExamPaper)->fill($data)->save();return back()->with('success','Mtihani umehifadhiwa.');
    }
}
