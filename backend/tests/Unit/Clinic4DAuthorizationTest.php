<?php

namespace Tests\Unit;

use App\Models\Clinic;
use App\Models\ClinicAssistant;
use App\Models\Doctor;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Clinic4DAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_same_doctor_has_director_powers_only_in_director_clinic(): void
    {
        $doctorUser = User::factory()->create();
        $doctorUser->assignRole('doctor');
        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'Orthopedics',
            'license_number' => 'ORT-ALG-55443',
            'is_verified' => true,
        ]);

        // Clinic A: Doctor is Director
        $clinicA = Clinic::create([
            'name' => 'Clinic A (Owned)',
            'address' => 'Addr A',
            'wilaya' => 'Algiers',
            'phone' => '+21321000111',
            'director_doctor_id' => $doctor->id,
        ]);
        $clinicA->doctors()->attach($doctor->id, ['position' => 'director']);

        // Clinic B: Doctor is Employed
        $clinicB = Clinic::create([
            'name' => 'Clinic B (Partner)',
            'address' => 'Addr B',
            'wilaya' => 'Blida',
            'phone' => '+21325000222',
        ]);
        $clinicB->doctors()->attach($doctor->id, ['position' => 'doctor']);

        // In Clinic A: Has Director privileges
        $this->assertTrue(
            $doctorUser->hasClinicAccess('clinic.manage_settings', $clinicA->id),
            'Doctor must have manage_settings in Clinic A (Director)'
        );
        $this->assertTrue(
            $doctorUser->hasClinicAccess('clinic.create_staff', $clinicA->id),
            'Doctor must have create_staff in Clinic A (Director)'
        );
        $this->assertTrue(
            $doctorUser->hasClinicAccess('clinical.write_rx', $clinicA->id),
            'Doctor must have clinical authority in Clinic A'
        );

        // In Clinic B: Administrative privileges are strictly DENIED, clinical retained
        $this->assertFalse(
            $doctorUser->hasClinicAccess('clinic.manage_settings', $clinicB->id),
            'Doctor must NOT have manage_settings in Clinic B (Employed)'
        );
        $this->assertFalse(
            $doctorUser->hasClinicAccess('clinic.create_staff', $clinicB->id),
            'Doctor must NOT have create_staff in Clinic B (Employed)'
        );
        $this->assertTrue(
            $doctorUser->hasClinicAccess('clinical.write_rx', $clinicB->id),
            'Doctor must retain clinical authority in Clinic B'
        );

        // In an unaffiliated Clinic C: All access is DENIED
        $clinicC = Clinic::create([
            'name' => 'Clinic C (Foreign)',
            'address' => 'Addr C',
            'wilaya' => 'Annaba',
            'phone' => '+21338000333',
        ]);

        $this->assertFalse(
            $doctorUser->hasClinicAccess('clinical.write_rx', $clinicC->id),
            'Doctor has no access in unaffiliated Clinic C'
        );
    }

    public function test_assistant_is_strictly_scoped_to_assigned_clinic_and_ceiling(): void
    {
        $assistantUser = User::factory()->create();
        $assistantUser->assignRole('doctor_assistant');

        $clinicA = Clinic::create([
            'name' => 'Clinic A',
            'address' => 'Addr A',
            'wilaya' => 'Algiers',
            'phone' => '+21321000111',
        ]);

        $clinicB = Clinic::create([
            'name' => 'Clinic B',
            'address' => 'Addr B',
            'wilaya' => 'Oran',
            'phone' => '+21341000222',
        ]);

        ClinicAssistant::create([
            'user_id' => $assistantUser->id,
            'clinic_id' => $clinicA->id,
            'permissions_json' => [
                'booking.manage_queue',
                'booking.confirm_attendance',
            ],
            'is_active' => true,
        ]);

        // In Clinic A: Allowed delegated permissions succeed
        $this->assertTrue(
            $assistantUser->hasClinicAccess('booking.manage_queue', $clinicA->id),
            'Assistant has manage_queue in Clinic A'
        );
        $this->assertTrue(
            $assistantUser->hasClinicAccess('booking.confirm_attendance', $clinicA->id),
            'Assistant has confirm_attendance in Clinic A'
        );

        // In Clinic A: Forbidden permissions fail by Hard Ceiling
        $this->assertFalse(
            $assistantUser->hasClinicAccess('clinical.write_rx', $clinicA->id),
            'Assistant is strictly blocked from writing prescriptions'
        );

        // In Clinic B (where assistant does not work): All access is DENIED
        $this->assertFalse(
            $assistantUser->hasClinicAccess('booking.manage_queue', $clinicB->id),
            'Assistant has no access to Clinic B'
        );
    }
}
