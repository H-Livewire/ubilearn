<?php
namespace App\Notifications;
use Illuminate\Notifications\Notification;
use Modules\Exam\Models\Exam;
class ExamReminderNotification extends Notification {
 public function __construct(private Exam $exam, private string $window) {}
 public function via(object $notifiable): array {return ['database'];}
 public function toArray(object $notifiable): array {
  return ['title'=>'Exam reminder: '.$this->exam->title,'body'=>($this->window==='day'?'Mtihani unaanza ndani ya saa 24. ':'Mtihani unaanza ndani ya dakika 30. ').'Muda: '.$this->exam->starts_at->timezone('Africa/Dar_es_Salaam')->format('d/m/Y H:i').' (EAT)', 'url'=>'/exams/details/'.$this->exam->slug.'/'.$this->exam->id];
 }
}
