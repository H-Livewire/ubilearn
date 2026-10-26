<?php

namespace App\Services;

use App\Models\ExamPaper;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Blog\Models\Blog;
use Modules\Course\Models\Course;

/**
 * "What's new" notifications for regular users: past papers, blogs and courses
 * published in the last two weeks (after the user joined) that they have not opened yet.
 * Nothing is stored per item except the "already opened" marker.
 */
class ContentFeedService
{
    private const DAYS = 14;

    private const PER_KIND = 5;

    private const TOTAL = 10;

    /** @return array<int, array<string, mixed>> notification-shaped rows */
    public function forUser(User $user): array
    {
        if ($user->role === 'admin' || ! Schema::hasTable('user_feed_reads')) {
            return [];
        }

        return Cache::remember($this->cacheKey($user), now()->addSeconds(60), function () use ($user) {
            $since = now()->subDays(self::DAYS);

            if ($user->created_at && $user->created_at->gt($since)) {
                $since = $user->created_at;
            }

            $read = DB::table('user_feed_reads')->where('user_id', $user->id)->pluck('item_key')->all();
            $items = collect();

            foreach (ExamPaper::where('published', true)->whereNotNull('files->question->path')
                ->where('created_at', '>', $since)->latest()->limit(self::PER_KIND)->get(['id', 'title', 'created_at']) as $paper) {
                $items->push($this->row('paper', $paper->id, 'New past paper: '.$paper->title, $paper->created_at));
            }

            foreach (Blog::published()->where('created_at', '>', $since)->latest()->limit(self::PER_KIND)->get(['id', 'title', 'created_at']) as $blog) {
                $items->push($this->row('blog', $blog->id, 'New blog: '.$blog->title, $blog->created_at));
            }

            foreach (Course::approved()->where('created_at', '>', $since)->latest()->limit(self::PER_KIND)->get(['id', 'title', 'created_at']) as $course) {
                $items->push($this->row('course', $course->id, 'New course: '.$course->title, $course->created_at));
            }

            return $items
                ->reject(fn ($row) => in_array($row['data']['key'], $read, true))
                ->sortByDesc('created_at')
                ->take(self::TOTAL)
                ->values()
                ->all();
        });
    }

    /** Where an item leads, or null if it no longer exists. */
    public function urlFor(string $kind, int $id): ?string
    {
        return match ($kind) {
            'paper' => ExamPaper::where('published', true)->whereKey($id)->exists() ? '/examinations/'.$id : null,
            'blog' => ($blog = Blog::published()->find($id)) ? '/read/blogs/'.$blog->uuid : null,
            'course' => ($course = Course::approved()->find($id)) ? '/courses/details/'.$course->slug.'/'.$course->id : null,
            default => null,
        };
    }

    public function markRead(User $user, string $key): void
    {
        DB::table('user_feed_reads')->insertOrIgnore([
            'user_id' => $user->id,
            'item_key' => substr($key, 0, 40),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Cache::forget($this->cacheKey($user));
    }

    public function markAllRead(User $user): void
    {
        foreach ($this->forUser($user) as $row) {
            $this->markRead($user, $row['data']['key']);
        }
    }

    private function cacheKey(User $user): string
    {
        return 'content.feed.'.$user->id;
    }

    /** @return array<string, mixed> */
    private function row(string $kind, int $id, string $title, $createdAt): array
    {
        $key = $kind.'-'.$id;

        return [
            'id' => 'feed-'.$key,
            'read_at' => null,
            'created_at' => $createdAt?->toIso8601String(),
            'data' => [
                'title' => $title,
                'key' => $key,
                'feed' => true,
                'url' => '/notifications/feed/'.$kind.'/'.$id,
            ],
        ];
    }
}
