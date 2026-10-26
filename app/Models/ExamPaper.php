<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ExamPaper extends Model
{
    protected $hidden = ['files', 'pdf_url', 'answer_url', 'source_url'];
    protected $appends = ['has_pdf', 'has_marking', 'has_instructions', 'cover_v'];
    public function getHasPdfAttribute(): bool { return isset($this->files['question']['path']); }
    public function getHasMarkingAttribute(): bool { return isset($this->files['marking']['path']); }
    public function getCoverVAttribute(): ?string { return isset($this->files['cover']['path']) ? substr(md5($this->files['cover']['path']), 0, 10) : null; }
    public function getHasInstructionsAttribute(): bool { return isset($this->files['instructions']['path']); }
    protected $guarded = ['id'];
    protected $casts = ['has_answers'=>'boolean','published'=>'boolean','year'=>'integer','files'=>'array'];
}
