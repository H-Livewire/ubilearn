<?php

namespace App\Http\Controllers;

use App\Models\ExamPaper;
use App\Models\ExamPaperComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Threaded comments / questions on a past paper. Reading is public; writing,
 * liking and deleting need a signed-in user (deleting: author or admin).
 */
class ExamPaperCommentController extends Controller
{
    private const MAX_DEPTH = 3;

    private const LIMIT = 400;

    public function index(Request $request, ExamPaper $paper): JsonResponse
    {
        abort_unless($paper->published, 404);

        $comments = ExamPaperComment::query()
            ->where('exam_paper_id', $paper->id)
            ->with('user:id,name,photo,role')
            ->orderBy('id')
            ->limit(self::LIMIT)
            ->get();

        $likes = DB::table('exam_paper_comment_likes')
            ->whereIn('exam_paper_comment_id', $comments->pluck('id'))
            ->selectRaw('exam_paper_comment_id, count(*) as total')
            ->groupBy('exam_paper_comment_id')
            ->pluck('total', 'exam_paper_comment_id');

        $liked = $request->user()
            ? DB::table('exam_paper_comment_likes')
                ->where('user_id', $request->user()->id)
                ->whereIn('exam_paper_comment_id', $comments->pluck('id'))
                ->pluck('exam_paper_comment_id')
                ->all()
            : [];

        return response()->json([
            'total' => $comments->count(),
            'comments' => $comments->map(fn ($comment) => $this->present($comment, (int) ($likes[$comment->id] ?? 0), in_array($comment->id, $liked, true)))->values(),
        ])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, ExamPaper $paper): JsonResponse
    {
        abort_unless($paper->published, 404);

        $data = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:2000'],
            'parent_id' => ['nullable', 'integer'],
        ]);

        $parentId = $data['parent_id'] ?? null;

        if ($parentId) {
            $parent = ExamPaperComment::where('exam_paper_id', $paper->id)->findOrFail($parentId);

            // Keep threads readable: replies below the maximum depth attach to the nearest allowed ancestor.
            $depth = 1;
            $cursor = $parent;

            while ($cursor->parent_id) {
                $cursor = ExamPaperComment::find($cursor->parent_id);
                $depth++;

                if (! $cursor) {
                    break;
                }
            }

            if ($depth >= self::MAX_DEPTH && $parent->parent_id) {
                $parentId = $parent->parent_id;
            }
        }

        $body = trim(strip_tags((string) $data['body']));
        abort_if($body === '', 422, 'Comment is empty.');

        $comment = ExamPaperComment::create([
            'exam_paper_id' => $paper->id,
            'user_id' => $request->user()->id,
            'parent_id' => $parentId,
            'body' => $body,
        ]);
        $comment->load('user:id,name,photo,role');

        return response()->json($this->present($comment, 0, false), 201);
    }

    public function destroy(Request $request, ExamPaperComment $comment): JsonResponse
    {
        abort_unless($request->user()->id === $comment->user_id || $request->user()->role === 'admin', 403);

        $comment->delete();

        return response()->json(['ok' => true]);
    }

    public function like(Request $request, ExamPaperComment $comment): JsonResponse
    {
        $userId = $request->user()->id;
        $query = DB::table('exam_paper_comment_likes')
            ->where('exam_paper_comment_id', $comment->id)
            ->where('user_id', $userId);

        if ($query->exists()) {
            $query->delete();
            $liked = false;
        } else {
            DB::table('exam_paper_comment_likes')->insertOrIgnore([
                'exam_paper_comment_id' => $comment->id,
                'user_id' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $liked = true;
        }

        return response()->json([
            'liked' => $liked,
            'likes' => DB::table('exam_paper_comment_likes')->where('exam_paper_comment_id', $comment->id)->count(),
        ]);
    }

    /** @return array<string, mixed> */
    private function present(ExamPaperComment $comment, int $likes, bool $liked): array
    {
        $photo = $comment->user?->photo;

        return [
            'id' => $comment->id,
            'parent_id' => $comment->parent_id,
            'body' => $comment->body,
            'created_at' => $comment->created_at?->toIso8601String(),
            'likes' => $likes,
            'liked' => $liked,
            'user' => [
                'id' => $comment->user?->id,
                'name' => $comment->user?->name ?? 'Mtumiaji',
                'role' => $comment->user?->role,
                'photo' => $photo
                    ? (preg_match('#^https?://#i', $photo) ? $photo : url('/'.ltrim($photo, '/')))
                    : null,
            ],
        ];
    }
}
