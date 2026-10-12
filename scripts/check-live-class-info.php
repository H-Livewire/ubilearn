<?php
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$info=['id'=>123,'join_url'=>'https://zoom.us/j/123'];
foreach([json_encode($info),json_encode(json_encode($info)),null,'broken-json'] as $raw){
 $m=new Modules\Course\Models\CourseLiveClass;$m->setRawAttributes(['additional_info'=>$raw]);
 $expected=($raw===null||$raw==='broken-json')?[]:$info;
 if($m->getAdditionalInfoArray()!==$expected||$m->toArray()['additional_info']!==$expected){fwrite(STDERR,"Meeting info decoding failed\n");exit(1);}
}
echo "PASS: regular and legacy meeting JSON, empty data and serialized browser props.\n";
