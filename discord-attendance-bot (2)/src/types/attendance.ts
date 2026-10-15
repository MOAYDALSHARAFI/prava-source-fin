export interface DiscordMember {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  role: string;
  roleColor: string;
  isBot?: boolean;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  description?: string;
  isPrivate?: boolean;
}

export interface TeamDepartment {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  attendanceChannelId: string;
  targetVoiceChannelId: string; // Mandatory voice channel for this team
  logChannelId: string; // Staff channel where warnings and embeds are posted
  checkInCmd: string; // 'د'
  checkOutCmd: string; // 'خ'
  checkMinutes: number; // 5
  enabled: boolean;
  sendWarningToAttendanceChat?: boolean; // If false, warnings are NOT sent to attendance chat (only to admin chat)
  sendWarningToAdminChat?: boolean; // Default true
  customCheckInMsg?: string; // Custom response upon check-in
  customCheckOutMsg?: string; // Custom response upon check-out
  customWarningAttendanceMsg?: string; // Custom warning text in attendance chat
  customWarningAdminMsg?: string; // Custom warning text in admin chat
}

export interface AttendanceSession {
  id: string;
  userId: string;
  userName: string;
  userTag: string;
  userAvatar: string;
  channelId: string;
  teamId?: string;
  teamName?: string;
  targetVoiceChannelId?: string;
  checkInTime: number; // timestamp
  checkOutTime?: number; // timestamp
  initialVoiceStatus: boolean;
  voiceCheckPassed: boolean | null; // null = pending, true = in target voice, false = warned
  warnedAt?: number;
  warnCount: number;
  inVoiceCurrently: boolean;
  currentVoiceChannelId?: string;
  voiceIntervals: { start: number; end?: number }[];
  totalVoiceMs: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  channelId: string;
  sender: DiscordMember;
  content: string;
  timestamp: number;
  isBot?: boolean;
  embed?: DiscordEmbed;
  warningNotice?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: string; // hex
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

export interface BotConfiguration {
  checkInCommand: string; // 'د'
  checkOutCommand: string; // 'خ'
  checkTimerMinutes: number; // 5
  attendanceChannelId: string;
  targetVoiceChannelId?: string;
  staffLogChannelId: string;
  warningMessage: string;
  checkInSuccessMessage: string;
  checkOutSuccessMessage: string;
  warningAdminMessage?: string;
  sendWarningToAttendanceChat?: boolean;
  sendWarningToAdminChat?: boolean;
  soundEnabled: boolean;
  strictVoiceTracking: boolean;
  teams?: TeamDepartment[];
}

export interface UserPermissions {
  manageTeams: boolean; // تعديل صفحات الفرق والآيديات
  manageBot: boolean; // تشغيل وإيقاف البوت وتعديل التوكن
  viewHistory: boolean; // مشاهدة سجل التقارير
  clearHistory: boolean; // مسح سجل التقارير
  manageSettings: boolean; // تعديل الإعدادات والرسائل
  manageUsers: boolean; // إدارة الأعضاء وتوزيع الرولات والصلاحيات (لليدر وصاحب الموقع)
}

export type UserRole = 'owner' | 'admin' | 'supervisor' | 'member';

export interface UserAccount {
  id: string; // المعرف أو الآيدي
  username: string; // اسم المستخدم للدخول
  password?: string; // كلمة المرور
  discordUsername: string; // يوزر الديسكورد
  discordId?: string; // آيدي الديسكورد
  gameUsername: string; // يوزر اللعبة
  role: UserRole; // رتبة المستخدم: owner (الليدر/صاحب الموقع) أو admin أو supervisor أو member
  roleTitle?: string; // مسمى الرتبة المعروض مثل: القائد / صاحب السيرفر / مشرف
  permissions: UserPermissions; // الصلاحيات الممنوحة له
  allowedTeamIds?: string[]; // الفرق المسموح للعضو بالدخول إليها (فارغ أو ['*'] يعني كافة الفرق)
  createdAt: number;
  lastLogin?: number;
}
