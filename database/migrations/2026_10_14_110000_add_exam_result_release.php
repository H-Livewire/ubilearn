<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::table('exam_attempts',function(Blueprint $t){$t->timestamp('released_at')->nullable();$t->unsignedBigInteger('released_by')->nullable();}); }
 public function down(): void { Schema::table('exam_attempts',function(Blueprint $t){$t->dropColumn(['released_at','released_by']);}); }
};
