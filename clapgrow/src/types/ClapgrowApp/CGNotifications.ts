export type NotificationSettingsType = {
  task_assigned: boolean;
  task_assigned_whatsapp: boolean;
  task_assigned_email: boolean;
  upcoming_task_assigned: boolean;
  upcoming_task_assigned_whatsapp: boolean;
  upcoming_task_assigned_email: boolean;
  overdue_task_assigned: boolean;
  overdue_task_assigned_whatsapp: boolean;
  overdue_task_assigned_email: boolean;
  summary_digest: boolean;
  summary_digest_whatsapp: boolean;
  summary_digest_email: boolean;
  weekly_score: boolean;
  weekly_score_whatsapp: boolean;
  weekly_score_email: boolean;
  mis_score: boolean;
  mis_score_whatsapp: boolean;
  mis_score_email: boolean;
  default_reminder: boolean;
  default_reminder_whatsapp: boolean;
  default_reminder_email: boolean;
  // Add more fields if needed
};
