<?php

namespace App\Http\Controllers;

use App\Models\CompanyLogo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Partner / client company logos shown in the home page marquee.
 * Admins manage them; the public endpoint only returns active ones.
 */
class CompanyLogoController extends Controller
{
    private const DIR = 'uploads/company-logos';

    private const CACHE_KEY = 'company.logos';

    public function manage(): Response
    {
        return Inertia::render('company-logos/manage', [
            'logos' => CompanyLogo::query()->orderBy('sort')->orderBy('id')->get(),
        ]);
    }

    public function publicList(): JsonResponse
    {
        $payload = Cache::remember(self::CACHE_KEY, now()->addMinutes(5), function () {
            $logos = CompanyLogo::query()->where('active', true)
                ->orderBy('sort')->orderBy('id')
                ->get(['id', 'name', 'logo', 'website']);

            return [
                'count' => $logos->count(),
                'logos' => $logos->map(fn ($logo) => [
                    'id' => $logo->id,
                    'name' => $logo->name,
                    'logo' => '/'.ltrim($logo->logo, '/'),
                    'website' => $logo->website,
                ])->values(),
            ];
        });

        return response()->json($payload)->header('Cache-Control', 'public, max-age=60');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'website' => ['nullable', 'url', 'max:255'],
            'logo' => ['required', 'file', 'mimes:png,jpg,jpeg,webp,svg', 'max:3072'],
        ]);

        $file = $request->file('logo');
        $name = Str::slug($data['name']) ?: 'logo';
        $filename = $name.'-'.Str::lower(Str::random(8)).'.'.$file->guessExtension();
        $file->move(public_path(self::DIR), $filename);

        CompanyLogo::create([
            'name' => $data['name'],
            'website' => $data['website'] ?? null,
            'logo' => self::DIR.'/'.$filename,
            'sort' => (int) CompanyLogo::max('sort') + 1,
            'active' => true,
        ]);

        Cache::forget(self::CACHE_KEY);

        return back()->with('success', 'Company logo added.');
    }

    public function update(Request $request, CompanyLogo $logo): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $logo->update($data);
        Cache::forget(self::CACHE_KEY);

        return back();
    }

    public function destroy(CompanyLogo $logo): RedirectResponse
    {
        $path = public_path($logo->logo);

        if (str_starts_with($logo->logo, self::DIR.'/') && File::exists($path)) {
            File::delete($path);
        }

        $logo->delete();
        Cache::forget(self::CACHE_KEY);

        return back()->with('success', 'Company logo removed.');
    }
}
