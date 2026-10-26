<?php

use Illuminate\Support\Facades\Route;
use Modules\Frontend\Http\Controllers\Api\FrontendCollectionController;

// Live community numbers + newest member photos (home page social proof)
Route::get('community-proof', \App\Http\Controllers\CommunityProofController::class)->middleware('throttle:60,1');

// Collection Routes
Route::prefix('collections')->group(function () {
    // Public routes - Get collection data
    Route::get('/', [FrontendCollectionController::class, 'index']);
    Route::get('/{type}/{category}', [FrontendCollectionController::class, 'show']);

    // Admin only routes - Update collection data
    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::match(['put', 'patch'], '/{type}/{category}', [FrontendCollectionController::class, 'update']);
        Route::post('/{type}/{category}/toggle', [FrontendCollectionController::class, 'toggle']);
    });
});
