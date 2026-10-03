<?php

namespace Tests\Unit;

use App\Models\Commune;
use App\Models\Wilaya;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class WilayaCommuneModelTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Test 1 — Wilaya model exists.
     */
    public function test_wilaya_model_resolves(): void
    {
        $this->assertTrue(class_exists(Wilaya::class));
        $wilaya = new Wilaya();
        $this->assertEquals('wilayas', $wilaya->getTable());
    }

    /**
     * Test 2 — Commune model exists.
     */
    public function test_commune_model_resolves(): void
    {
        $this->assertTrue(class_exists(Commune::class));
        $commune = new Commune();
        $this->assertEquals('communes', $commune->getTable());
    }

    /**
     * Test 3 — Wilaya -> Commune relationship.
     */
    public function test_wilaya_has_many_communes_relationship(): void
    {
        $wilaya = Wilaya::create([
            'code' => '99',
            'name_ar' => 'ولاية اختبار',
            'name_fr' => 'Wilaya Test',
            'name_en' => 'Wilaya Test',
            'is_active' => true,
            'display_order' => 1,
        ]);

        $commune = $wilaya->communes()->create([
            'code' => '9901',
            'name_ar' => 'بلدية اختبار',
            'name_fr' => 'Commune Test',
            'name_en' => 'Commune Test',
            'postal_code' => '99000',
            'is_active' => true,
            'display_order' => 1,
        ]);

        $this->assertTrue($wilaya->communes->contains($commune));
        $this->assertEquals(1, $wilaya->communes()->count());
    }

    /**
     * Test 4 — Commune -> Wilaya relationship.
     */
    public function test_commune_belongs_to_wilaya_relationship(): void
    {
        $wilaya = Wilaya::create([
            'code' => '98',
            'name_ar' => 'ولاية اختبار 2',
            'name_fr' => 'Wilaya Test 2',
            'name_en' => 'Wilaya Test 2',
            'is_active' => true,
            'display_order' => 2,
        ]);

        $commune = Commune::create([
            'wilaya_id' => $wilaya->id,
            'code' => '9801',
            'name_ar' => 'بلدية اختبار 2',
            'name_fr' => 'Commune Test 2',
            'name_en' => 'Commune Test 2',
            'postal_code' => '98000',
            'is_active' => true,
            'display_order' => 1,
        ]);

        $this->assertNotNull($commune->wilaya);
        $this->assertEquals($wilaya->id, $commune->wilaya->id);
        $this->assertEquals('98', $commune->wilaya->code);
    }

    /**
     * Test 5 — Attribute casting.
     */
    public function test_attribute_casting(): void
    {
        $wilaya = Wilaya::create([
            'code' => '97',
            'name_ar' => 'ولاية اختبار 3',
            'name_fr' => 'Wilaya Test 3',
            'name_en' => 'Wilaya Test 3',
            'is_active' => '1',
            'display_order' => '42',
        ]);

        $this->assertIsBool($wilaya->is_active);
        $this->assertTrue($wilaya->is_active);
        $this->assertIsInt($wilaya->display_order);
        $this->assertSame(42, $wilaya->display_order);
    }

    /**
     * Test 6 — Code preservation (leading zero string integrity).
     */
    public function test_code_preservation(): void
    {
        $wilaya = Wilaya::create([
            'code' => '01',
            'name_ar' => 'أدرار',
            'name_fr' => 'Adrar',
            'name_en' => 'Adrar',
            'is_active' => true,
            'display_order' => 1,
        ]);

        $this->assertIsString($wilaya->code);
        $this->assertSame('01', $wilaya->code);

        $commune = $wilaya->communes()->create([
            'code' => '0101',
            'name_ar' => 'أدرار',
            'name_fr' => 'Adrar',
            'name_en' => 'Adrar',
            'postal_code' => '01000',
            'is_active' => true,
            'display_order' => 1,
        ]);

        $this->assertIsString($commune->code);
        $this->assertSame('0101', $commune->code);
    }

    /**
     * Test 7 — Nullable postal code.
     */
    public function test_nullable_postal_code(): void
    {
        $wilaya = Wilaya::create([
            'code' => '96',
            'name_ar' => 'ولاية اختبار 4',
            'name_fr' => 'Wilaya Test 4',
            'name_en' => 'Wilaya Test 4',
            'is_active' => true,
            'display_order' => 1,
        ]);

        $commune = $wilaya->communes()->create([
            'code' => '9601',
            'name_ar' => 'بلدية ريفية',
            'name_fr' => 'Commune Rurale',
            'name_en' => 'Rural Commune',
            'postal_code' => null,
            'is_active' => true,
            'display_order' => 1,
        ]);

        $this->assertNull($commune->postal_code);
    }

    /**
     * Test 8 — Mass assignment safety.
     */
    public function test_mass_assignment_safety(): void
    {
        $wilaya = new Wilaya();
        $this->assertNotContains('id', $wilaya->getFillable());
        $this->assertNotContains('created_at', $wilaya->getFillable());
        $this->assertNotContains('updated_at', $wilaya->getFillable());
        $this->assertContains('code', $wilaya->getFillable());
        $this->assertContains('is_active', $wilaya->getFillable());

        $commune = new Commune();
        $this->assertNotContains('id', $commune->getFillable());
        $this->assertNotContains('created_at', $commune->getFillable());
        $this->assertNotContains('updated_at', $commune->getFillable());
        $this->assertContains('wilaya_id', $commune->getFillable());
        $this->assertContains('code', $commune->getFillable());
    }

    /**
     * Test 9 — No master-data seeding.
     */
    public function test_no_master_data_seeded(): void
    {
        $this->assertSame(0, Wilaya::count());
        $this->assertSame(0, Commune::count());
    }
}
