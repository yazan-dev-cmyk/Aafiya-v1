<?php

namespace Tests\Unit;

use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class WeekdayMappingTest extends TestCase
{
    /**
     * Test the canonical AAFIYA weekday mapping formula: (carbonDow + 1) % 7
     * Saturday = 0, Sunday = 1, Monday = 2, Tuesday = 3, Wednesday = 4, Thursday = 5, Friday = 6.
     */
    public function test_canonical_weekday_mapping_for_all_seven_days(): void
    {
        $dates = [
            '2026-10-10' => 0, // Saturday
            '2026-10-11' => 1, // Sunday
            '2026-10-12' => 2, // Monday
            '2026-10-13' => 3, // Tuesday
            '2026-10-14' => 4, // Wednesday
            '2026-10-15' => 5, // Thursday
            '2026-10-16' => 6, // Friday
        ];

        foreach ($dates as $dateStr => $expectedAafiyaDow) {
            $carbon = Carbon::parse($dateStr);
            $aafiyaDow = ($carbon->dayOfWeek + 1) % 7;
            $this->assertSame($expectedAafiyaDow, $aafiyaDow, "Failed asserting that {$dateStr} maps to AAFIYA weekday {$expectedAafiyaDow}");
        }
    }

    /**
     * Test reverse mapping from AAFIYA canonical weekday to Carbon day of week: (aafiyaDow + 6) % 7
     */
    public function test_reverse_canonical_weekday_mapping(): void
    {
        for ($aafiyaDow = 0; $aafiyaDow <= 6; $aafiyaDow++) {
            $carbonDow = ($aafiyaDow + 6) % 7;
            $reconvertedAafiya = ($carbonDow + 1) % 7;
            $this->assertSame($aafiyaDow, $reconvertedAafiya);
        }
    }
}
