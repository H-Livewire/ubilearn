<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('project_pages')) {
            return;
        }

        foreach (glob(resource_path('page-data/*.json')) as $path) {
            $content = file_get_contents($path);
            json_decode($content, true, 512, JSON_THROW_ON_ERROR);

            DB::table('project_pages')
                ->where('slug', pathinfo($path, PATHINFO_FILENAME))
                ->where(function ($query) {
                    $query->whereNull('content')->orWhere('content', '');
                })
                ->update(['content' => $content]);
        }
    }

    public function down(): void
    {
        // Restored content may have been edited; preserve it on rollback.
    }
};
