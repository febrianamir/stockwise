<?php

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/user', function (Request $request): UserResource {
        return new UserResource($request->user());
    })->middleware('auth:sanctum')->name('user');
});
