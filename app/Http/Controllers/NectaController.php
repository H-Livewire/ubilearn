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

    public function years(Request $request, NectaResultsService $service)
    {
        $data = $request->validate(['level' => 'required|in:'.implode(',', array_keys(NectaResultsService::LEVELS))]);
        try { return response()->json($service->years($data['level'])); }
        catch (\Throwable $e) { report($e); return response()->json(['message' => 'NECTA haipatikani kwa sasa. Jaribu tena au fungua chanzo rasmi.'], 503); }
    }

    public function lookup(Request $request, NectaResultsService $service)
    {
        $data = $request->validate([
            'level' => 'required|in:'.implode(',', array_keys(NectaResultsService::LEVELS)),
            'year' => 'required|integer|between:2000,'.date('Y'),
            'index' => 'required|string|max:40',
        ]);
        try { return response()->json($service->lookup($data['level'], $data['year'], $data['index'])); }
        catch (\Illuminate\Validation\ValidationException $e) { throw $e; }
        catch (\Throwable $e) { report($e); return response()->json(['message' => 'NECTA haijajibu kwa wakati. Jaribu tena au fungua matokeo rasmi.'], 503); }
    }

    public function guidance(Request $request, \App\Services\EducationPathwaysService $service)
    {
        $data = $request->validate([
            'level' => 'required|in:'.implode(',', array_keys(NectaResultsService::LEVELS)),
            'year' => 'required|integer|between:1980,2100',
            'grades' => 'present|array|max:30',
            'grades.*' => 'required|string|in:A,B+,B,C,D,E,F,S',
        ]);
        return response()->json($service->advise($data['level'], $data['year'], $data['grades']));
    }

    public function browse(Request $request, NectaResultsService $service)
    {
        $data = $request->validate(['key' => 'required|string|size:64|regex:/^[a-f0-9]+$/']);
        try { return response()->json($service->browse($data['key'])); }
        catch (\Illuminate\Validation\ValidationException $e) { throw $e; }
        catch (\Throwable $e) { report($e); return response()->json(['message' => 'Matokeo hayapatikani kwa sasa. Fungua chanzo rasmi au jaribu tena.'], 503); }
    }
}
