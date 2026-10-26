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
    }
    public function down(): void { Schema::dropIfExists('exam_papers'); }
};
