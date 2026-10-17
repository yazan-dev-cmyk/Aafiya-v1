<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Patient Direct Booking Feature Gate (DEC-GAP-D01)
    |--------------------------------------------------------------------------
    |
    | Governs whether registered patients can directly self-book appointments
    | via the backend API. By default, this is disabled until online payment
    | integration is deployed.
    |
    */
    'patient_booking_enabled' => (bool) env('FEATURE_PATIENT_BOOKING_ENABLED', false),
];
