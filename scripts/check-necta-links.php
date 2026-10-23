<?php
// Official-directory fixtures only; no real results, network or database changes.
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['cache.default'=>'array']);
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use App\Services\NectaResultsService;
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
Http::preventStrayRequests();
$fixtures=[];
foreach(['csee','ftna','acsee'] as $level){
 $root="https://onlinesys.necta.go.tz/results/2025/$level/index.htm";
 $fixtures["https://www.necta.go.tz/results/view/$level"]=Http::response('<a href="'.$root.'">2025</a>');
 $fixtures[$root]=Http::response('<a href="https://evil.example/results/s9999.htm">S9999</a><a href="results/s0101.htm">AZANIA</a><a href="results/p0101.htm">PRIVATE</a>');
}
foreach(['psle','sfna'] as $level){
 $root="https://onlinesys.necta.go.tz/results/2025/$level/";
 $fixtures["https://www.necta.go.tz/results/view/$level"]=Http::response('<a href="'.$root.$level.'.htm">2025</a>');
 $fixtures[$root.$level.'.htm']=Http::response('<a href="results/reg_ps01.htm">ARUSHA</a>');
 $fixtures[$root.'results/reg_ps01.htm']=Http::response('<a href="distr_ps0101.htm">ARUSHA DC</a>');
 $fixtures[$root.'results/distr_ps0101.htm']=Http::response('<a href="shl_ps0101001.htm">SCHOOL</a>');
}
Http::fake($fixtures);
$s=new NectaResultsService;
foreach(['csee','ftna','acsee'] as $level){
 check($s->schoolUrl($level,2025,' s0101 ')==="https://onlinesys.necta.go.tz/results/2025/$level/results/s0101.htm",'Secondary school URL');
 check($s->schoolUrl($level,2025,'P0101')==="https://onlinesys.necta.go.tz/results/2025/$level/results/p0101.htm",'Private centre URL');
}
foreach(['psle','sfna'] as $level)check($s->schoolUrl($level,2025,'PS0101001')==="https://onlinesys.necta.go.tz/results/2025/$level/results/shl_ps0101001.htm",'Primary region/district navigation');
$count=count(Http::recorded());$s->schoolUrl('csee',2025,'S0101');check(count(Http::recorded())===$count,'School link cache');
foreach([['csee',2025,'S9999'],['csee',2024,'S0101'],['csee',2025,'S0101/0001'],['psle',2025,'S0101'],['psle',2025,'PS0101999']] as $args){
 try{$s->schoolUrl(...$args);throw new RuntimeException('Invalid school/year accepted');}catch(ValidationException $e){}
}
foreach(Http::recorded() as [$request])check(!preg_match('~/results/(?:s0101|p0101|shl_ps0101001)\.htm$~i',$request->url()),'Candidate pages must never be downloaded');
$uris=array_map(fn($route)=>$route->uri(),iterator_to_array($app['router']->getRoutes()));
foreach(['lookup','guidance','browse','years'] as $removed)check(!in_array('necta-result/'.$removed,$uris,true),'Removed '.$removed.' endpoint');
check(in_array('necta-result/school',$uris,true),'School endpoint exists');
echo "PASS: official school links for all five levels, primary directories, private centres, cache, missing schools/years, trusted hosts, no candidate downloads and removed result/guidance endpoints.\n";
