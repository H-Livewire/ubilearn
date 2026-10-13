<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::table('exam_attempts', function(Blueprint $table) { $table->json('draft_answers')->nullable(); $table->timestamp('deadline_at')->nullable(); }); }
    public function down(): void { Schema::table('exam_attempts', function(Blueprint $table) { $table->dropColumn(['draft_answers', 'deadline_at']); }); }
};
