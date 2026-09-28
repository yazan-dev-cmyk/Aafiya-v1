export const FEATURE_FLAGS = {
  ENABLE_QR_V2: true,
  ENABLE_AI_ASSISTANT: true,
  ENABLE_LIVE_CHAT: true,
  ENABLE_STAT_WORKFLOW: true,
  ENABLE_ENTERPRISE_RBAC: true,
  ENABLE_REALTIME_NOTIFICATIONS: true,
  ENABLE_TELEMEDICINE: false, // Planned V2 phase
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
