<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicDoctorInvitation;
use App\Models\Doctor;
use App\Models\DoctorClinic;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DoctorClinicInvitationTest extends TestCase
{
    use RefreshDatabase;

    protected User $directorUserA;
    protected Doctor $directorDoctorA;
    protected string $directorTokenA;
    protected Clinic $clinicA;

    protected User $directorUserB;
    protected Doctor $directorDoctorB;
    protected string $directorTokenB;
    protected Clinic $clinicB;

    protected User $targetDoctorUser;
    protected Doctor $targetDoctor;
    protected string $targetDoctorToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        // 1. Clinic A with Director A
        $this->directorUserA = User::factory()->create([
            'email' => 'dir_a@clinic-a.dz',
            'is_active' => true,
        ]);
        $this->directorUserA->assignRole('doctor');
        $this->directorDoctorA = Doctor::create([
            'user_id' => $this->directorUserA->id,
            'license_number' => 'LIC-DIR-A-001',
            'specialty' => 'Internal Medicine',
            'is_verified' => true,
        ]);
        $this->clinicA = Clinic::create([
            'name' => 'عيادة الشفاء (Clinic A)',
            'address' => 'الجزائر العاصمة',
            'wilaya' => 'الجزائر',
            'phone' => '+21321000001',
            'director_doctor_id' => $this->directorDoctorA->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->directorDoctorA->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);
        $this->directorTokenA = $this->directorUserA->createToken('dir_a')->plainTextToken;

        // 2. Clinic B with Director B
        $this->directorUserB = User::factory()->create([
            'email' => 'dir_b@clinic-b.dz',
            'is_active' => true,
        ]);
        $this->directorUserB->assignRole('doctor');
        $this->directorDoctorB = Doctor::create([
            'user_id' => $this->directorUserB->id,
            'license_number' => 'LIC-DIR-B-002',
            'specialty' => 'Cardiology',
            'is_verified' => true,
        ]);
        $this->clinicB = Clinic::create([
            'name' => 'عيادة النور (Clinic B)',
            'address' => 'وهران',
            'wilaya' => 'وهران',
            'phone' => '+21341000002',
            'director_doctor_id' => $this->directorDoctorB->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->directorDoctorB->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);
        $this->directorTokenB = $this->directorUserB->createToken('dir_b')->plainTextToken;

        // 3. Existing Doctor (Practicing in Clinic A, to be invited to Clinic B)
        $this->targetDoctorUser = User::factory()->create([
            'name' => 'د. سمير بلحاج',
            'email' => 'samir.belhadj@aafiya.dz',
            'is_active' => true,
        ]);
        $this->targetDoctorUser->assignRole('doctor');
        $this->targetDoctor = Doctor::create([
            'user_id' => $this->targetDoctorUser->id,
            'license_number' => 'LIC-DOC-TARGET-99',
            'specialty' => 'Pediatrics',
            'is_verified' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $this->targetDoctor->id,
            'clinic_id' => $this->clinicA->id,
            'position' => 'doctor',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now()->subMonths(6),
        ]);
        $this->targetDoctorToken = $this->targetDoctorUser->createToken('target_doc')->plainTextToken;
    }

    /**
     * TEST 01: Director can lookup existing doctor by email with strict privacy.
     */
    public function test_01_director_can_lookup_existing_doctor_by_email_with_strict_privacy(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->getJson("/api/v1/clinics/{$this->clinicB->id}/doctors/lookup?email=samir.belhadj@aafiya.dz");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.id', $this->targetDoctor->id)
            ->assertJsonPath('data.full_name', 'د. سمير بلحاج')
            ->assertJsonPath('data.specialty', 'Pediatrics')
            ->assertJsonPath('data.license_number', 'LIC-DOC-TARGET-99')
            ->assertJsonPath('data.is_verified', true)
            ->assertJsonPath('data.is_already_member', false);

        // Assert strictly hidden information: Clinic A affiliation must NEVER be returned!
        $this->assertArrayNotHasKey('clinics', $response->json('data'));
        $this->assertArrayNotHasKey('appointments', $response->json('data'));
        $this->assertArrayNotHasKey('patients', $response->json('data'));
    }

    /**
     * TEST 02: Lookup returns 404 if email does not exist or user is not a doctor.
     */
    public function test_02_lookup_returns_404_if_email_not_found(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->getJson("/api/v1/clinics/{$this->clinicB->id}/doctors/lookup?email=nonexistent@aafiya.dz");

        $response->assertStatus(404);
    }

    /**
     * TEST 03: Employed doctor cannot lookup doctors.
     */
    public function test_03_employed_doctor_cannot_lookup_doctors(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->getJson("/api/v1/clinics/{$this->clinicA->id}/doctors/lookup?email=dir_b@clinic-b.dz");

        $response->assertStatus(403);
    }

    /**
     * TEST 04: Patient cannot lookup doctors.
     */
    public function test_04_patient_cannot_lookup_doctors(): void
    {
        $patientUser = User::factory()->create();
        $patientUser->assignRole('patient_registered');
        $patientToken = $patientUser->createToken('patient')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$patientToken}")
            ->getJson("/api/v1/clinics/{$this->clinicB->id}/doctors/lookup?email=samir.belhadj@aafiya.dz");

        $response->assertStatus(403);
    }

    /**
     * TEST 05: Director A cannot lookup or invite in Clinic B (Cross-clinic protection).
     */
    public function test_05_cross_clinic_director_authorization_enforced(): void
    {
        // Director A attempts to lookup in Clinic B
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenA}")
            ->getJson("/api/v1/clinics/{$this->clinicB->id}/doctors/lookup?email=samir.belhadj@aafiya.dz");

        $response->assertStatus(403);

        // Director A attempts to invite in Clinic B
        $inviteRes = $this->withHeader('Authorization', "Bearer {$this->directorTokenA}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ]);

        $inviteRes->assertStatus(403);
    }

    /**
     * TEST 06: Director can create invitation for existing verified doctor.
     */
    public function test_06_director_can_create_invitation(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
                'notes' => 'نرحب بانضمامكم لطاقم عيادة النور',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.clinic_id', $this->clinicB->id)
            ->assertJsonPath('data.doctor_id', $this->targetDoctor->id)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.position', 'doctor');

        $this->assertDatabaseHas('clinic_doctor_invitations', [
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'status' => 'pending',
        ]);
    }

    /**
     * TEST 07 & 08 & 09: Identity Invariants: Invitation does not duplicate User, Doctor, or doctor_clinic.
     */
    public function test_07_08_09_invitation_does_not_duplicate_user_doctor_or_create_membership(): void
    {
        $userCountBefore = User::count();
        $doctorCountBefore = Doctor::count();
        $membershipCountBefore = DoctorClinic::count();

        $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ])->assertStatus(201);

        $this->assertEquals($userCountBefore, User::count(), 'User count must remain unchanged upon invitation');
        $this->assertEquals($doctorCountBefore, Doctor::count(), 'Doctor count must remain unchanged upon invitation');
        $this->assertEquals($membershipCountBefore, DoctorClinic::count(), 'doctor_clinic must not be created upon invitation');
    }

    /**
     * TEST 10: Cannot send duplicate pending invitation.
     */
    public function test_10_duplicate_pending_invitation_is_blocked(): void
    {
        // First invitation
        $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ])->assertStatus(201);

        // Second invitation while first is pending
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ]);

        $response->assertStatus(409);
    }

    /**
     * TEST 11: Cannot invite doctor who is already an active member in the clinic.
     */
    public function test_11_cannot_invite_doctor_who_is_already_active_member(): void
    {
        // Target doctor is already an active member in Clinic A
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenA}")
            ->postJson("/api/v1/clinics/{$this->clinicA->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ]);

        $response->assertStatus(409);
    }

    /**
     * TEST 12: Cannot invite doctor who is currently suspended in the clinic.
     */
    public function test_12_cannot_invite_doctor_who_is_suspended_in_clinic(): void
    {
        // Suspend target doctor in Clinic A
        DoctorClinic::where('doctor_id', $this->targetDoctor->id)
            ->where('clinic_id', $this->clinicA->id)
            ->update(['is_active' => false]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenA}")
            ->postJson("/api/v1/clinics/{$this->clinicA->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ]);

        $response->assertStatus(409);
    }

    /**
     * TEST 13: Doctor can list own invitations and only sees their own.
     */
    public function test_13_doctor_can_list_own_invitations(): void
    {
        // Create invitation for Target Doctor
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->getJson('/api/v1/doctor/invitations');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $invitation->id)
            ->assertJsonPath('data.0.clinic.name', 'عيادة النور (Clinic B)');
    }

    /**
     * TEST 14: Doctor can accept invitation, activating membership.
     */
    public function test_14_doctor_can_accept_invitation(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'accepted');

        // Verify doctor_clinic record created
        $this->assertDatabaseHas('doctor_clinic', [
            'doctor_id' => $this->targetDoctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_active' => true,
        ]);

        // Verify invitation status updated
        $this->assertEquals('accepted', $invitation->fresh()->status);
        $this->assertNotNull($invitation->fresh()->responded_at);
    }

    /**
     * TEST 15: Accepting invitation to Clinic B does NOT modify Clinic A membership.
     */
    public function test_15_accepting_invitation_does_not_modify_other_clinic_memberships(): void
    {
        $clinicAMembershipBefore = DoctorClinic::where('doctor_id', $this->targetDoctor->id)
            ->where('clinic_id', $this->clinicA->id)
            ->first();

        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept")
            ->assertStatus(200);

        $clinicAMembershipAfter = DoctorClinic::where('doctor_id', $this->targetDoctor->id)
            ->where('clinic_id', $this->clinicA->id)
            ->first();

        $this->assertEquals($clinicAMembershipBefore->is_active, $clinicAMembershipAfter->is_active);
        $this->assertEquals($clinicAMembershipBefore->position, $clinicAMembershipAfter->position);
        $this->assertEquals($clinicAMembershipBefore->is_primary, $clinicAMembershipAfter->is_primary);
    }

    /**
     * TEST 16: Rejecting invitation does not create doctor_clinic.
     */
    public function test_16_rejecting_invitation_does_not_create_membership(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseMissing('doctor_clinic', [
            'doctor_id' => $this->targetDoctor->id,
            'clinic_id' => $this->clinicB->id,
        ]);

        $this->assertEquals('rejected', $invitation->fresh()->status);
    }

    /**
     * TEST 17: Doctor cannot accept an invitation intended for another doctor.
     */
    public function test_17_doctor_cannot_accept_another_doctors_invitation(): void
    {
        $otherDoctorUser = User::factory()->create(['email' => 'other@aafiya.dz']);
        $otherDoctorUser->assignRole('doctor');
        $otherDoctor = Doctor::create([
            'user_id' => $otherDoctorUser->id,
            'license_number' => 'LIC-OTHER-123',
            'specialty' => 'Dermatology',
            'is_verified' => true,
        ]);
        $otherToken = $otherDoctorUser->createToken('other')->plainTextToken;

        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        // Other doctor attempts to accept target doctor's invitation
        $response = $this->withHeader('Authorization', "Bearer {$otherToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept");

        $response->assertStatus(403);
    }

    /**
     * TEST 18: Expired invitation cannot be accepted.
     */
    public function test_18_expired_invitation_cannot_be_accepted(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->subDay(), // Expired!
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept");

        $response->assertStatus(422);
    }

    /**
     * TEST 19: Cannot accept an invitation twice.
     */
    public function test_19_cannot_accept_invitation_twice(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        // First accept
        $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept")
            ->assertStatus(200);

        // Second accept
        $response = $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept");

        $response->assertStatus(422);
    }

    /**
     * TEST 20: Idempotency & race protection: accepting does not duplicate doctor_clinic.
     */
    public function test_20_acceptance_does_not_duplicate_doctor_clinic_membership(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $this->withHeader('Authorization', "Bearer {$this->targetDoctorToken}")
            ->postJson("/api/v1/doctor/invitations/{$invitation->id}/accept")
            ->assertStatus(200);

        $count = DoctorClinic::where('doctor_id', $this->targetDoctor->id)
            ->where('clinic_id', $this->clinicB->id)
            ->count();

        $this->assertEquals(1, $count, 'Exactly one doctor_clinic membership row must exist');
    }

    /**
     * TEST 21: Sending Director can cancel pending invitation.
     */
    public function test_21_director_can_cancel_pending_invitation(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenB}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations/{$invitation->id}/cancel");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertEquals('cancelled', $invitation->fresh()->status);
    }

    /**
     * TEST 22: Director of another clinic cannot cancel invitation.
     */
    public function test_22_director_of_another_clinic_cannot_cancel_invitation(): void
    {
        $invitation = ClinicDoctorInvitation::create([
            'clinic_id' => $this->clinicB->id,
            'doctor_id' => $this->targetDoctor->id,
            'invited_by_id' => $this->directorUserB->id,
            'position' => 'doctor',
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        // Director A attempts to cancel invitation belonging to Clinic B
        $response = $this->withHeader('Authorization', "Bearer {$this->directorTokenA}")
            ->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations/{$invitation->id}/cancel");

        $response->assertStatus(403);
    }

    /**
     * TEST 23 (Section 30 Security Requirement):
     * Doctor D1 is Director in Clinic A and Employed in Clinic B.
     * D1 can invite to A, but cannot invite to B.
     */
    public function test_23_dual_position_doctor_director_privilege_isolated(): void
    {
        // Attach Director A as an Employed Doctor in Clinic B
        DoctorClinic::create([
            'doctor_id' => $this->directorDoctorA->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor', // Employed in B!
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now(),
        ]);

        $newDoctorUser = User::factory()->create(['email' => 'newdoc@aafiya.dz']);
        $newDoctorUser->assignRole('doctor');
        $newDoctor = Doctor::create([
            'user_id' => $newDoctorUser->id,
            'license_number' => 'LIC-NEW-999',
            'specialty' => 'Surgery',
            'is_verified' => true,
        ]);

        // 1. Director A invites to Clinic A -> SUCCEEDS (201)
        $resA = $this->withHeader('Authorization', "Bearer {$this->directorTokenA}")
            ->postJson("/api/v1/clinics/{$this->clinicA->id}/doctor-invitations", [
                'doctor_id' => $newDoctor->id,
            ]);
        $resA->assertStatus(201);

        // 2. Director A acting in Clinic B context attempts to invite to Clinic B -> FORBIDDEN (403)
        $resB = $this->withHeaders([
            'Authorization' => "Bearer {$this->directorTokenA}",
            'X-Clinic-ID' => $this->clinicB->id,
        ])->postJson("/api/v1/clinics/{$this->clinicB->id}/doctor-invitations", [
            'doctor_id' => $newDoctor->id,
        ]);
        $resB->assertStatus(403);
    }

    /**
     * TEST 24 (Section 31 Multi-Clinic Identity Requirement):
     * Doctor D1 belongs to A and B. Clinic C invites D1.
     * After acceptance: D1 belongs to A, B, and C with zero change to A or B and single User/Doctor profile.
     */
    public function test_24_multi_clinic_identity_expansion_across_three_clinics(): void
    {
        // 1. Target Doctor is in Clinic A
        // Also attach Target Doctor to Clinic B as Employed Doctor
        DoctorClinic::create([
            'doctor_id' => $this->targetDoctor->id,
            'clinic_id' => $this->clinicB->id,
            'position' => 'doctor',
            'is_primary' => false,
            'is_active' => true,
            'joined_at' => now()->subMonths(2),
        ]);

        // 2. Clinic C with Director C
        $dirCUser = User::factory()->create(['email' => 'dir_c@clinic-c.dz']);
        $dirCUser->assignRole('doctor');
        $dirCDoctor = Doctor::create([
            'user_id' => $dirCUser->id,
            'license_number' => 'LIC-DIR-C-003',
            'specialty' => 'Orthopedics',
            'is_verified' => true,
        ]);
        $clinicC = Clinic::create([
            'name' => 'عيادة الأمل (Clinic C)',
            'address' => 'قسنطينة',
            'wilaya' => 'قسنطينة',
            'phone' => '+21331000003',
            'director_doctor_id' => $dirCDoctor->id,
            'is_active' => true,
        ]);
        DoctorClinic::create([
            'doctor_id' => $dirCDoctor->id,
            'clinic_id' => $clinicC->id,
            'position' => 'director',
            'is_primary' => true,
            'is_active' => true,
            'joined_at' => now(),
        ]);
        $dirCToken = $dirCUser->createToken('dir_c')->plainTextToken;

        $userCountBefore = User::count();
        $doctorCountBefore = Doctor::count();

        // 3. Clinic C invites Target Doctor
        $inviteRes = $this->actingAs($dirCUser, 'sanctum')
            ->postJson("/api/v1/clinics/{$clinicC->id}/doctor-invitations", [
                'doctor_id' => $this->targetDoctor->id,
            ]);
        $inviteRes->assertStatus(201);
        $invitationId = $inviteRes->json('data.id');

        // 4. Target Doctor accepts
        $acceptRes = $this->actingAs($this->targetDoctorUser, 'sanctum')
            ->postJson("/api/v1/doctor/invitations/{$invitationId}/accept");
        $acceptRes->assertStatus(200);

        // 5. Assert: One User, One Doctor, Three Memberships
        $this->assertEquals($userCountBefore, User::count(), 'No duplicate User created');
        $this->assertEquals($doctorCountBefore, Doctor::count(), 'No duplicate Doctor created');

        $memberships = DoctorClinic::where('doctor_id', $this->targetDoctor->id)->get();
        $this->assertCount(3, $memberships);

        $clinicIds = $memberships->pluck('clinic_id')->all();
        $this->assertContains($this->clinicA->id, $clinicIds);
        $this->assertContains($this->clinicB->id, $clinicIds);
        $this->assertContains($clinicC->id, $clinicIds);

        // Verify GET /doctor/clinics returns all 3 clinics
        $myClinicsRes = $this->actingAs($this->targetDoctorUser, 'sanctum')
            ->getJson('/api/v1/doctor/clinics');

        $myClinicsRes->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }
}
