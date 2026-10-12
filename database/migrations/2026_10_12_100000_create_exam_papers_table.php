<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        Schema::create('exam_papers', function(Blueprint $t){
            $t->id(); $t->string('title'); $t->string('education'); $t->string('class_name')->nullable();
            $t->string('region')->nullable(); $t->string('subject')->nullable(); $t->unsignedSmallInteger('year')->nullable();
            $t->string('exam_type')->nullable(); $t->string('organizer')->nullable(); $t->string('source_name')->nullable();
            $t->text('source_url')->nullable(); $t->text('pdf_url')->nullable(); $t->text('answer_url')->nullable();
            $t->boolean('has_answers')->default(false); $t->boolean('published')->default(true); $t->timestamps();
            $t->index(['published','education','region']);
        });
        // Source-page references only. No third-party PDFs are copied or modified.
        $groups = [
            ['Dar es Salaam','https://www.msomibora.com/2026/09/dar-es-salaam-form-four-mock-exams-2026-download-all-subjects/',['Mathematics','English','Biology','Chemistry','Physics','Geography','History','Kiswahili','Civics']],
            ['Pwani','https://www.msomibora.com/2026/07/pwani-coast-form-four-mock-exams-2026-download-all-subjects/',['Mathematics','English','Biology','Chemistry','Physics','Geography','History','Kiswahili','Civics']],
            ['Kigoma','https://www.msomibora.com/2026/08/kigoma-form-four-mock-exams-2026-download-all-subjects/',['Physics','Geography']],
        ];
        foreach($groups as [$region,$source,$subjects]) foreach($subjects as $subject){
            DB::table('exam_papers')->insert(['title'=>$region.' '.$subject.' Mock 2026','education'=>'olevel','class_name'=>'Form 4','region'=>$region,'subject'=>$subject,'year'=>2026,'exam_type'=>'Mock','source_name'=>'MsomiBora','source_url'=>$source,'created_at'=>now(),'updated_at'=>now()]);
        }

    }
    public function down(): void { Schema::dropIfExists('exam_papers'); }
};
