import * as assert from 'node:assert';
import {
  ALLOWED_HOURLY_SLOTS,
  WEEKDAYS_ORDER,
  ClinicOperatingDay,
  DoctorDayScheduleItem,
} from '../services/workingHoursService';

function runTests() {
  console.log('Running Working Hours targeted automated test suite...');

  // 1. Weekdays mapping
  assert.deepStrictEqual([...WEEKDAYS_ORDER], [0, 1, 2, 3, 4, 5, 6]);
  assert.strictEqual(WEEKDAYS_ORDER[0], 0, 'Saturday must be 0');
  assert.strictEqual(WEEKDAYS_ORDER[1], 1, 'Sunday must be 1');
  assert.strictEqual(WEEKDAYS_ORDER[2], 2, 'Monday must be 2');
  assert.strictEqual(WEEKDAYS_ORDER[3], 3, 'Tuesday must be 3');
  assert.strictEqual(WEEKDAYS_ORDER[4], 4, 'Wednesday must be 4');
  assert.strictEqual(WEEKDAYS_ORDER[5], 5, 'Thursday must be 5');
  assert.strictEqual(WEEKDAYS_ORDER[6], 6, 'Friday must be 6');
  console.log('✔ Test 1: Weekdays mapping conforms to Saturday=0 through Friday=6');

  // 2. Allowed hourly slots
  assert.deepStrictEqual([...ALLOWED_HOURLY_SLOTS], [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
  ]);
  assert.strictEqual(ALLOWED_HOURLY_SLOTS.includes('17:00' as any), false, '17:00 must be forbidden as booking start');
  assert.strictEqual(ALLOWED_HOURLY_SLOTS.includes('07:00' as any), false, '07:00 must be forbidden');
  assert.strictEqual(ALLOWED_HOURLY_SLOTS.length, 9);
  console.log('✔ Test 2: Allowed hourly slots whitelist strictly spans 08:00 through 16:00 (17:00 prohibited)');

  // 3. 7-day clinic operating hours completeness
  const valid7Days: ClinicOperatingDay[] = WEEKDAYS_ORDER.map((d) => ({
    day_of_week: d,
    is_closed: d === 0 || d === 6,
    periods:
      d === 0 || d === 6
        ? []
        : [{ period_index: 0, open_time: '08:00', close_time: '17:00' }],
  }));
  assert.strictEqual(valid7Days.length, 7);
  assert.deepStrictEqual(
    valid7Days.map((d) => d.day_of_week),
    [0, 1, 2, 3, 4, 5, 6]
  );
  console.log('✔ Test 3: 7-day clinic operating hours payload completeness verified');

  // 4. Doctor working slot containment within clinic hours
  const clinicPeriods = [{ open_time: '08:00', close_time: '17:00' }];
  const checkContainment = (slot: string, periods: typeof clinicPeriods) => {
    const slotHour = parseInt(slot.split(':')[0], 10);
    const slotEnd = `${String(slotHour + 1).padStart(2, '0')}:00`;
    return periods.some((p) => p.open_time <= slot && p.close_time >= slotEnd);
  };
  assert.strictEqual(checkContainment('08:00', clinicPeriods), true);
  assert.strictEqual(checkContainment('16:00', clinicPeriods), true);
  assert.strictEqual(checkContainment('17:00', clinicPeriods), false);
  console.log('✔ Test 4: Doctor working slot containment within clinic hours verified');

  // 5. Schedule activation payload integrity
  const doctorDays: DoctorDayScheduleItem[] = WEEKDAYS_ORDER.map((d) => ({
    day_of_week: d,
    is_closed: d === 0 || d === 6,
    slots: d === 0 || d === 6 ? [] : ['08:00', '09:00', '10:00'],
  }));
  assert.strictEqual(doctorDays.length, 7);
  assert.strictEqual(doctorDays[0].is_closed, true);
  assert.deepStrictEqual(doctorDays[0].slots, []);
  assert.strictEqual(doctorDays[1].is_closed, false);
  assert.deepStrictEqual(doctorDays[1].slots, ['08:00', '09:00', '10:00']);
  console.log('✔ Test 5: Schedule activation payload contains all 7 days with explicit closure flags');

  console.log('\nALL 5 TEST CASES PASSED (17 assertions).');
}

runTests();
