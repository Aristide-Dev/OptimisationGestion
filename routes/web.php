<?php

use App\Http\Controllers\GameController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// Routes du jeu BriquesAfrique
Route::get('/jeu', [GameController::class, 'index'])->name('game.index');
Route::post('/jeu/update', [GameController::class, 'update'])->name('game.update');
Route::post('/jeu/reset', [GameController::class, 'reset'])->name('game.reset');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
