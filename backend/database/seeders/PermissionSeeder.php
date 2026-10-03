<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Clinic Management
            [
                'name' => 'clinic.manage_settings',
                'display_name' => 'Manage Clinic Settings',
                'category' => 'clinic',
                'description' => 'Configure schedules, slots, and facility operational settings.',
            ],
            [
                'name' => 'clinic.view_analytics',
                'display_name' => 'View Clinic Analytics',
                'category' => 'clinic',
                'description' => 'Access administrative, revenue, and attendance analytics.',
            ],
            [
                'name' => 'clinic.create_staff',
                'display_name' => 'Create Staff Accounts',
                'category' => 'clinic',
                'description' => 'Authorize and create assistant and employed doctor profiles.',
            ],

            // Clinical Practice
            [
                'name' => 'clinical.write_rx',
                'display_name' => 'Write Prescriptions',
                'category' => 'clinical',
                'description' => 'Author and sign official medical prescriptions.',
            ],
            [
                'name' => 'clinical.view_ehr',
                'display_name' => 'View Patient EHR',
                'category' => 'clinical',
                'description' => 'Access electronic health records within authorized scope.',
            ],
            [
                'name' => 'clinical.delete_record',
                'display_name' => 'Delete Clinical Records',
                'category' => 'clinical',
                'description' => 'Administrative deletion of clinical records (Restricted).',
            ],

            // Booking & Queue Management
            [
                'name' => 'booking.create',
                'display_name' => 'Create Appointments',
                'category' => 'booking',
                'description' => 'Initiate booking requests and appointments.',
            ],
            [
                'name' => 'booking.manage_queue',
                'display_name' => 'Manage Waiting Room Queue',
                'category' => 'booking',
                'description' => 'Manage clinic waiting room queue and triage statuses.',
            ],
            [
                'name' => 'booking.confirm_attendance',
                'display_name' => 'Confirm Patient Attendance',
                'category' => 'booking',
                'description' => 'Mark patient as arrived and ready for clinical consultation.',
            ],
            [
                'name' => 'booking.confirm_quota',
                'display_name' => 'Confirm Booking with Quota Deduction',
                'category' => 'booking',
                'description' => 'Clinically confirm booking resulting in quota consumption.',
            ],

            // Patient Identity & Contacts
            [
                'name' => 'patient.view_contacts',
                'display_name' => 'View Patient Contact Information',
                'category' => 'patient',
                'description' => 'View basic non-clinical contact details for coordination.',
            ],

            // Laboratory Diagnostics
            [
                'name' => 'lab.manage_orders',
                'display_name' => 'Manage Laboratory Orders',
                'category' => 'diagnostics',
                'description' => 'Receive and track lab test requests and samples.',
            ],
            [
                'name' => 'lab.enter_results',
                'display_name' => 'Enter Laboratory Results',
                'category' => 'diagnostics',
                'description' => 'Input quantitative and qualitative test result values.',
            ],
            [
                'name' => 'lab.finalize_results',
                'display_name' => 'Finalize & Approve Laboratory Results',
                'category' => 'diagnostics',
                'description' => 'Scientifically approve and sign lab test reports.',
            ],

            // Radiology Diagnostics
            [
                'name' => 'radiology.manage_orders',
                'display_name' => 'Manage Radiology Orders',
                'category' => 'diagnostics',
                'description' => 'Receive and track imaging orders and appointments.',
            ],
            [
                'name' => 'radiology.upload_images',
                'display_name' => 'Upload Radiology Scans',
                'category' => 'diagnostics',
                'description' => 'Upload DICOM and radiological image assets.',
            ],
            [
                'name' => 'radiology.finalize_report',
                'display_name' => 'Finalize & Approve Radiology Report',
                'category' => 'diagnostics',
                'description' => 'Author and sign official radiological interpretation report.',
            ],
            [
                'name' => 'diagnostic.approve_result',
                'display_name' => 'Approve Diagnostic Result',
                'category' => 'diagnostics',
                'description' => 'Managerial sign-off on critical diagnostic outcomes.',
            ],

            // Platform Administration & Audit
            [
                'name' => 'platform.manage_users',
                'display_name' => 'Manage Platform Users',
                'category' => 'platform',
                'description' => 'Activate, deactivate, and manage platform user identities.',
            ],
            [
                'name' => 'platform.view_audit_logs',
                'display_name' => 'View Platform Audit Logs',
                'category' => 'platform',
                'description' => 'Inspect immutable security and clinical access logs.',
            ],
            [
                'name' => 'platform.manage_ads',
                'display_name' => 'Manage Platform Advertisements',
                'category' => 'platform',
                'description' => 'Review and manage healthcare sponsored advertisements.',
            ],
            [
                'name' => 'platform.view_dashboard',
                'display_name' => 'View Platform Dashboard',
                'category' => 'platform',
                'description' => 'Access executive overview KPIs.',
            ],
            [
                'name' => 'platform.view_statistics',
                'display_name' => 'View Platform Statistics',
                'category' => 'platform',
                'description' => 'Access operational and usage analytics.',
            ],
            [
                'name' => 'platform.view_tasks',
                'display_name' => 'View Operational Tasks',
                'category' => 'platform',
                'description' => 'Access task queues and pending workflows.',
            ],
            [
                'name' => 'platform.view_requests',
                'display_name' => 'View Inbound Requests',
                'category' => 'platform',
                'description' => 'Access registration and onboarding requests.',
            ],
            [
                'name' => 'platform.review_requests',
                'display_name' => 'Review Inbound Requests',
                'category' => 'platform',
                'description' => 'Triage and review onboarding dossiers.',
            ],
            [
                'name' => 'platform.approve_requests',
                'display_name' => 'Approve Registration Requests',
                'category' => 'platform',
                'description' => 'Grant approval to doctor or facility registrations.',
            ],
            [
                'name' => 'platform.reject_requests',
                'display_name' => 'Reject Registration Requests',
                'category' => 'platform',
                'description' => 'Reject incomplete or non-compliant applications.',
            ],
            [
                'name' => 'platform.request_more_info',
                'display_name' => 'Request More Information',
                'category' => 'platform',
                'description' => 'Solicit additional documentation from applicants.',
            ],
            [
                'name' => 'platform.view_docs',
                'display_name' => 'View Uploaded Documents',
                'category' => 'platform',
                'description' => 'Inspect licenses, permits, and credentials.',
            ],
            [
                'name' => 'platform.review_docs',
                'display_name' => 'Review Verification Documents',
                'category' => 'platform',
                'description' => 'Audit compliance of professional diplomas and certifications.',
            ],
            [
                'name' => 'platform.approve_docs',
                'display_name' => 'Approve Verification Documents',
                'category' => 'platform',
                'description' => 'Verify and authenticate uploaded credentials.',
            ],
            [
                'name' => 'platform.request_info_docs',
                'display_name' => 'Request Document Clarification',
                'category' => 'platform',
                'description' => 'Request re-upload of illegible or expired documents.',
            ],
            [
                'name' => 'platform.view_tickets',
                'display_name' => 'View Support Tickets',
                'category' => 'platform',
                'description' => 'Access customer and practitioner helpdesk inquiries.',
            ],
            [
                'name' => 'platform.reply_tickets',
                'display_name' => 'Reply to Support Tickets',
                'category' => 'platform',
                'description' => 'Communicate with ticket openers and submit resolutions.',
            ],
            [
                'name' => 'platform.close_tickets',
                'display_name' => 'Close Resolved Tickets',
                'category' => 'platform',
                'description' => 'Mark customer issues as closed.',
            ],
            [
                'name' => 'platform.escalate_tickets',
                'display_name' => 'Escalate Critical Tickets',
                'category' => 'platform',
                'description' => 'Route complex issues to senior platform leadership.',
            ],
            [
                'name' => 'platform.view_notifications',
                'display_name' => 'View Platform Broadcasts',
                'category' => 'platform',
                'description' => 'Inspect public bulletins and notification streams.',
            ],
            [
                'name' => 'platform.create_notifications',
                'display_name' => 'Create Notification Broadcasts',
                'category' => 'platform',
                'description' => 'Draft platform-wide alerts and announcements.',
            ],
            [
                'name' => 'platform.edit_notifications',
                'display_name' => 'Edit Notification Broadcasts',
                'category' => 'platform',
                'description' => 'Modify existing bulletins and scheduled notifications.',
            ],
            [
                'name' => 'platform.delete_notifications',
                'display_name' => 'Delete Notification Broadcasts',
                'category' => 'platform',
                'description' => 'Withdraw published bulletins from circulation.',
            ],
            [
                'name' => 'platform.publish_notifications',
                'display_name' => 'Publish Emergency Alerts',
                'category' => 'platform',
                'description' => 'Trigger real-time broadcast pushes across user domains.',
            ],
            [
                'name' => 'platform.view_operational_reports',
                'display_name' => 'View Operational Reports',
                'category' => 'platform',
                'description' => 'Inspect system performance and uptime analytics.',
            ],
            [
                'name' => 'platform.export_reports',
                'display_name' => 'Export System Reports',
                'category' => 'platform',
                'description' => 'Export sanitized statistical tables in CSV/PDF formats.',
            ],
            [
                'name' => 'platform.print_reports',
                'display_name' => 'Print Summary Reports',
                'category' => 'platform',
                'description' => 'Generate formatted print layouts of platform metrics.',
            ],
            [
                'name' => 'platform.view_financial_reports',
                'display_name' => 'View Platform Financial Reports',
                'category' => 'platform',
                'description' => 'Access billing and package transaction summaries.',
            ],
            [
                'name' => 'platform.edit_users',
                'display_name' => 'Edit User Profiles',
                'category' => 'platform',
                'description' => 'Update user contact details and administrative notes.',
            ],
            [
                'name' => 'platform.suspend_users',
                'display_name' => 'Suspend User Accounts',
                'category' => 'platform',
                'description' => 'Temporarily freeze account access pending investigation.',
            ],
            [
                'name' => 'platform.delete_users',
                'display_name' => 'Delete Platform Users',
                'category' => 'platform',
                'description' => 'Soft-delete non-compliant or terminated accounts.',
            ],
            [
                'name' => 'platform.manage_master_data',
                'display_name' => 'Manage Master Data',
                'category' => 'platform',
                'description' => 'Create, edit, activate, and deactivate Medical Specialties and Wilayas.',
            ],
        ];

        foreach ($permissions as $permissionData) {
            Permission::updateOrCreate(
                ['name' => $permissionData['name']],
                [
                    'display_name' => $permissionData['display_name'],
                    'category' => $permissionData['category'],
                    'description' => $permissionData['description'],
                ]
            );
        }
    }
}
