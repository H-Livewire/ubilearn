<?php

namespace App\Http\Controllers;

use App\Services\NectaResultsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NectaController extends Controller
{
    public function index()
    {
        return Inertia::render('necta/index', ['levels' => NectaResultsService::LEVELS]);
    }

    public function school(Request $request, NectaResultsService $service)
    {
        $data = $request->validate([
            'level' => 'required|in:'.implode(',', array_keys(NectaResultsService::LEVELS)),
            'year' => 'required|integer|between:2000,'.date('Y'),
            'school' => 'required|string|max:16',
        ]);
        try { return response()->json(['url' => $service->schoolUrl($data['level'], $data['year'], $data['school'])]); }
        catch (\Illuminate\Validation\ValidationException $e) { throw $e; }
        catch (\Throwable $e) { report($e); return response()->json(['message' => 'NECTA haipatikani kwa sasa. Tafadhali jaribu tena.'], 503); }
    }
}
