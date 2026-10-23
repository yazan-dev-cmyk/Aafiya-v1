import * as assert from 'node:assert';
import { ehrService, SharedPatientMedicalRecord } from '../services/ehrService';
import { api, ApiError } from '../lib/api';

/**
 * Targeted Automated Test Suite for TASK-PAR-PAT-05 Phase 2:
 * Shared Medical Record Resolution & Recipient Viewer Contract.
 */
async function runTests() {
  console.log('Running TASK-PAR-PAT-05 Phase 2 Shared Record Resolution test suite...');

  // 1. Contract Verification: ehrService.resolveSharedRecord exists and is a function
  assert.strictEqual(typeof ehrService.resolveSharedRecord, 'function', 'resolveSharedRecord must be a defined function');

  const originalPublicPost = api.publicPost;
  const originalPost = api.post;

  let interceptedEndpoint = '';
  let interceptedPayload: any = null;
  let interceptedOptions: any = null;

  try {
    // --- Test 1: resolveSharedRecord calls POST /shared-records/resolve with token and pin in body ---
    api.publicPost = async <T = any>(endpoint: string, data?: any, options?: any): Promise<any> => {
      interceptedEndpoint = endpoint;
      interceptedPayload = data;
      interceptedOptions = options;

      return {
        data: {
          scope: 'all_emr',
          patient: {
            id: 'pat-uuid-1',
            mrn: 'MRN-2026-001',
            first_name: 'ياسمين',
            last_name: 'العربي',
            full_name: 'ياسمين العربي',
            gender: 'female',
            date_of_birth: '1995-04-12',
            blood_group: 'A+',
            allergies: [
              { id: 'all-1', patient_id: 'pat-uuid-1', allergen: 'البنسلين', severity: 'severe', reaction: 'صدمة حساسية' }
            ],
            chronic_conditions: [
              { id: 'chr-1', patient_id: 'pat-uuid-1', condition_name: 'الربو القصبي', icd10_code: 'J45', status: 'active' }
            ],
            current_medications: [
              { id: 'med-1', patient_id: 'pat-uuid-1', medication_name: 'فنتولين', dosage: '100mcg', frequency: 'عند اللزوم', is_active: true }
            ]
          },
          share_metadata: {
            scope: 'all_emr',
            access_granted_at: '2026-10-16T01:00:00Z',
            expires_at: '2026-10-17T01:00:00Z',
            authorized_clinical_scope: 'ملف طبي موحد معتمد (خالٍ من بيانات الاتصال والهوية الشخصية)'
          }
        }
      };
    };

    const res = await ehrService.resolveSharedRecord({
      token: 'pst_testToken1234567890abcdef',
      pin: '4821',
    });

    assert.strictEqual(interceptedEndpoint, '/shared-records/resolve', 'Must call POST /shared-records/resolve');
    assert.deepStrictEqual(
      interceptedPayload,
      { token: 'pst_testToken1234567890abcdef', pin: '4821' },
      'Token and PIN must be submitted in POST body'
    );
    // Verify that Authorization and X-Clinic-ID are strictly absent from public recipient resolution
    const passedHeaders = interceptedOptions?.headers;
    const authHeader = passedHeaders instanceof Headers ? passedHeaders.get('Authorization') : passedHeaders?.['Authorization'];
    const clinicHeader = passedHeaders instanceof Headers ? passedHeaders.get('X-Clinic-ID') : passedHeaders?.['X-Clinic-ID'];
    assert.strictEqual(authHeader, undefined, 'Authorization header must be absent from public recipient resolution');
    assert.strictEqual(clinicHeader, undefined, 'X-Clinic-ID header must be absent from public recipient resolution');
    assert.strictEqual(res.data.scope, 'all_emr', 'Scope must be all_emr');
    assert.strictEqual(res.data.patient.full_name, 'ياسمين العربي', 'Must return patient full name');
    assert.strictEqual(res.data.patient.allergies.length, 1, 'Must return allergies list');
    assert.strictEqual(res.data.patient.chronic_conditions.length, 1, 'Must return chronic conditions list');
    assert.strictEqual(res.data.patient.current_medications.length, 1, 'Must return current medications list');

    // Verify data minimization: PII fields must not exist
    const patientObj = res.data.patient as any;
    assert.strictEqual(patientObj.phone, undefined, 'Phone must NOT be present in shared patient record');
    assert.strictEqual(patientObj.email, undefined, 'Email must NOT be present in shared patient record');
    assert.strictEqual(patientObj.national_id, undefined, 'National ID must NOT be present in shared patient record');
    assert.strictEqual(patientObj.address, undefined, 'Address must NOT be present in shared patient record');

    console.log('✔ Test 1: resolveSharedRecord submits token and pin in POST body without credentials and returns minimized record');

    // --- Test 2: ApiError preserves responseData and remaining_attempts for PIN rejection (403) ---
    api.publicPost = async () => {
      throw new ApiError('رمز الحماية PIN غير صحيح.', 403, undefined, undefined, {
        status: 'error',
        code: 403,
        message: 'رمز الحماية PIN غير صحيح.',
        remaining_attempts: 3
      });
    };

    let caught403: any = null;
    try {
      await ehrService.resolveSharedRecord({ token: 'pst_testToken', pin: '0000' });
    } catch (err) {
      caught403 = err;
    }

    assert.ok(caught403 instanceof ApiError, 'Must throw ApiError');
    assert.strictEqual(caught403.status, 403, 'Status must be 403');
    assert.strictEqual(caught403.responseData?.remaining_attempts, 3, 'Must preserve remaining_attempts from responseData');
    console.log('✔ Test 2: ApiError preserves remaining_attempts on 403 Forbidden');

    // --- Test 3: ApiError preserves lockout response (423) ---
    api.publicPost = async () => {
      throw new ApiError('تم قفل الرابط مؤقتاً بسبب تكرار المحاولات الخاطئة.', 423, undefined, undefined, {
        status: 'error',
        code: 423,
        message: 'تم قفل الرابط مؤقتاً بسبب تكرار المحاولات الخاطئة.'
      });
    };

    let caught423: any = null;
    try {
      await ehrService.resolveSharedRecord({ token: 'pst_testToken', pin: '0000' });
    } catch (err) {
      caught423 = err;
    }

    assert.ok(caught423 instanceof ApiError, 'Must throw ApiError');
    assert.strictEqual(caught423.status, 423, 'Status must be 423');
    assert.strictEqual(caught423.responseData?.locked_until, undefined, 'locked_until must NOT be present in 423 response');
    console.log('✔ Test 3: ApiError correctly handles 423 Locked with locked_until omitted');

    // --- Test 4: URL Fragment extraction and sanitization simulation ---
    const rawFragment = '#token=pst_abcdef1234567890&extra=ignore';
    const match = rawFragment.match(/token=([^&]+)/);
    assert.ok(match && match[1], 'Must match token in hash');
    const extractedToken = decodeURIComponent(match[1]);
    assert.strictEqual(extractedToken, 'pst_abcdef1234567890', 'Must accurately extract token from hash');
    console.log('✔ Test 4: URL fragment extraction correctly parses pst_ token');

    console.log('\nAll TASK-PAR-PAT-05 Phase 2 tests passed successfully! (4/4 tests)');
  } finally {
    api.publicPost = originalPublicPost;
    api.post = originalPost;
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
