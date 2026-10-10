<?php

namespace Modules\Language\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Language\Models\Language;
use Modules\Language\Models\LanguageProperty;

class LanguageDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $groups = [
            'auth' => require resource_path('language/groups/auth.php'),
            'button' => require resource_path('language/groups/button.php'),
            'common' => require resource_path('language/groups/common.php'),
            'dashboard' => require resource_path('language/groups/dashboard.php'),
            'frontend' => require resource_path('language/groups/frontend.php'),
            'input' => require resource_path('language/groups/input.php'),
            'table' => require resource_path('language/groups/table.php'),
            'settings' => require resource_path('language/groups/settings.php'),
        ];

        $language = Language::firstOrCreate(
            ['code' => 'en'],
            [
                'name' => 'English',
                'nativeName' => 'English',
                'is_active' => true,
                'is_default' => true,
            ]
        );

        foreach ($groups as $key => $group) {
            foreach ($group as $value) {
                LanguageProperty::firstOrCreate(
                    ['group' => $key, 'slug' => $value['slug'], 'language_id' => $language->id],
                    [...$value, 'language_id' => $language->id]
                );
            }
        }
    }
}
