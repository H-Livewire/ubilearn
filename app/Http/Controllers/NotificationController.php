<?php

namespace App\Http\Controllers;

use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notificationService) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $notifications = $this->notificationService->notifications($request->all());

        return Inertia::render('notification/index', compact('notifications'));
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $notification = $this->notificationService->markAsRead($id);

        return Inertia::render('notification/show', compact('notification'));
    }

    /**
     * Open a "what's new" item: mark it as seen, then go to the paper, blog or course.
     */
    public function openFeedItem(Request $request, string $kind, int $id)
    {
        $feed = app(\App\Services\ContentFeedService::class);
        $url = $feed->urlFor($kind, $id);

        if ($url) {
            $feed->markRead($request->user(), $kind.'-'.$id);
        }

        return redirect($url ?? '/');
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead()
    {
        $this->notificationService->markAllAsRead();

        return redirect()->back()->with('success', 'All notifications marked as read');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
