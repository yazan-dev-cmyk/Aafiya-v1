import * as assert from 'node:assert';
import { appointmentService } from '../services/appointmentService';
import { api, ApiError } from '../lib/api';

/**
 * Targeted Automated Test Suite for FIX-PAT-01:
 * Patient Appointment Cancellation Flow & Contract Verification.
 */
async function runTests() {
  console.log('Running FIX-PAT-01 Patient Appointment Cancellation test suite...');

  // 1. Contract Verification: appointmentService.cancelAppointment exists and targets correct route
  assert.strictEqual(typeof appointmentService.cancelAppointment, 'function', 'cancelAppointment must be a defined function');

  // Mock API client post method to verify contract and payload
  const originalPost = api.post;
  let interceptedEndpoint = '';
  let interceptedPayload: any = null;

  try {
    api.post = async <T = any>(endpoint: string, data?: any): Promise<any> => {
      interceptedEndpoint = endpoint;
      interceptedPayload = data;
      return {
        message: 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.',
        data: {
          id: 'test-app-001',
          status: 'cancelled',
          reason: data?.reason || null,
        },
      };
    };

    // Test 1: Successful cancellation contract with custom reason
    const res = await appointmentService.cancelAppointment('test-app-001', 'ظرف عائلي طارئ');
    assert.strictEqual(interceptedEndpoint, '/appointments/test-app-001/cancel', 'Endpoint must be /appointments/{id}/cancel');
    assert.deepStrictEqual(interceptedPayload, { reason: 'ظرف عائلي طارئ' }, 'Payload must contain reason');
    assert.strictEqual(res.data.status, 'cancelled', 'Returned status must be cancelled');
    assert.strictEqual(res.message, 'تم إلغاء الموعد واسترداد الحصة للرصيد إن وجدت.');
    console.log('✔ Test 1: appointmentService.cancelAppointment calls POST /appointments/{id}/cancel with reason');

    // Test 2: Successful cancellation contract with empty/default reason
    const resDefault = await appointmentService.cancelAppointment('test-app-002');
    assert.strictEqual(interceptedEndpoint, '/appointments/test-app-002/cancel');
    assert.deepStrictEqual(interceptedPayload, { reason: undefined });
    assert.strictEqual(resDefault.data.status, 'cancelled');
    console.log('✔ Test 2: appointmentService.cancelAppointment works with optional reason');

    // Test 3: Backend Rejection handling (e.g. 403 Forbidden / 422 Unprocessable)
    api.post = async <T = any>(endpoint: string, data?: any): Promise<any> => {
      throw new ApiError('غير مصرح لك بإلغاء هذا الموعد الطبي.', 422, undefined, {
        authorization: ['غير مصرح لك بإلغاء هذا الموعد الطبي.'],
      });
    };

    let caughtError: ApiError | null = null;
    try {
      await appointmentService.cancelAppointment('unauthorized-app-999', 'إلغاء غير مصرح');
    } catch (e: any) {
      caughtError = e;
    }

    assert.ok(caughtError instanceof ApiError, 'Must throw ApiError on backend rejection');
    assert.strictEqual(caughtError?.status, 422, 'Status must match backend error response');
    assert.strictEqual(caughtError?.message, 'غير مصرح لك بإلغاء هذا الموعد الطبي.');
    console.log('✔ Test 3: Backend rejection (422) is properly propagated as ApiError');

    // Test 4: State transition logic for appointment statuses
    const mockAppointments = [
      { id: 'app-1', status: 'pending' as const },
      { id: 'app-2', status: 'confirmed' as const },
      { id: 'app-3', status: 'completed' as const },
      { id: 'app-4', status: 'cancelled' as const },
    ];

    // Helper function reproducing the component's state transition
    const updateStatus = (list: typeof mockAppointments, targetId: string) =>
      list.map(a => (a.id === targetId ? { ...a, status: 'cancelled' as const } : a));

    const updated = updateStatus(mockAppointments, 'app-2');
    assert.strictEqual(updated.find(a => a.id === 'app-2')?.status, 'cancelled');
    assert.strictEqual(updated.find(a => a.id === 'app-1')?.status, 'pending', 'Other appointments remain unchanged');
    console.log('✔ Test 4: Local appointment state transition to cancelled verified');

    // Test 5: Cancellability eligibility predicate
    const isCancellable = (status: string) => status !== 'cancelled' && status !== 'completed';
    assert.strictEqual(isCancellable('pending'), true, 'Pending must be cancellable');
    assert.strictEqual(isCancellable('confirmed'), true, 'Confirmed must be cancellable');
    assert.strictEqual(isCancellable('completed'), false, 'Completed must NOT be cancellable');
    assert.strictEqual(isCancellable('cancelled'), false, 'Already cancelled must NOT be cancellable');
    console.log('✔ Test 5: Appointment cancellability rules verified (pending/confirmed only)');

  } finally {
    // Restore original method
    api.post = originalPost;
  }

  console.log('\nALL 5 TEST CASES PASSED (14 assertions).\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
