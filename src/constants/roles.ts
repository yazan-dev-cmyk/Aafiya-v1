export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'admin',
  PLATFORM_ASSISTANT: 'platform_assistant',
  DOCTOR: 'doctor',
  DOCTOR_ASSISTANT: 'doctor_assistant',
  PATIENT_REGISTERED: 'patient_registered',
  PATIENT_GUEST: 'patient_guest',
  BOOKING_CENTER: 'booking_center',
  LABORATORY: 'lab',
  LAB_ASSISTANT: 'lab_assistant',
  RADIOLOGY: 'radiology',
  RAD_ASSISTANT: 'rad_assistant',
} as const;

export type SystemRole = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];
