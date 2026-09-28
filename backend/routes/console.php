<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('diagnostics:backfill-tokens', function (\App\Services\DiagnosticService $service) {
    $this->info('Starting Diagnostic Orders secure_token backfill...');
    $result = $service->backfillMissingTokens();
    $this->info("Backfill complete: Total Checked: {$result['total_checked']}, Backfilled: {$result['backfilled']}, Unchanged: {$result['unchanged']}");
})->purpose('Backfill missing secure_token on legacy diagnostic orders');

Artisan::command('aafiya:repair-test-booking-center', function (\App\Services\BookingCenterService $service) {
    $user = \App\Models\User::where('email', 'val.booking-1@aafiya.dz')->first();
    if (! $user) {
        $this->warn('Test user val.booking-1@aafiya.dz does not exist.');
        return 0;
    }

    if ($user->bookingCenter()->exists()) {
        $this->info('Test user val.booking-1@aafiya.dz already has an associated Booking Center.');
        return 0;
    }

    $center = $service->provisionCenter([
        'name' => 'مركز الحجز للشفاء',
        'commercial_register' => 'RC-16/00-9988776',
        'phone' => $user->phone ?? '+213798653214',
        'email' => $user->email,
        'wilaya' => 'الجزائر العاصمة',
        'address' => 'الجزائر',
    ], $user);

    $this->info("Booking Center provisioned successfully for {$user->email} [ID: {$center->id}, Status: {$center->verification_status}, is_active: " . ($center->is_active ? 'true' : 'false') . ']');
    return 0;
})->purpose('Safely provision missing BookingCenter record for test account val.booking-1@aafiya.dz');
