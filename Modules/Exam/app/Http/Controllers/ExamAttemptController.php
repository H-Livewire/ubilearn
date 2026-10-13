<?php

namespace Modules\Exam\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Exam\Http\Requests\ExamAttemptRequest;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamAttempt;
use Modules\Exam\Services\ExamAttemptService;
use Modules\Exam\Services\ExamEnrollmentService;

class ExamAttemptController extends Controller
{
    public function __construct(
        protected ExamAttemptService $examAttempt,
        protected ExamEnrollmentService $enrollmentService
    ) {}

    /**
     * Display a listing of exams
     */
    public function index(Request $request, string $exam_id): Response
    {
        $attempts = $this->examAttempt->getExamAttempts(array_merge($request->all(), [
            'exam_id' => $exam_id,
            'paginate' => true,
            'relations' => ['user:id,name,email'],
        ]));

        return Inertia::render('Exam/dashboard/exams/attempts', [
            'exam_id' => $exam_id,
            'attempts' => $attempts,
        ]);
    }

    /**
     * Show single exam details (public page)
     */
    public function review(string $exam_id, string $id): Response
    {
        $attempt = $this->examAttempt->getExamAttempt($id, [
            'relations' => [
                'attempt_answers:id,exam_attempt_id,exam_question_id,answer_data,is_correct,marks_obtained',
                'attempt_answers.exam_question:id,title,description,marks,question_type,options',
                'attempt_answers.exam_question.question_options:id,exam_question_id,option_text,is_correct',
            ],
        ]);

        return Inertia::render('Exam/dashboard/exams/review', [
            'exam_id' => $exam_id,
            'attempt' => $attempt,
            'deadline' => $this->deadline($attempt)->toIso8601String(),
            'savedAnswers' => $attempt->draft_answers ?? [],
        ]);
    }

    /**
     * Start a new exam attempt
     */
    public function start(ExamAttemptRequest $request, Exam $exam)
    {
        $user = Auth::user();
        $attempt = $this->examAttempt->startAttempt($user, $exam);

        if (! $attempt) {
            return back()->with('error', 'Unable to start exam. You may have reached the maximum number of attempts.');
        }

        return redirect()
            ->route('exam-attempts.take', $attempt->id)
            ->with('success', 'Exam started. Good luck!');
    }

    /**
     * Take the exam (show questions)
     */
    public function take(ExamAttempt $attempt)
    {
        abort_unless((int) $attempt->user_id === (int) Auth::id(), 403);
        abort_unless($attempt->status === 'in_progress', 409);
        $attempt->load(['exam.questions.question_options']);

        return Inertia::render('student/exam/attempt', [
            'attempt' => $attempt,
        ]);
    }

    private function deadline(ExamAttempt $attempt): \Carbon\CarbonInterface
    {
        return $attempt->deadline_at ?? $attempt->start_time->copy()->addMinutes(max(1, ($attempt->exam->duration_hours * 60 + $attempt->exam->duration_minutes) ?: 60));
    }

    public function saveDraft(Request $request, ExamAttempt $attempt)
    {
        abort_unless((int) $attempt->user_id === (int) Auth::id(), 403);
        $data = $request->validate([
            'answers' => 'present|array|max:1000',
            'answers.*.exam_question_id' => ['required', 'distinct', Rule::exists('exam_questions', 'id')->where('exam_id', $attempt->exam_id)],
            'answers.*.answer_data' => 'present',
        ]);
        return DB::transaction(function () use ($attempt, $data) {
            $locked = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === 'in_progress', 409);
            abort_if(now()->greaterThanOrEqualTo($this->deadline($locked)), 409, 'Exam time has ended.');
            $locked->update(['draft_answers' => $data['answers']]);
            return response()->json(['saved_at' => now()->toIso8601String()]);
        });
    }

    /**
     * Submit exam answers
     */
    public function submit(ExamAttemptRequest $request, ExamAttempt $attempt)
    {
        abort_unless((int) $attempt->user_id === (int) Auth::id(), 403);
        // Check if attempt is in progress
        if ($attempt->status !== 'in_progress') {
            return back()->with('error', 'This attempt has already been submitted.');
        }

        $attempt = DB::transaction(function () use ($request, $attempt) {
            $locked = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === 'in_progress', 409);
            $answers = now()->greaterThanOrEqualTo($this->deadline($locked))
                ? ($locked->draft_answers ?? []) : $request->input('answers', []);
            return $this->examAttempt->submitAttempt($locked, $answers);
        });

        return redirect()
            ->route('student.exam.show', [
                'id' => $attempt->exam_id,
                'tab' => 'attempts',
                'attempt' => $attempt->id,
            ])
            ->with('success', 'Exam submitted successfully!');
    }

    /**
     * Abandon an in-progress attempt
     */
    public function abandon(ExamAttempt $attempt)
    {
        abort_unless((int) $attempt->user_id === (int) Auth::id(), 403);
        if ($attempt->status !== 'in_progress') {
            return back()->with('error', 'This attempt is not in progress.');
        }

        $this->examAttempt->abandonAttempt($attempt);

        return redirect()
            ->route('exams.edit', [
                'exam' => $attempt->exam_id,
                'tab' => 'attempts',
                'attempt' => $attempt->id,
            ])
            ->with('info', 'Exam attempt abandoned.');
    }

    /**
     * Grade exam attempt (Admin/Instructor only)
     */
    public function grade(Request $request, ExamAttempt $attempt)
    {
        // Validate manual grades
        $manualGrades = $request->input('manual_grades', []);

        $this->examAttempt->reviewAttempt($attempt, $manualGrades);

        return redirect(route('exam-attempts.index', $attempt->exam_id))->with('success', 'Exam attempt graded successfully!');
    }
}
