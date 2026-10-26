<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('company_logos')) {
            return;
        }

        $path = 'assets/logos/ubitech-solutions.png';

        if (! DB::table('company_logos')->where('logo', $path)->exists()) {
            DB::table('company_logos')->insert([
                'name' => 'Ubitech Solutions',
                'logo' => $path,
                'website' => null,
                'sort' => 1,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Cache::forget('company.logos');
    }

    public function down(): void
    {
        if (Schema::hasTable('company_logos')) {
            DB::table('company_logos')->where('logo', 'assets/logos/ubitech-solutions.png')->delete();
        }
    }
};
