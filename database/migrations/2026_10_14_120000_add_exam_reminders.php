<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void {
  Schema::table('exams',fn(Blueprint $t)=>$t->timestamp('starts_at')->nullable()->index());
  Schema::create('exam_reminders',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained()->cascadeOnDelete();$t->foreignId('exam_id')->constrained()->cascadeOnDelete();$t->timestamp('day_sent_for')->nullable();$t->timestamp('short_sent_for')->nullable();$t->timestamps();$t->unique(['user_id','exam_id']);});
 }
 public function down(): void {Schema::dropIfExists('exam_reminders');Schema::table('exams',fn(Blueprint $t)=>$t->dropColumn('starts_at'));}
};
