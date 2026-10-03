<?php

namespace Database\Seeders;

use App\Models\Commune;
use App\Models\Wilaya;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WilayaCommuneMasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $wilayasPath = $this->resolvePath('wilayas.json');
        $communesPath = $this->resolvePath('communes.json');

        if (!file_exists($wilayasPath) || !file_exists($communesPath)) {
            throw new RuntimeException("Canonical master datasets not found at expected paths.");
        }

        $wilayasData = json_decode(file_get_contents($wilayasPath), true);
        $communesData = json_decode(file_get_contents($communesPath), true);

        if (!is_array($wilayasData) || count($wilayasData) !== 69) {
            throw new RuntimeException("Expected exactly 69 Wilayas in canonical dataset.");
        }

        if (!is_array($communesData) || count($communesData) !== 1541) {
            throw new RuntimeException("Expected exactly 1541 Communes in canonical dataset.");
        }

        DB::transaction(function () use ($wilayasData, $communesData) {
            // 1. Seed Wilayas (Idempotent by code)
            foreach ($wilayasData as $w) {
                Wilaya::updateOrCreate(
                    ['code' => $w['code']],
                    [
                        'name_ar'       => $w['name_ar'],
                        'name_fr'       => $w['name_fr'],
                        'name_en'       => $w['name_en'],
                        'is_active'     => $w['is_active'] ?? true,
                        'display_order' => (int) $w['code'],
                    ]
                );
            }

            // 2. Resolve Wilaya ID mapping by stable code
            $wilayaMap = Wilaya::pluck('id', 'code')->all();

            // 3. Seed Communes (Idempotent by code)
            $communeOrderInWilaya = [];
            foreach ($communesData as $c) {
                $wilayaCode = $c['wilaya_code'];
                if (!isset($wilayaMap[$wilayaCode])) {
                    throw new RuntimeException("Unresolved Wilaya code '{$wilayaCode}' for commune '{$c['code']}'.");
                }

                $communeOrderInWilaya[$wilayaCode] = ($communeOrderInWilaya[$wilayaCode] ?? 0) + 1;

                Commune::updateOrCreate(
                    ['code' => $c['code']],
                    [
                        'wilaya_id'     => $wilayaMap[$wilayaCode],
                        'name_ar'       => $c['name_ar'],
                        'name_fr'       => $c['name_fr'],
                        'name_en'       => $c['name_en'],
                        'postal_code'   => $c['postal_code'] ?? null,
                        'is_active'     => $c['is_active'] ?? true,
                        'display_order' => $communeOrderInWilaya[$wilayaCode],
                    ]
                );
            }
        });
    }

    /**
     * Resolve path to canonical master data file.
     */
    protected function resolvePath(string $filename): string
    {
        $path = database_path("seeders/data/{$filename}");
        if (file_exists($path)) {
            return $path;
        }

        return $path;
    }
}
