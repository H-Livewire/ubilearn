<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyLogo extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['active' => 'boolean', 'sort' => 'integer'];
}
