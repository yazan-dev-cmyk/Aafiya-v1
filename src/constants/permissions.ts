export interface AssistantPermissions {
  viewDashboard: boolean;
  viewStatistics: boolean;
  viewTasks: boolean;

  viewRequests: boolean;
  reviewRequests: boolean;
  approveRequests: boolean;
  rejectRequests: boolean;
  requestMoreInfo: boolean;

  viewDocs: boolean;
  reviewDocs: boolean;
  approveDocs: boolean;
  requestInfoDocs: boolean;

  viewTickets: boolean;
  replyTickets: boolean;
  closeTickets: boolean;
  escalateTickets: boolean;

  viewNotifications: boolean;
  createNotifications: boolean;
  editNotifications: boolean;
  deleteNotifications: boolean;
  publishNotifications: boolean;

  viewOperationalReports: boolean;
  exportReports: boolean;
  printReports: boolean;
  viewFinancialReports: boolean;

  viewUsers: boolean;
  editUsers: boolean;
  suspendUsers: boolean;
  deleteUsers: boolean;
}

export const DEFAULT_NO_PERMISSIONS: AssistantPermissions = {
  viewDashboard: false,
  viewStatistics: false,
  viewTasks: false,

  viewRequests: false,
  reviewRequests: false,
  approveRequests: false,
  rejectRequests: false,
  requestMoreInfo: false,

  viewDocs: false,
  reviewDocs: false,
  approveDocs: false,
  requestInfoDocs: false,

  viewTickets: false,
  replyTickets: false,
  closeTickets: false,
  escalateTickets: false,

  viewNotifications: false,
  createNotifications: false,
  editNotifications: false,
  deleteNotifications: false,
  publishNotifications: false,

  viewOperationalReports: false,
  exportReports: false,
  printReports: false,
  viewFinancialReports: false,

  viewUsers: false,
  editUsers: false,
  suspendUsers: false,
  deleteUsers: false,
};

export const UI_TO_BACKEND_PERM_MAP: Record<keyof AssistantPermissions, string> = {
  viewDashboard: 'platform.view_dashboard',
  viewStatistics: 'platform.view_statistics',
  viewTasks: 'platform.view_tasks',
  viewRequests: 'platform.view_requests',
  reviewRequests: 'platform.review_requests',
  approveRequests: 'platform.approve_requests',
  rejectRequests: 'platform.reject_requests',
  requestMoreInfo: 'platform.request_more_info',
  viewDocs: 'platform.view_docs',
  reviewDocs: 'platform.review_docs',
  approveDocs: 'platform.approve_docs',
  requestInfoDocs: 'platform.request_info_docs',
  viewTickets: 'platform.view_tickets',
  replyTickets: 'platform.reply_tickets',
  closeTickets: 'platform.close_tickets',
  escalateTickets: 'platform.escalate_tickets',
  viewNotifications: 'platform.view_notifications',
  createNotifications: 'platform.create_notifications',
  editNotifications: 'platform.edit_notifications',
  deleteNotifications: 'platform.delete_notifications',
  publishNotifications: 'platform.publish_notifications',
  viewOperationalReports: 'platform.view_operational_reports',
  exportReports: 'platform.export_reports',
  printReports: 'platform.print_reports',
  viewFinancialReports: 'platform.view_financial_reports',
  viewUsers: 'platform.manage_users',
  editUsers: 'platform.edit_users',
  suspendUsers: 'platform.suspend_users',
  deleteUsers: 'platform.delete_users',
};

/**
 * Hydrates UI permissions from backend effective permissions list.
 */
export const mapBackendPermissionsToUI = (perms: string[] = []): AssistantPermissions => {
  const permSet = new Set(perms);
  const result: any = { ...DEFAULT_NO_PERMISSIONS };
  for (const [uiKey, backendKey] of Object.entries(UI_TO_BACKEND_PERM_MAP)) {
    result[uiKey] = permSet.has(backendKey);
  }
  return result as AssistantPermissions;
};

/**
 * Converts UI permission state to backend permission list for persistence.
 */
export const mapUIToBackendPermissions = (uiPerms: AssistantPermissions): string[] => {
  const result: string[] = [];
  for (const [uiKey, backendKey] of Object.entries(UI_TO_BACKEND_PERM_MAP)) {
    if (uiPerms[uiKey as keyof AssistantPermissions]) {
      result.push(backendKey);
    }
  }
  return result;
};
