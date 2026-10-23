<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Modules\Store\Models\Product;
class BookManagement {
 public function handle(Request $request,Closure $next){
  $user=$request->user();if($user?->role==='admin')return $next($request);
  abort_unless($user?->role==='instructor' && $user->instructor?->status==='approved',403);
  $product=$request->route('product')??$request->route('id')??$request->input('product_id');
  if($product){$product=$product instanceof Product?$product:Product::findOrFail($product);abort_unless((int)$product->instructor_id===(int)$user->instructor_id,403);}
  foreach(['product_faq'=>\Modules\Store\Models\ProductFaq::class,'product_specification'=>\Modules\Store\Models\ProductSpecification::class] as $key=>$model)if($id=$request->route($key)){$record=$id instanceof \Illuminate\Database\Eloquent\Model?$id:$model::findOrFail($id);abort_unless((int)$record->product->instructor_id===(int)$user->instructor_id,403);}
  if($request->filled('instructor_id'))abort_unless((int)$request->instructor_id===(int)$user->instructor_id,403);
  return $next($request);
 }
}
