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
