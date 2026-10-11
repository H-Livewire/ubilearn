<?php
// Regression checks without database mutations.
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Modules\Course\Models\{Course, CourseSection, SectionLesson, SectionQuiz, WatchHistory};
use Illuminate\Database\Eloquent\Collection;
class CourseStartProbe extends Modules\Course\Services\CoursePlayerService {
    public ?WatchHistory $existing = null;
    public array $started = [];
    public function __construct() {}
    public function getWatchHistory(array $data): ?WatchHistory { return $this->existing; }
    public function watchHistory(Course $course, string $watching_id, string $watching_type, string $user_id): WatchHistory {
        $this->started = [$watching_id, $watching_type, $user_id];
        return new WatchHistory;
    }
}
function fixture(array $lessons, array $quizzes): Course {
    $section = new CourseSection;
    $section->setRelation('section_lessons', new Collection($lessons));
    $section->setRelation('section_quizzes', new Collection($quizzes));
    $course = new Course; $course->id = 9;
    $course->setRelation('sections', new Collection([$section])); return $course;
}
function check(bool $ok): void { if (!$ok) { fwrite(STDERR, "Course initialization failed\n"); exit(1); } }
$s = new CourseStartProbe;
$course = fixture([(new SectionLesson)->forceFill(['id'=>2,'lesson_number'=>2]), (new SectionLesson)->forceFill(['id'=>1,'lesson_number'=>1])], []);
$s->ensureWatchHistory($course, '7'); check($s->started === ['1','lesson','7']);
$s = new CourseStartProbe; $s->ensureWatchHistory(fixture([], [(new SectionQuiz)->forceFill(['id'=>3])]), '7'); check($s->started === ['3','quiz','7']);
$s = new CourseStartProbe; check($s->ensureWatchHistory(fixture([], []), '7') === null);
$s = new CourseStartProbe; $s->existing = new WatchHistory; check($s->ensureWatchHistory($course, '7') === $s->existing && $s->started === []);
echo "PASS: first lesson order, quiz-only course, empty course and preserved student progress.\n";
