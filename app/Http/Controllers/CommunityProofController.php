<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Modules\Course\Models\Course;

/**
 * Public, lightweight numbers + newest member photos for the home page "social proof" block.
 * Polled by the page every few seconds, so the response is cached very briefly.
 */
class CommunityProofController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $payload = Cache::remember('community.proof', now()->addSeconds(3), function () {
            $members = fn () => User::query()->whereNotIn('role', ['admin']);
            $photo = fn ($user) => $user->photo
                ? (preg_match('#^https?://#i', $user->photo) ? $user->photo : url('/'.ltrim($user->photo, '/')))
                : null;

            // Newest members with a profile picture first; fill the rest with initials.
            $avatars = $members()->whereNotNull('photo')->where('photo', '!=', '')
                ->latest('id')->limit(5)->get(['id', 'name', 'photo']);

            if ($avatars->count() < 5) {
                $avatars = $avatars->concat(
                    $members()->whereNotIn('id', $avatars->pluck('id'))
                        ->latest('id')->limit(5 - $avatars->count())->get(['id', 'name', 'photo'])
                );
            }

            return [
                'counts' => [
                    'users' => User::query()->whereNotIn('role', ['admin', 'instructor'])->count(),
                    'instructors' => User::instructors()->count(),
                    'courses' => Course::approved()->count(),
                ],
                'avatars' => $avatars->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'photo' => $photo($user),
                ])->values(),
            ];
        });

        return response()->json($payload)->header('Cache-Control', 'public, max-age=3');
    }
}
