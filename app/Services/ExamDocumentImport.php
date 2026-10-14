<?php
namespace App\Services;
use DOMDocument;
use DOMXPath;
use DOMNode;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;
class ExamDocumentImport {
 private function nodeText(DOMNode $node): string {
  if($node->localName==='tab')return '  ';
  if($node->localName==='br')return "\n";
  if($node->localName==='t')return $node->textContent;
  $parts=[];$text='';foreach($node->childNodes as $child){$piece=$this->nodeText($child);$parts[$child->localName][]=$piece;$text.=$piece;}
  if($node->localName==='f')return '('.implode('', $parts['num']??[]).')/('.implode('', $parts['den']??[]).')';
  if($node->localName==='sSup')return implode('', $parts['e']??[]).'^('.implode('', $parts['sup']??[]).')';
  if($node->localName==='sSub')return implode('', $parts['e']??[]).'_('.implode('', $parts['sub']??[]).')';
  if($node->localName==='rad')return '√('.implode('', $parts['e']??[]).')';
  return $text;
 }
 public function docx(UploadedFile $file): array {
  if(!class_exists(ZipArchive::class))throw ValidationException::withMessages(['document'=>'DOCX import requires the PHP ZIP extension.']);
  $zip=new ZipArchive;
  if($zip->open($file->getRealPath())!==true)throw ValidationException::withMessages(['document'=>'Word file is invalid.']);
  try {
   if($zip->numFiles>3000)throw ValidationException::withMessages(['document'=>'Too many files in this Word document.']);
   $stat=$zip->statName('word/document.xml');
   if(!$stat || $stat['size']>5000000)throw ValidationException::withMessages(['document'=>'Word document is too large or invalid.']);
   $xml=$zip->getFromName('word/document.xml');$doc=new DOMDocument;
   if(stripos($xml,'<!DOCTYPE')!==false || !$doc->loadXML($xml,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))throw ValidationException::withMessages(['document'=>'Unable to read Word document.']);
   $xp=new DOMXPath($doc);$xp->registerNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main');
   $formats=[];$counters=[];
   $numbering=$zip->getFromName('word/numbering.xml');
   if($numbering && strlen($numbering)<1000000 && stripos($numbering,'<!DOCTYPE')===false){
    $nd=new DOMDocument;if($nd->loadXML($numbering,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING)){
     $nx=new DOMXPath($nd);$nx->registerNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main');
     foreach($nx->query('//w:num') as $num){
      $id=$num->getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','numId');
      $abstract=$nx->evaluate('string(w:abstractNumId/@w:val)',$num);
      if(!ctype_digit($id) || !ctype_digit($abstract))continue;
      foreach($nx->query('//w:abstractNum[@w:abstractNumId="'.$abstract.'"]/w:lvl') as $level){
       $depth=$level->getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','ilvl');
       $formats[$id][$depth]=['format'=>$nx->evaluate('string(w:numFmt/@w:val)',$level),'start'=>(int)($nx->evaluate('string(w:start/@w:val)',$level)?:1)];
      }
     }
    }
   }
   $lines=[];foreach($xp->query('//w:p') as $p){
    $text=trim($this->nodeText($p));if($text==='')continue;
    $num=$xp->evaluate('string(w:pPr/w:numPr/w:numId/@w:val)',$p);$depth=$xp->evaluate('string(w:pPr/w:numPr/w:ilvl/@w:val)',$p)?:'0';
    if(isset($formats[$num][$depth])){
     $format=$formats[$num][$depth];$count=$counters[$num][$depth]=($counters[$num][$depth]??($format['start']-1))+1;
     foreach($counters[$num] as $other=>$_)if((int)$other>(int)$depth)unset($counters[$num][$other]);
     if($format['format']==='decimal')$text=$count.'. '.$text;
     elseif(in_array($format['format'],['upperLetter','lowerLetter'],true) && $count<=26)$text=chr(64+$count).') '.$text;
    }
    $lines[]=$text;
   }
   $images=[];$total=0;
   for($i=0;$i<$zip->numFiles;$i++){
    $stat=$zip->statIndex($i);if(!str_starts_with($stat['name'],'word/media/') || $stat['size']>2000000)continue;
    $total+=$stat['size'];if($total>10000000 || count($images)>=30)break;
    $bytes=$zip->getFromIndex($i);$info=@getimagesizefromstring($bytes);
    if($info && in_array($info['mime'],['image/png','image/jpeg'],true))$images[]=['name'=>basename($stat['name']),'data'=>'data:'.$info['mime'].';base64,'.base64_encode($bytes)];
   }
   return ['text'=>implode("\n",$lines),'images'=>$images,'warning'=>'Kagua equations, numbering na diagrams dhidi ya document ya awali.'];
  } finally {$zip->close();}
 }
 public function questions(string $text): array {
  $text=str_replace(["\r\n","\r"],"\n",$text);
  $parts=preg_split('/^\s*(?:Question\s+)?\d{1,3}[.):]\s+/mi',$text);
  array_shift($parts);$questions=[];
  foreach(array_slice($parts,0,200) as $part){
   $chunks=preg_split('/(?:^|\n|\s{2,})([A-H])[.):]\s+/m',trim($part),-1,PREG_SPLIT_DELIM_CAPTURE);
   $title=trim(array_shift($chunks));if($title==='')continue;
   $choices=[];for($i=0;$i+1<count($chunks);$i+=2)$choices[]=trim($chunks[$i+1]);
   $questions[]=['title'=>$title,'choices'=>$choices,'correct'=>null,'marks'=>1,'image'=>null];
  }
  return $questions;
 }
}
