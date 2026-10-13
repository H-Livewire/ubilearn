<?php
namespace App\Console\Commands;
use App\Models\User;
use App\Notifications\ExamReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Exam\Models\Exam;
class SendExamReminders extends Command {
 protected $signature='exams:send-reminders';
 protected $description='Send dashboard reminders for followed, scheduled online exams';
 public function handle(): int {
  $sent=0;
  DB::table('exam_reminders')->orderBy('id')->chunkById(200,function($rows)use(&$sent){foreach($rows as $row) {
   DB::transaction(function()use($row,&$sent){
    $reminder=DB::table('exam_reminders')->where('id',$row->id)->lockForUpdate()->first();
    if(!$reminder)return;
    $exam=Exam::find($reminder->exam_id);$user=User::find($reminder->user_id);
    if(!$exam || !$user || $exam->status!=='published' || !$exam->starts_at)return;
    $now=now();$start=$exam->starts_at;
    if($start->lessThanOrEqualTo($now) || $start->greaterThan($now->copy()->addDay()))return;
    $window=$start->lessThanOrEqualTo($now->copy()->addMinutes(30))?'short':'day';
    $field=$window.'_sent_for';
    if($reminder->$field && \Carbon\Carbon::parse($reminder->$field)->equalTo($start))return;
    $user->notify(new ExamReminderNotification($exam,$window));
    DB::table('exam_reminders')->where('id',$row->id)->update([$field=>$start,'updated_at'=>now()]);$sent++;
   });
  }});
  $this->info("Sent {$sent} exam reminders.");return self::SUCCESS;
 }
}
