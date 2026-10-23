<?php
// Uses isolated SQLite and fake storage; never touches application records.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$app['env'] = 'testing';
config(['database.default'=>'sqlite','database.connections.sqlite.database'=>':memory:','session.driver'=>'array']);
Illuminate\Support\Facades\DB::purge('sqlite');
use Illuminate\Support\Facades\{Schema,DB,Storage,Auth,Artisan};
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\{Request,UploadedFile};
use Modules\Store\Models\{Product,ProductOrder};
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
foreach(['users','instructors','product_categories','product_category_children'] as $table){Schema::create($table,function(Blueprint $t){$t->id();$t->string('title')->nullable();$t->string('slug')->nullable();$t->string('name')->nullable();$t->unsignedBigInteger('user_id')->nullable();$t->timestamps();});DB::table($table)->insert(['id'=>1]);}
DB::table('users')->insert(['id'=>2]);
foreach(['database/migrations/2025_02_08_095546_create_media_table.php','Modules/Store/database/migrations/2026_08_05_145118_create_products_table.php','Modules/Store/database/migrations/2026_08_05_145128_create_product_orders_table.php'] as $path){(require dirname(__DIR__).'/'.$path)->up();}
Storage::fake('books');Storage::fake('public');
$pdf="%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
$book=Product::create(['title'=>'Test book','slug'=>'test-book','summary'=>'Test','status'=>'approved','pricing_type'=>'paid','price'=>1000,'instructor_id'=>1,'product_category_id'=>1]);
$file=$book->addMedia(UploadedFile::fake()->createWithContent('book.pdf',$pdf))->usingName('book.pdf')->toMediaCollection(Product::FILES_COLLECTION);
check($file->disk==='books','Book must use private disk');
check(Storage::disk('books')->get($file->getPathRelativeToRoot())===$pdf,'Stored PDF bytes');
check(!array_key_exists('media',$book->load('media')->toArray()),'Raw storage URLs hidden');
check(str_contains($book->files[0]['url'],'/download'),'Purchase-gated file link');
$user=new App\Models\User(['role'=>'student']);$user->id=1;Auth::setUser($user);
$request=Request::create('/download');$route=new Illuminate\Routing\Route('GET','products/{product}/files/{media}/download',fn()=>null);$route->bind($request);$route->setParameter('product',$book);$request->setRouteResolver(fn()=>$route);
$guard=new Modules\Store\Http\Middleware\ProductPurchasedMiddleware;
$next=fn()=>response('allowed');
check($guard->handle($request,$next)->getStatusCode()===302,'Unpaid buyer blocked');
$claim=Modules\Store\Http\Requests\StoreProductOrderRequest::create('/claim','POST',['product_id'=>$book->id]);$claim->setUserResolver(fn()=>$user);$validator=Illuminate\Support\Facades\Validator::make($claim->all(),$claim->rules());$claim->withValidator($validator);check($validator->fails(),'Paid book cannot be claimed for free');
$service=app(Modules\Store\Services\ProductService::class);check($service->getCheckoutProduct((string)$book->id)->id===$book->id,'Approved private book checkout');
$book->update(['status'=>'draft']);try{$service->getCheckoutProduct((string)$book->id);throw new RuntimeException('Draft checkout accepted');}catch(Illuminate\Database\Eloquent\ModelNotFoundException $e){}$book->update(['status'=>'approved']);

ProductOrder::create(['user_id'=>1,'product_id'=>$book->id,'instructor_id'=>1,'unit_price'=>1000,'subtotal'=>1000,'total'=>1000]);
check($guard->handle($request,$next)->getContent()==='allowed','Purchaser allowed');
$user->id=2;Auth::setUser($user);check($guard->handle($request,$next)->getStatusCode()===302,'Other buyer blocked');
$controller=new Modules\Store\Http\Controllers\ProductFileController;
ob_start();$controller->download($book,(string)$file->id)->sendContent();$body=ob_get_clean();check($body===$pdf,'Download content intact');
try{$controller->download($book,'99999');throw new RuntimeException('Missing file accepted');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===404,'Missing file blocked');}
try{$book->addMedia(UploadedFile::fake()->createWithContent('bad.txt','not a book'))->toMediaCollection(Product::FILES_COLLECTION);throw new RuntimeException('Invalid upload accepted');}catch(Spatie\MediaLibrary\MediaCollections\Exceptions\FileUnacceptableForCollection $e){}
// Simulate a legacy public book, then verify migration preserves ID and bytes.
$path=$file->getPathRelativeToRoot();Storage::disk('public')->put($path,$pdf);Storage::disk('books')->delete($path);$file->disk='public';$file->save();
check(Artisan::call('books:secure-files')===0,'Legacy migration command');$file->refresh();check($file->disk==='books' && Storage::disk('books')->get($path)===$pdf && !Storage::disk('public')->exists($path),'Legacy public copy secured');
$popular=Product::create(['title'=>'Popular book','slug'=>'popular-book','summary'=>'Test','status'=>'approved','pricing_type'=>'paid','price'=>1000,'views'=>20,'instructor_id'=>1,'product_category_id'=>1]);
$popular->addMedia(UploadedFile::fake()->createWithContent('popular.pdf',$pdf))->toMediaCollection(Product::FILES_COLLECTION);
check($service->getProducts(['books_only'=>true,'status'=>'approved','sort'=>'most_viewed'])->first()->id===$popular->id,'Most viewed sort uses actual views');
$popular->update(['featured'=>true]);check($service->getProducts(['books_only'=>true,'status'=>'approved','featured'=>true])->count()===1,'Featured filter');
DB::table('product_categories')->where('id',1)->update(['title'=>'Children’s books','slug'=>'children']);
$popular->update(['discount'=>true,'discount_price'=>800]);
$shelves=$service->getBookShelves();check($shelves['best_sellers']->first()->id===$book->id,'Shelf ranks completed purchases');check($shelves['special_offers']->count()===1,'Only real discounts appear as offers');check($shelves['children']->count()===2,'Children shelf matches category');check($shelves['featured']->count()===1,'Featured shelf');check($service->getBookShelves(999)['new_arrivals']->isEmpty(),'Shelves respect selected category');
check(str_contains(route('products.shop',[],false),'/books'),'Books catalog URL');
check(str_contains(route('products.edit',['product'=>$book->id],false),'/edit'),'Upload redirect URL');
$disabled=new App\Http\Middleware\OnlineExamsDisabled;
check($disabled->handle(Request::create('/dashboard/exams/create'),$next)->getTargetUrl()===url('/examinations'),'Retired exam GET redirected');
try{$disabled->handle(Request::create('/dashboard/exams','POST'),$next);throw new RuntimeException('Exam mutation accepted');}catch(Symfony\Component\HttpKernel\Exception\HttpException $e){check($e->getStatusCode()===410,'Exam mutation disabled');}
$app->instance('system',(object)['fields'=>['selling_currency'=>'USD']]);
try{app(Modules\Billing\Services\PaymentService::class)->getCheckoutItem('product',(string)$book->id,null);throw new RuntimeException('Wrong currency checkout accepted');}catch(Illuminate\Validation\ValidationException $e){check(isset($e->errors()['currency']),'Wrong currency is blocked before payment');}
Storage::disk('books')->deleteDirectory('');Storage::disk('public')->deleteDirectory('');
echo "PASS: private PDF upload, hidden raw URLs, purchaser-only access, download bytes, invalid files, legacy migration, Books routes and retired exam actions.\n";
