<?php
namespace App\Console\Commands;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Modules\Store\Models\Product;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
class SecureBookFiles extends Command {
 protected $signature='books:secure-files';
 protected $description='Move existing PDF/EPUB product files to protected book storage';
 public function handle(): int {
  if(app()->environment('production') && config('filesystems.disks.books.driver')==='local'){$this->error('Configure the private BOOKS_BUCKET before migrating files.');return self::FAILURE;}
  $count=0;
  Media::where('model_type',Product::class)->where('collection_name',Product::FILES_COLLECTION)->where('disk','!=','books')->whereIn('mime_type',['application/pdf','application/epub+zip'])->chunkById(100,function($files)use(&$count){foreach($files as $file){
   $old=Storage::disk($file->disk);$new=Storage::disk('books');$path=$file->getPathRelativeToRoot();
   $stream=$old->readStream($path);if(!$stream)throw new \RuntimeException('Cannot read book file '.$file->id);
   $hash=hash_init('sha256');hash_update_stream($hash,$stream);$expected=hash_final($hash);rewind($stream);
   try{if(!$new->put($path,$stream,['visibility'=>'private']))throw new \RuntimeException('Cannot secure book file '.$file->id);}finally{fclose($stream);}
   $copy=$new->readStream($path);if(!$copy)throw new \RuntimeException('Cannot verify book file '.$file->id);$hash=hash_init('sha256');hash_update_stream($hash,$copy);fclose($copy);
   if(hash_final($hash)!==$expected)throw new \RuntimeException('Book checksum mismatch '.$file->id);
   $oldDisk=$file->disk;$file->disk='books';$file->save();
   try{if(!$old->delete($path))throw new \RuntimeException('Cannot remove public copy of book '.$file->id);}catch(\Throwable $e){$file->disk=$oldDisk;$file->save();throw $e;}$count++;
  }});
  $this->info("Secured {$count} book files.");return self::SUCCESS;
 }
}
