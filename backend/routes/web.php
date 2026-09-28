<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/up', [\App\Http\Controllers\Api\V1\HealthController::class, 'up']);

