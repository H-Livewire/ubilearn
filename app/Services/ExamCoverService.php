<?php
namespace App\Services;

use App\Models\ExamPaper;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/** Builds a small first-page JPEG for a past paper on the server so the catalogue never renders PDFs in the browser. */
class ExamCoverService
{
    public const WIDTH = 420;

    public static function generate(ExamPaper $paper): ?array
    {
        $question = $paper->files['question'] ?? null;
        if (!$question || empty($question['disk']) || empty($question['path'])) return null;
        $failedKey = 'exam-cover-failed:'.$paper->id;
        if (Cache::has($failedKey)) return null;
        $dir = sys_get_temp_dir().'/exam-cover-'.Str::uuid();
        if (!@mkdir($dir, 0700, true) && !is_dir($dir)) return null;
        try {
            $source = $dir.'/in.pdf';
            $stream = Storage::disk($question['disk'])->readStream($question['path']);
            if (!$stream) throw new \RuntimeException('missing pdf');
            $target = fopen($source, 'wb');
            stream_copy_to_stream($stream, $target);
            fclose($target);
            if (is_resource($stream)) fclose($stream);
            $image = self::render($source, $dir);
            if (!$image || !is_file($image) || filesize($image) < 500) throw new \RuntimeException('render failed');
            $disk = config('filesystems.default');
            $path = 'examination-covers/'.Str::uuid().'.jpg';
            Storage::disk($disk)->put($path, file_get_contents($image));
            $fresh = ExamPaper::find($paper->id) ?? $paper;
            $files = $fresh->files ?? [];
            $old = $files['cover'] ?? null;
            $files['cover'] = ['disk' => $disk, 'path' => $path, 'mime' => 'image/jpeg'];
            $fresh->files = $files;
            $fresh->save();
            if ($old && isset($old['disk'], $old['path'])) Storage::disk($old['disk'])->delete($old['path']);
            return $files['cover'];
        } catch (\Throwable $e) {
            Cache::put($failedKey, true, now()->addHours(6));
            return null;
        } finally {
            foreach (glob($dir.'/*') ?: [] as $file) @unlink($file);
            @rmdir($dir);
        }
    }

    private static function run(array $command): bool
    {
        $process = new Process($command);
        $process->setTimeout(25);
        try { $process->run(); } catch (\Throwable $e) { return false; }
        return $process->isSuccessful();
    }

    private static function render(string $source, string $dir): ?string
    {
        $finder = new ExecutableFinder();
        $out = $dir.'/cover.jpg';
        if ($bin = $finder->find('pdftoppm')) {
            if (self::run([$bin, '-jpeg', '-jpegopt', 'quality=78', '-f', '1', '-l', '1', '-singlefile', '-scale-to-x', (string)self::WIDTH, '-scale-to-y', '-1', $source, $dir.'/cover']) && is_file($out)) return $out;
        }
        if ($bin = $finder->find('gs')) {
            if (self::run([$bin, '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=jpeg', '-dJPEGQ=78', '-dFirstPage=1', '-dLastPage=1', '-r55', '-dTextAlphaBits=4', '-dGraphicsAlphaBits=4', '-sOutputFile='.$out, $source]) && is_file($out)) return $out;
        }
        if (class_exists(\Imagick::class)) {
            try {
                $im = new \Imagick();
                $im->setResolution(60, 60);
                $im->readImage($source.'[0]');
                $im->setImageBackgroundColor('white');
                $im = $im->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);
                $im->setImageFormat('jpeg');
                $im->setImageCompressionQuality(78);
                $im->thumbnailImage(self::WIDTH, 0);
                $im->writeImage($out);
                $im->clear();
                if (is_file($out)) return $out;
            } catch (\Throwable $e) {}
        }
        return null;
    }
}
