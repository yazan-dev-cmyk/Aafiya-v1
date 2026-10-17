<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicOperatingHour;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ClinicOperatingHoursService
{
    /**
     * Retrieve weekly operating hours for a clinic.
     */
    public function getOperatingHours(string $clinicId): array
    {
        $records = ClinicOperatingHour::where('clinic_id', $clinicId)
            ->orderBy('day_of_week')
            ->orderBy('period_index')
            ->get();

        $configuredDays = $records->pluck('day_of_week')->unique()->all();
        $isConfigured = count(array_intersect([0, 1, 2, 3, 4, 5, 6], $configuredDays)) === 7;

        $grouped = [];
        for ($d = 0; $d <= 6; $d++) {
            $dayRecords = $records->where('day_of_week', $d);
            $isClosed = $dayRecords->isEmpty() || (bool) $dayRecords->first()->is_closed;

            $periods = [];
            if (! $isClosed) {
                foreach ($dayRecords as $rec) {
                    if ($rec->open_time && $rec->close_time) {
                        $periods[] = [
                            'period_index' => (int) $rec->period_index,
                            'open_time' => (string) $rec->open_time,
                            'close_time' => (string) $rec->close_time,
                        ];
                    }
                }
            }

            $grouped[] = [
                'day_of_week' => $d,
                'is_closed' => $isClosed,
                'periods' => $periods,
            ];
        }

        return [
            'clinic_id' => $clinicId,
            'is_configured' => $isConfigured,
            'days' => $grouped,
        ];
    }

    /**
     * Check if a clinic has a complete 7-day operating schedule configured.
     */
    public function isClinicConfigured(string $clinicId): bool
    {
        $configuredDays = ClinicOperatingHour::where('clinic_id', $clinicId)
            ->distinct()
            ->pluck('day_of_week')
            ->all();

        return count(array_intersect([0, 1, 2, 3, 4, 5, 6], $configuredDays)) === 7;
    }

    /**
     * Save clinic weekly operating hours.
     */
    public function saveOperatingHours(string $clinicId, array $daysData, User $actor): array
    {
        $clinic = Clinic::findOrFail($clinicId);

        // 4D Authorization: director or clinic.manage_settings
        if (! $actor->hasRole('admin')) {
            $isDirector = $clinic->director_doctor_id && $actor->doctor && ((string) $actor->doctor->id === (string) $clinic->director_doctor_id);
            if (! $isDirector && ! $actor->hasClinicAccess('clinic.manage_settings', $clinicId)) {
                abort(403, 'غير مصرح: إدارة إعدادات وساعات عمل العيادة تتطلب صلاحية مدير العيادة.');
            }
        }

        // Validate payload contains all 7 days
        $daysMap = collect($daysData)->keyBy('day_of_week');
        for ($d = 0; $d <= 6; $d++) {
            if (! $daysMap->has($d)) {
                throw ValidationException::withMessages([
                    'days' => ["اليوم رقم ({$d}) مفقود من جدول تشغيل العيادة."],
                ]);
            }
        }

        DB::transaction(function () use ($clinicId, $daysData) {
            // Delete existing records to cleanly replace with new schedule
            ClinicOperatingHour::where('clinic_id', $clinicId)->delete();

            foreach ($daysData as $dayItem) {
                $dow = (int) $dayItem['day_of_week'];
                $isClosed = (bool) $dayItem['is_closed'];
                $periods = $dayItem['periods'] ?? [];

                if ($isClosed || empty($periods)) {
                    ClinicOperatingHour::create([
                        'id' => (string) Str::uuid(),
                        'clinic_id' => $clinicId,
                        'day_of_week' => $dow,
                        'period_index' => 0,
                        'open_time' => null,
                        'close_time' => null,
                        'is_closed' => true,
                    ]);
                } else {
                    foreach ($periods as $idx => $period) {
                        $open = $period['open_time'] ?? null;
                        $close = $period['close_time'] ?? null;

                        if ($open && $close && strcmp($open, $close) >= 0) {
                            throw ValidationException::withMessages([
                                'periods' => ["وقت الفتح ({$open}) يجب أن يسبق وقت الإغلاق ({$close}) في اليوم ({$dow})."],
                            ]);
                        }

                        ClinicOperatingHour::create([
                            'id' => (string) Str::uuid(),
                            'clinic_id' => $clinicId,
                            'day_of_week' => $dow,
                            'period_index' => (int) ($period['period_index'] ?? $idx),
                            'open_time' => $open,
                            'close_time' => $close,
                            'is_closed' => false,
                        ]);
                    }
                }
            }
        });

        return $this->getOperatingHours($clinicId);
    }
}
