<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('footer_items')) return;

        DB::table('footer_items')->where('slug', 'address')->update([
            'items' => json_encode([
                ['title' => 'Kigamboni, Dar es Salaam'],
                ['title' => 'Email: ubilearn@gmail.com'],
                ['title' => 'Phone: 0754454705'],
            ], JSON_THROW_ON_ERROR),
        ]);
    }

    public function down(): void
    {
        // Preserve the owner's contact details on rollback.
    }
};
