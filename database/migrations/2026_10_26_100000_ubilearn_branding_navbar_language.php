<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Language\Models\Language;
use Modules\Language\Models\LanguageProperty;
use Modules\Language\Services\LanguageService;

return new class extends Migration
{
    public function up(): void
    {
        $this->removeCareers();
        $this->renameBrandText();
        $this->ensureSwahili();
    }

    public function down(): void
    {
        // Content clean-up only; nothing to restore automatically.
    }

    private function removeCareers(): void
    {
        if (Schema::hasTable('navbar_items')) {
            DB::table('navbar_items')->where('slug', 'careers')->delete();
        }

        if (Schema::hasTable('footer_items')) {
            foreach (DB::table('footer_items')->get() as $row) {
                $items = json_decode($row->items ?? '[]', true);

                if (! is_array($items)) {
                    continue;
                }

                $kept = array_values(array_filter($items, fn ($item) => ! is_array($item) || ($item['url'] ?? null) !== '/careers'));

                if (count($kept) !== count($items)) {
                    DB::table('footer_items')->where('id', $row->id)->update(['items' => json_encode($kept)]);
                }
            }
        }

        if (Schema::hasTable('page_sections')) {
            foreach (DB::table('page_sections')->whereIn('slug', ['footer_list_1', 'footer_list_2', 'footer_list_3'])->get() as $row) {
                $properties = json_decode($row->properties ?? 'null', true);

                if (! is_array($properties) || ! isset($properties['array']) || ! is_array($properties['array'])) {
                    continue;
                }

                $before = count($properties['array']);
                $properties['array'] = array_values(array_filter(
                    $properties['array'],
                    fn ($item) => ! is_array($item) || ($item['url'] ?? null) !== '/careers'
                ));

                if (count($properties['array']) !== $before) {
                    DB::table('page_sections')->where('id', $row->id)->update(['properties' => json_encode($properties)]);
                }
            }
        }
    }

    private function renameBrandText(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        $system = Setting::where('type', 'system')->first();

        if (! $system) {
            return;
        }

        $fields = $system->fields;
        $description = (string) ($fields['description'] ?? '');
        $changed = false;

        if (str_contains($description, 'Mentor LMS - a comprehensive online learning platform')) {
            $fields['description'] = str_replace(
                'Mentor LMS - a comprehensive online learning platform',
                'Ubilearn,',
                $description
            );
            $changed = true;
        }

        if ($changed) {
            $system->fields = $fields;
            $system->save();
        }
    }

    private function ensureSwahili(): void
    {
        if (! Schema::hasTable('languages')) {
            return;
        }

        $english = Language::where('code', 'en')->first();

        if ($english && empty($english->flag)) {
            $english->update(['flag' => '🇺🇸']);
        }

        $swahili = Language::where('code', 'sw')->first();

        if (! $swahili) {
            if (is_dir(base_path('lang/sw'))) {
                // Folder from an earlier attempt without a DB row: reuse it.
                $swahili = Language::create([
                    'name' => 'Swahili',
                    'code' => 'sw',
                    'nativeName' => 'Kiswahili',
                    'flag' => '🇹🇿',
                    'is_active' => true,
                    'is_default' => false,
                ]);
                $this->seedProperties($swahili);
            } else {
                app(LanguageService::class)->storeLanguage([
                    'name' => 'Swahili',
                    'code' => 'sw',
                    'nativeName' => 'Kiswahili',
                    'flag' => '🇹🇿',
                    'is_active' => true,
                    'is_default' => false,
                ]);
                $swahili = Language::where('code', 'sw')->first();
            }
        } else {
            $swahili->update(['flag' => '🇹🇿', 'is_active' => true]);
        }

        // Only English and Swahili are offered.
        Language::whereNotIn('code', ['en', 'sw'])->update(['is_active' => false]);

        if ($swahili) {
            $this->applySwahiliText($swahili);
        }

    }

    private function seedProperties(Language $language): void
    {
        foreach (['auth', 'button', 'common', 'dashboard', 'frontend', 'input', 'settings', 'table'] as $group) {
            $definitions = require resource_path("language/groups/{$group}.php");

            foreach ($definitions as $value) {
                LanguageProperty::firstOrCreate(
                    ['group' => $group, 'slug' => $value['slug'], 'language_id' => $language->id],
                    [...$value, 'group' => $group, 'language_id' => $language->id]
                );
            }
        }
    }

    private function applySwahiliText(Language $language): void
    {
        foreach (['auth', 'button', 'common', 'dashboard', 'frontend', 'input', 'settings', 'table'] as $group) {
            $path = resource_path("language/sw/{$group}.php");

            if (! file_exists($path)) {
                continue;
            }

            $translations = require $path;

            LanguageProperty::where('language_id', $language->id)
                ->where('group', $group)
                ->get()
                ->each(function (LanguageProperty $property) use ($translations) {
                    $properties = (array) $property->properties;

                    foreach ($properties as $key => $value) {
                        if (isset($translations[$key])) {
                            $properties[$key] = $translations[$key];
                        }
                    }

                    $property->update(['properties' => $properties]);
                });
        }

        app(LanguageService::class)->forgetCache('sw');
    }
};
