<?php
namespace App\Console\Commands;
use App\Models\ExamPaper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
class PruneExamPapersWithoutPdf extends Command {
    protected $signature='exam-papers:prune-without-pdf {--force : Delete without asking}';
    protected $description='Delete past papers that have no question PDF (old sample data without preview)';
    public function handle(): int {
        $papers=ExamPaper::orderBy('id')->get()->filter(fn(ExamPaper $paper)=>!$paper->has_pdf);
        if($papers->isEmpty()){$this->info('Hakuna mitihani isiyo na PDF.');return self::SUCCESS;}
        $this->table(['ID','Title','Class','Subject','Year'],$papers->map(fn($p)=>[$p->id,$p->title,$p->class_name,$p->subject,$p->year])->all());
        if(!$this->option('force') && !$this->confirm('Futa mitihani '.$papers->count().' isiyo na PDF? Mitihani yenye PDF haitaguswa.'))return self::FAILURE;
        foreach($papers as $paper){
            foreach(($paper->files??[]) as $file){if(isset($file['disk'],$file['path']))Storage::disk($file['disk'])->delete($file['path']);}
            $paper->delete();
        }
        $this->info("Imefutwa: {$papers->count()}. Mitihani yenye PDF imebaki.");
        return self::SUCCESS;
    }
}
