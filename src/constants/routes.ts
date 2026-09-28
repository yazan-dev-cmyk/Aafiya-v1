export const ROUTES = {
  HOME: '/',
  DOCTOR: {
    DASHBOARD: '/doctor/dashboard',
    APPOINTMENTS: '/doctor/appointments',
    PATIENTS: '/doctor/patients',
  },
  PATIENT: {
    DASHBOARD: '/patient/dashboard',
    BOOKINGS: '/patient/bookings',
    MEDICAL_FILE: '/patient/medical-file',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    ASSISTANTS: '/admin/assistants',
    REPORTS: '/admin/reports',
  },
  LABORATORY: {
    DASHBOARD: '/laboratory/dashboard',
    RESULTS: '/laboratory/results',
  },
  RADIOLOGY: {
    DASHBOARD: '/radiology/dashboard',
    SCANS: '/radiology/scans',
  },
  BOOKING: {
    DASHBOARD: '/booking/dashboard',
  },
} as const;
