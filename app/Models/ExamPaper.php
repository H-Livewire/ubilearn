<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ExamPaper extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['has_answers'=>'boolean','published'=>'boolean','year'=>'integer'];
}
