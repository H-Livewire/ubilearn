<?php

namespace Modules\Language\Services;

use App\Services\MediaService;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Lang;
use Modules\Language\Models\Language;
use Modules\Language\Models\LanguageProperty;

class LanguageService extends MediaService
{
    public function cacheKey(string $locale): string
    {
        return "language_properties:{$locale}";
    }

    public function forgetCache(string $locale): void
    {
        Cache::forget($this->cacheKey($locale));
    }

    public function storeLanguage($data)
    {
        $langPath = base_path('lang');
        $langDir = $langPath.'/'.$data['code'];
        $appLangPath = resource_path('language/default');

        if (is_dir($langDir)) {
            throw new Exception('Language already exist');
        }

        $groups = [
            'auth' => require resource_path('language/groups/auth.php'),
            'button' => require resource_path('language/groups/button.php'),
            'common' => require resource_path('language/groups/common.php'),
            'dashboard' => require resource_path('language/groups/dashboard.php'),
            'frontend' => require resource_path('language/groups/frontend.php'),
            'input' => require resource_path('language/groups/input.php'),
            'settings' => require resource_path('language/groups/settings.php'),
            'table' => require resource_path('language/groups/table.php'),
        ];

        $languages = Language::create($data);

        foreach ($groups as $key => $group) {
            foreach ($group as $value) {
                LanguageProperty::create([
                    ...$value,
                    'group' => $key,
                    'language_id' => $languages->id,
                ]);
            }
        }

        File::makeDirectory($langDir, 0777, true, true);
        File::copyDirectory($appLangPath, $langDir);

        $this->forgetCache($languages->code);
    }

    public function updateLanguage($id, $data)
    {
        Language::findOrFail($id)->update($data);
    }

    public function defaultLanguage($id)
    {
        Language::where('is_default', true)->update(['is_default' => false]);
        Language::where('id', $id)->update(['is_default' => true]);
    }

    public function setLanguageProperties(string $locale): void
    {
        $cached = Cache::rememberForever($this->cacheKey($locale), function () use ($locale) {
            $language = Language::where('code', $locale)
                ->with('properties')
                ->first();

            if (! $language) {
                return [];
            }

            $groups = [];
            /** @var LanguageProperty $property */
            foreach ($language->properties as $property) {
                $groups[$property->group] = array_merge($groups[$property->group] ?? [], (array) $property->properties);
            }

            $translations = [];
            foreach ($groups as $group => $properties) {
                foreach ($properties as $key => $value) {
                    $translations[$group.'.'.$key] = $value;
                }
            }

            return $translations;
        });

        $defaults = [];
        foreach (glob(resource_path('language/default/*.php')) as $path) {
            $group = pathinfo($path, PATHINFO_FILENAME);
            foreach (require $path as $key => $value) {
                $defaults[$group.'.'.$key] = $value;
            }
        }

        // Empty saved values must not erase the bundled form labels.
        $overrides = array_filter($cached, fn ($value) => is_string($value) && trim($value) !== '');
        Lang::addLines(array_replace($defaults, $overrides), $locale);
    }

    public function deleteLanguage($id)
    {
        $lang = Language::findOrFail($id);
        $langPath = base_path('lang');
        $langDir = $langPath.'/'.$lang->code;

        if ($lang->is_default) {
            throw new Exception("Default language can't be deleted");
        }

        if (is_dir($langDir)) {
            File::deleteDirectory($langDir);
        }

        $lang->delete();

        $this->forgetCache($lang->code);
    }
}
