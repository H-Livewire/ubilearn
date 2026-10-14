<?php
require dirname(__DIR__).'/vendor/autoload.php';$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Http\Request;use Illuminate\Http\UploadedFile;use Modules\Exam\Http\Controllers\ExamImportController;use App\Services\ExamDocumentImport;
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$path=tempnam(sys_get_temp_dir(),'word-test-');$output=null;
$xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. What is 2 + 2?</w:t></w:r></w:p></w:body></w:document>';
$zip=new ZipArchive;$zip->open($path,ZipArchive::OVERWRITE);$zip->addFromString('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" /></Types>');$zip->addFromString('word/document.xml',$xml);
$old=imagecreatetruecolor(2,2);imagefill($old,0,0,imagecolorallocate($old,255,0,0));ob_start();imagepng($old);$oldBytes=ob_get_clean();$zip->addFromString('word/media/logo.png',$oldBytes);$zip->close();
$new=imagecreatetruecolor(2,2);imagefill($new,0,0,imagecolorallocate($new,0,150,80));ob_start();imagejpeg($new);$replacement=ob_get_clean();
try{
 $r=Request::create('/dashboard/exam-import/brand-docx','POST',['replacements'=>[['name'=>'logo.png','data'=>'data:image/jpeg;base64,'.base64_encode($replacement)]]],[],['document'=>new UploadedFile($path,'exam.docx',null,null,true)]);
 $response=(new ExamImportController)->brandDocx($r,new ExamDocumentImport);$output=$response->getFile()->getPathname();$result=new ZipArchive;check($result->open($output)===true,'Prepared DOCX invalid');check($result->getFromName('word/document.xml')===$xml,'Questions changed during branding');check($result->getFromName('word/media/logo.png')!==$oldBytes,'Logo unchanged');check(getimagesizefromstring($result->getFromName('word/media/logo.png'))['mime']==='image/png','Original image format not preserved');$result->close();
 $source=new ZipArchive;$source->open($path);check($source->getFromName('word/media/logo.png')===$oldBytes,'Original document modified');$source->close();
 $r=Request::create('/dashboard/exam-import/brand-docx','POST',['replacements'=>[['name'=>'../logo.png','data'=>'data:image/jpeg;base64,'.base64_encode($replacement)]]],[],['document'=>new UploadedFile($path,'exam.docx',null,null,true)]);
 try{(new ExamImportController)->brandDocx($r,new ExamDocumentImport);throw new RuntimeException('Unsafe asset name accepted');}catch(Illuminate\Validation\ValidationException $e){}
 foreach($app['router']->getRoutes() as $route)if($route->uri()==='dashboard/exam-import')check(in_array(App\Http\Middleware\ExamManagement::class,$route->gatherMiddleware()),'Hub missing Teacher guard');
 echo "PASS: prepared DOCX logo replacement, original questions preserved, original file unchanged, image encoding, unsafe name rejection and Teacher-only upload hub.\n";
}finally{unlink($path);if($output && file_exists($output))unlink($output);imagedestroy($old);imagedestroy($new);}
