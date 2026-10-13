<?php
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:']);
Illuminate\Support\Facades\DB::purge('sqlite');
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Artisan;
Schema::create('users',function($t){$t->id();$t->string('name');$t->string('email');});
Schema::create('exams',function($t){$t->id();$t->string('title');$t->string('slug');$t->string('status');});
Schema::create('notifications',function($t){$t->uuid('id')->primary();$t->string('type');$t->morphs('notifiable');$t->text('data');$t->timestamp('read_at')->nullable();$t->timestamps();});
$m=require dirname(__DIR__).'/database/migrations/2026_10_14_120000_add_exam_reminders.php';$m->up();
Date::setTestNow('2026-10-14 08:00:00 UTC');
DB::table('users')->insert(['id'=>1,'name'=>'Test student','email'=>'student@example.test']);
DB::table('exams')->insert([['id'=>1,'title'=>'Science','slug'=>'science','status'=>'published','starts_at'=>now()->addDay()],['id'=>2,'title'=>'Draft','slug'=>'draft','status'=>'draft','starts_at'=>now()->addDay()]]);
foreach([1,2] as $exam)DB::table('exam_reminders')->insert(['user_id'=>1,'exam_id'=>$exam,'created_at'=>now(),'updated_at'=>now()]);
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
function runReminder(){Artisan::call('exams:send-reminders');}
runReminder();check(DB::table('notifications')->count()===1,'Day reminder/published guard');runReminder();check(DB::table('notifications')->count()===1,'Duplicate day reminder');
Date::setTestNow('2026-10-15 07:30:00 UTC');runReminder();check(DB::table('notifications')->count()===2,'30 minute reminder');runReminder();check(DB::table('notifications')->count()===2,'Duplicate short reminder');
Date::setTestNow('2026-10-15 08:00:00 UTC');runReminder();check(DB::table('notifications')->count()===2,'No start-time reminder');
DB::table('exams')->where('id',1)->update(['starts_at'=>now()->addDay()]);runReminder();check(DB::table('notifications')->count()===3,'Rescheduled exam reminder');
DB::table('exam_reminders')->where('exam_id',1)->delete();Date::setTestNow('2026-10-16 07:30:00 UTC');runReminder();check(DB::table('notifications')->count()===3,'Unsubscribed student notified');
Date::setTestNow();echo "PASS: 24-hour/30-minute windows, duplicate prevention, drafts excluded, no start reminder, rescheduling and unsubscribe.\n";
