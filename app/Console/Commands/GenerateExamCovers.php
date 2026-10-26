<?php
namespace App\Console\Commands;
use App\Models\ExamPaper;
use App\Services\ExamCoverService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class GenerateExamCovers extends Command {
    protected $signature='exam-papers:generate-covers {--all : Rebuild covers that already exist}';
    protected $description='Create fast first-page cover images for past papers on the server';
    public function handle(): int {
        $papers=ExamPaper::whereNotNull('files->question->path')->orderBy('id')->get()->filter(fn(ExamPaper $p)=>$this->option('all')||!isset($p->files['cover']['path']));
        if($papers->isEmpty()){$this->info('Covers zote tayari ziko.');return self::SUCCESS;}
        $ok=0;$bad=0;
        foreach($papers as $paper){
            Cache::forget('exam-cover-failed:'.$paper->id);
            if(ExamCoverService::generate($paper)){$ok++;}else{$bad++;$this->warn("Imeshindikana: #{$paper->id} {$paper->title}");}
        }
        $this->info("Covers zimeundwa: {$ok}. Zilizoshindikana: {$bad}.");
        if($bad&&!$ok)$this->line('Sakinisha poppler-utils (pdftoppm), ghostscript au Imagick kwenye server.');
        return self::SUCCESS;
    }
}
