import { UserInfo } from "@/components/common/DataGrid/DataGridWithMeta";

export interface TimelineProps {
  doctype: string;
  docname: string;
  onUpdate?: VoidFunction;
  createTask?: boolean;
  createEvent?: boolean;
}

export interface GetInfoCommonInterface {
  name?: string;
  creation?: string;
  content?: string;
  owner?: string;
  comment_type?: string;
  type: "Comment" | "Assignment" | "Attachment" | "Info" | "Like" | "Workflow";
  data_type?: string;
}

export interface TaskLogData {
  name: string;
  owner: string;
  description?: string;
  status?: string;
  creation?: string;
  type: "Task";
  data_type?: string;
}
export interface CommunicationLogData {
  name: string;
  communication_type: string;
  communication_medium: string;
  comment_type: string;
  communication_date: string;
  content: string;
  sender: string;
  sender_full_name: string;
  cc: string;
  bcc: string;
  creation: string;
  subject: string;
  delivery_status: string;
  _liked_by: string[];
  reference_doctype: string;
  reference_name: string;
  read_by_recipient: number;
  rating: number;
  recipients: string;
  attachments?: string;
  type: "Communication" | "Automated Message";
  data_type?: string;
}
export interface Attachment {
  file_url: string;
  is_private: boolean;
}
export interface Versions {
  name: string;
  owner: string;
  creation: string;
  data: string;
  content: string;
  type: "Version";
  data_type?: string;
}
export interface Views {
  name: string;
  creation: string;
  owner: string;
  type: "View";
  data_type?: string;
}

export interface CreationModification {
  name: string;
  creation: string;
  content: string;
  type: "Creation" | "Modified";
  data_type?: string;
}

export interface SMSTimelineLog {
  creation: string;
  message: string;
  owner: string;
  phone_number: string;
  name: string;
  type: "SMS";
  data_type?: string;
}

export type MergeListObject =
  | GetInfoCommonInterface
  | CommunicationLogData
  | Versions
  | Views
  | TaskLogData
  | CreationModification
  | SMSTimelineLog;
export interface DocumentLogData {
  user_info: Record<string, UserInfo>;
  comments: GetInfoCommonInterface[];
  assignment_logs: GetInfoCommonInterface[];
  attachment_logs: GetInfoCommonInterface[];
  info_logs: GetInfoCommonInterface[];
  like_logs: GetInfoCommonInterface[];
  workflow_logs: GetInfoCommonInterface[];
  communications: CommunicationLogData[];
  automated_messages: CommunicationLogData[];
  versions: Versions[];
  views: Views[];
  merge_list: MergeListObject[];
}
