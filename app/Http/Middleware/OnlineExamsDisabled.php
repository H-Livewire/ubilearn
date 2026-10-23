<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class OnlineExamsDisabled {
 public function handle(Request $request, Closure $next) {
  if($request->isMethod('GET') || $request->isMethod('HEAD'))return redirect('/examinations');
  abort(410,'Online examinations are no longer available.');
 }
}
