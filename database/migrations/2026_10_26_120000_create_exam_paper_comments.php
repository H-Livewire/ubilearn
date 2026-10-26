<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_paper_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_paper_id')->constrained('exam_papers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('exam_paper_comments')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->index(['exam_paper_id', 'parent_id']);
        });

        Schema::create('exam_paper_comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_paper_comment_id')->constrained('exam_paper_comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['exam_paper_comment_id', 'user_id'], 'exam_paper_comment_likes_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_paper_comment_likes');
        Schema::dropIfExists('exam_paper_comments');
    }
};
