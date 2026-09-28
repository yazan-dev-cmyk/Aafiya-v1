<?php

namespace Database\Seeders;

use App\Models\BookingPackage;
use Illuminate\Database\Seeder;

class BookingPackageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $packages = [
            [
                'package_code' => 'PKG_100',
                'name' => 'باقة 100 حجز (Starter)',
                'quota_units' => 100,
                'price_dzd' => 15000.00,
                'description' => 'باقة تشغيلية أولية لمراكز الحجز بسعة 100 موعد مؤكد.',
                'is_active' => true,
            ],
            [
                'package_code' => 'PKG_250',
                'name' => 'باقة 250 حجز (Growth)',
                'quota_units' => 250,
                'price_dzd' => 32500.00,
                'description' => 'باقة نمو متوسطة بسعة 250 موعد مؤكد مع توفير في التكلفة.',
                'is_active' => true,
            ],
            [
                'package_code' => 'PKG_500',
                'name' => 'باقة 500 حجز (Professional)',
                'quota_units' => 500,
                'price_dzd' => 60000.00,
                'description' => 'باقة احترافية لمراكز الحجز النشطة بسعة 500 موعد مؤكد.',
                'is_active' => true,
            ],
            [
                'package_code' => 'PKG_1000',
                'name' => 'باقة 1000 حجز (Enterprise)',
                'quota_units' => 1000,
                'price_dzd' => 110000.00,
                'description' => 'الباقة الشاملة للمؤسسات الكبرى بسعة 1000 موعد مؤكد وأعلى نسبة خصم.',
                'is_active' => true,
            ],
        ];

        foreach ($packages as $pkg) {
            BookingPackage::firstOrCreate(
                ['package_code' => $pkg['package_code']],
                $pkg
            );
        }
    }
}
