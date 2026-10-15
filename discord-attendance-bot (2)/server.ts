import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  Partials 
} from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

export interface TeamConfig {
  id: string;
  name: string;
  color: string;
  attendanceChannelId: string;
  targetVoiceChannelId: string; // The specific voice channel ID to check
  logChannelId: string; // Staff channel where warnings and embeds are posted
  checkInCmd: string; // 'د'
  checkOutCmd: string; // 'خ'
  checkMinutes: number; // 5
  enabled: boolean;
  sendWarningToAttendanceChat?: boolean; // Toggle: send warning in attendance chat? (default false / user choice)
  sendWarningToAdminChat?: boolean; // Send warning in admin chat (default true)
  customCheckInMsg?: string;
  customCheckOutMsg?: string;
  customWarningAttendanceMsg?: string;
  customWarningAdminMsg?: string;
}

const DEFAULT_TEAMS: TeamConfig[] = [
  {
    id: 'team-scenario',
    name: 'فريق السيناريو (Scenario Team)',
    color: '#5865F2',
    attendanceChannelId: '1559200634698342410',
    targetVoiceChannelId: '',
    logChannelId: '1559200800218022020',
    checkInCmd: 'د',
    checkOutCmd: 'خ',
    checkMinutes: 5,
    enabled: true,
    sendWarningToAttendanceChat: false,
    sendWarningToAdminChat: true,
  },
  {
    id: 'team-ban',
    name: 'فريق الباند والرقابة (Ban Team)',
    color: '#ED4245',
    attendanceChannelId: '',
    targetVoiceChannelId: '',
    logChannelId: '',
    checkInCmd: 'د',
    checkOutCmd: 'خ',
    checkMinutes: 5,
    enabled: true,
    sendWarningToAttendanceChat: false,
    sendWarningToAdminChat: true,
  },
  {
    id: 'team-support',
    name: 'فريق الدعم الفني (Support Team)',
    color: '#57F287',
    attendanceChannelId: '',
    targetVoiceChannelId: '',
    logChannelId: '',
    checkInCmd: 'د',
    checkOutCmd: 'خ',
    checkMinutes: 5,
    enabled: true,
    sendWarningToAttendanceChat: false,
    sendWarningToAdminChat: true,
  },
  {
    id: 'team-admin',
    name: 'فريق الإدارة والمسؤولين (Admin Team)',
    color: '#FEE75C',
    attendanceChannelId: '',
    targetVoiceChannelId: '',
    logChannelId: '',
    checkInCmd: 'د',
    checkOutCmd: 'خ',
    checkMinutes: 5,
    enabled: true,
    sendWarningToAttendanceChat: false,
    sendWarningToAdminChat: true,
  },
  {
    id: 'team-events',
    name: 'فريق الفعاليات (Events Team)',
    color: '#EB459E',
    attendanceChannelId: '',
    targetVoiceChannelId: '',
    logChannelId: '',
    checkInCmd: 'د',
    checkOutCmd: 'خ',
    checkMinutes: 5,
    enabled: true,
    sendWarningToAttendanceChat: false,
    sendWarningToAdminChat: true,
  },
];

interface BotConfig {
  token: string;
  attendanceChannelId?: string;
  targetVoiceChannelId?: string;
  logChannelId?: string;
  checkMinutes: number;
  checkInCmd: string;
  checkOutCmd: string;
  sendWarningToAttendanceChat?: boolean;
  sendWarningToAdminChat?: boolean;
  customCheckInMsg?: string;
  customCheckOutMsg?: string;
  customWarningAttendanceMsg?: string;
  customWarningAdminMsg?: string;
  teams?: TeamConfig[];
}

interface LiveLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface ActiveSessionData {
  userId: string;
  userTag: string;
  userName: string;
  userAvatar: string;
  teamId?: string;
  teamName?: string;
  targetVoiceChannelId?: string;
  logChannelId?: string;
  checkInTime: number;
  voiceStartTime: number | null;
  totalVoiceMs: number;
  timeoutId?: NodeJS.Timeout;
  warned: boolean;
  warnCount: number;
  currentlyInVoice: boolean;
  voiceChannelName?: string;
}

interface HistorySessionRecord {
  id: string;
  userId: string;
  userName: string;
  userTag: string;
  userAvatar: string;
  teamId?: string;
  teamName?: string;
  checkInTime: number;
  checkOutTime: number;
  totalShiftMs: number;
  totalVoiceMs: number;
  warnCount: number;
}

import fs from 'fs';

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'bot-store.json');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Global Discord Client State
let discordClient: Client | null = null;
let currentConfig: BotConfig | null = null;
let configuredTeams: TeamConfig[] = [...DEFAULT_TEAMS];

let botStatus = {
  isRunning: false,
  tag: '',
  id: '',
  avatar: '',
  guildsCount: 0,
  startedAt: 0,
};

const liveLogs: LiveLog[] = [];
const activeSessions = new Map<string, ActiveSessionData>();
let attendanceHistory: HistorySessionRecord[] = [];

export interface UserPermissions {
  manageTeams: boolean;
  manageBot: boolean;
  viewHistory: boolean;
  clearHistory: boolean;
  manageSettings: boolean;
  manageUsers: boolean;
}

export type UserRole = 'owner' | 'admin' | 'supervisor' | 'member';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  discordUsername: string;
  discordId?: string;
  gameUsername: string;
  role: UserRole;
  roleTitle?: string;
  permissions: UserPermissions;
  allowedTeamIds?: string[]; // Allowed teams (empty or ['*'] means all teams)
  createdAt: number;
  lastLogin?: number;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-leader-1',
    username: 'leader',
    password: '123',
    discordUsername: 'Leader#0001',
    discordId: '1559200634698342410',
    gameUsername: 'LeaderOne',
    role: 'owner',
    roleTitle: '👑 القائد وصاحب الموقع',
    permissions: {
      manageTeams: true,
      manageBot: true,
      viewHistory: true,
      clearHistory: true,
      manageSettings: true,
      manageUsers: true,
    },
    allowedTeamIds: ['*'],
    createdAt: Date.now(),
  },
];

let userAccounts: UserAccount[] = [...DEFAULT_USERS];

// Automatic Load Store
function loadStore() {
  try {
    const fileToRead = fs.existsSync(DATA_FILE) ? DATA_FILE : (fs.existsSync(DB_FILE) ? DB_FILE : null);
    if (fileToRead) {
      const raw = fs.readFileSync(fileToRead, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.history)) {
        attendanceHistory = data.history;
      }
      if (Array.isArray(data.teams) && data.teams.length > 0) {
        configuredTeams = data.teams;
      } else if (data.config && Array.isArray(data.config.teams) && data.config.teams.length > 0) {
        configuredTeams = data.config.teams;
      }
      if (Array.isArray(data.users) && data.users.length > 0) {
        userAccounts = data.users;
      } else {
        userAccounts = [...DEFAULT_USERS];
      }
      if (data.config) {
        currentConfig = {
          ...data.config,
          teams: configuredTeams,
        };
      }
    }

    // Securely inject token from process.env if present
    const envToken = process.env.DISCORD_BOT_TOKEN ? String(process.env.DISCORD_BOT_TOKEN).trim().replace(/^["'`]|["'`]$/g, '') : '';
    if (envToken) {
      if (!currentConfig) {
        currentConfig = {
          token: envToken,
          checkMinutes: 5,
          checkInCmd: 'د',
          checkOutCmd: 'خ',
          teams: configuredTeams,
        };
      } else {
        currentConfig.token = envToken;
      }
    }
  } catch (err) {
    console.error('Failed to load store:', err);
  }
}

// Automatic Save Store (CRITICAL SECURITY: never writes secret token to disk files)
function saveStore() {
  try {
    // Sanitize config before writing to disk so tokens are NEVER committed or leaked
    const safeConfig = currentConfig ? { ...currentConfig, token: '' } : null;
    const data = {
      config: safeConfig,
      teams: configuredTeams,
      history: attendanceHistory,
      users: userAccounts,
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(DATA_FILE, serialized, 'utf-8');
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

// Load data immediately on boot
loadStore();

function addLog(type: 'info' | 'success' | 'warn' | 'error', message: string) {
  const log: LiveLog = {
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type,
    message,
  };
  liveLogs.unshift(log);
  if (liveLogs.length > 100) liveLogs.pop();
  console.log(`[DiscordBot] [${type.toUpperCase()}] ${message}`);
}

function formatDurationArabic(ms: number): string {
  if (!ms || ms <= 0) return '0 دقيقة';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : 'ساعات'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds} ${seconds === 1 ? 'ثانية' : 'ثوانٍ'}`);

  return parts.length > 0 ? parts.join(' و ') : 'أقل من دقيقة';
}

function replaceMessageVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// API Routes
app.get('/api/download/project', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'discord-attendance-project.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="discord-attendance-bot.zip"');
    return res.download(zipPath, 'discord-attendance-bot.zip');
  }
  return res.status(404).json({ error: 'ملف المشروع غير متوفر' });
});

app.get('/api/download/project-tar', (_req, res) => {
  const tarPath = path.resolve(__dirname, 'public', 'discord-attendance-project.tar.gz');
  if (fs.existsSync(tarPath)) {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="discord-attendance-bot.tar.gz"');
    return res.download(tarPath, 'discord-attendance-bot.tar.gz');
  }
  return res.status(404).json({ error: 'ملف الأرشيف غير متوفر' });
});

// Base64 download route for guaranteed in-browser download
app.get('/api/developer/base64-zip', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'discord-attendance-project.zip');
  if (fs.existsSync(zipPath)) {
    const fileBuffer = fs.readFileSync(zipPath);
    const base64Data = fileBuffer.toString('base64');
    return res.json({
      success: true,
      filename: 'discord-attendance-bot.zip',
      size: fileBuffer.length,
      mimeType: 'application/zip',
      base64: base64Data,
    });
  }
  return res.status(404).json({ error: 'ملف المشروع غير متوفر' });
});

// Single source file content inspector for developer portal
app.get('/api/developer/file-content', (req, res) => {
  const requestedFile = String(req.query.file || '');
  const allowedFiles: Record<string, string> = {
    'server.ts': path.resolve(__dirname, 'server.ts'),
    'package.json': path.resolve(__dirname, 'package.json'),
    '.env.example': path.resolve(__dirname, '.env.example'),
    '.gitignore': path.resolve(__dirname, '.gitignore'),
    'data/db.json': path.resolve(__dirname, 'data', 'db.json'),
    'README.md': path.resolve(__dirname, 'README.md'),
    'src/App.tsx': path.resolve(__dirname, 'src', 'App.tsx'),
    'src/components/LiveBotRunner.tsx': path.resolve(__dirname, 'src', 'components', 'LiveBotRunner.tsx'),
    'src/components/TeamPagesManager.tsx': path.resolve(__dirname, 'src', 'components', 'TeamPagesManager.tsx'),
  };

  const targetPath = allowedFiles[requestedFile];
  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'الملف غير متاح' });
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  return res.json({ file: requestedFile, content });
});

app.get('/api/bot/status', (_req, res) => {
  const sessionsList = Array.from(activeSessions.values()).map((s) => ({
    userId: s.userId,
    userName: s.userName,
    userTag: s.userTag,
    userAvatar: s.userAvatar,
    teamId: s.teamId,
    teamName: s.teamName,
    targetVoiceChannelId: s.targetVoiceChannelId,
    logChannelId: s.logChannelId,
    checkInTime: s.checkInTime,
    totalVoiceMs: s.totalVoiceMs + (s.voiceStartTime ? Date.now() - s.voiceStartTime : 0),
    warned: s.warned,
    warnCount: s.warnCount,
    currentlyInVoice: s.currentlyInVoice,
    voiceChannelName: s.voiceChannelName,
  }));

  res.json({
    isRunning: botStatus.isRunning,
    botUser: botStatus,
    hasEnvToken: Boolean(process.env.DISCORD_BOT_TOKEN),
    envKeyName: 'DISCORD_BOT_TOKEN',
    config: currentConfig ? {
      checkMinutes: currentConfig.checkMinutes,
      checkInCmd: currentConfig.checkInCmd,
      checkOutCmd: currentConfig.checkOutCmd,
      attendanceChannelId: currentConfig.attendanceChannelId,
      logChannelId: currentConfig.logChannelId,
      sendWarningToAttendanceChat: currentConfig.sendWarningToAttendanceChat,
      sendWarningToAdminChat: currentConfig.sendWarningToAdminChat,
      customCheckInMsg: currentConfig.customCheckInMsg,
      customCheckOutMsg: currentConfig.customCheckOutMsg,
      customWarningAttendanceMsg: currentConfig.customWarningAttendanceMsg,
      customWarningAdminMsg: currentConfig.customWarningAdminMsg,
    } : null,
    teams: configuredTeams,
    activeSessions: sessionsList,
    history: attendanceHistory,
    logs: liveLogs.slice(0, 50),
  });
});

// Helper to identify and authenticate the requesting user
function getRequester(req: express.Request): UserAccount | null {
  const reqId = (req.headers['x-user-id'] as string) || (req.body && req.body.requesterId) || (req.query && (req.query.requesterId as string));
  if (!reqId) return null;
  return userAccounts.find((u) => u.id === reqId) || null;
}

app.post('/api/bot/settings', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageSettings && !requester.permissions?.manageBot)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لتعديل إعدادات البوت.' });
  }

  const newSettings = req.body;
  if (!newSettings) {
    return res.status(400).json({ error: 'إعدادات غير صحيحة' });
  }

  if (!currentConfig) {
    currentConfig = {
      token: '',
      checkMinutes: Number(newSettings.checkMinutes) || 5,
      checkInCmd: newSettings.checkInCmd || 'د',
      checkOutCmd: newSettings.checkOutCmd || 'خ',
      teams: configuredTeams,
    };
  }

  currentConfig = {
    ...currentConfig,
    ...newSettings,
    checkMinutes: Number(newSettings.checkMinutes) || currentConfig.checkMinutes || 5,
    checkInCmd: newSettings.checkInCmd || currentConfig.checkInCmd || 'د',
    checkOutCmd: newSettings.checkOutCmd || currentConfig.checkOutCmd || 'خ',
    teams: configuredTeams,
  };

  saveStore();
  addLog('success', '💾 تم حفظ الإعدادات العامة وقوالب الرسائل على السيرفر بنجاح.');
  res.json({ success: true, config: currentConfig });
});

// Teams Management API Routes
app.get('/api/teams', (_req, res) => {
  res.json({ teams: configuredTeams });
});

app.post('/api/teams', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageTeams)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لتعديل الفرق.' });
  }

  const { teams } = req.body;
  if (Array.isArray(teams)) {
    configuredTeams = teams;
    saveStore();
    addLog('info', `✅ تم تحديث إعدادات كافة صفحات الفرق بنجاح (${configuredTeams.length} صفحة).`);
    return res.json({ success: true, teams: configuredTeams });
  }
  res.status(400).json({ error: 'صيغة الفرق غير صحيحة' });
});

app.post('/api/teams/save-one', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageTeams)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لتعديل أو حفظ هذا الفريق.' });
  }

  const updatedTeam = req.body as TeamConfig;
  if (!updatedTeam || !updatedTeam.id) {
    return res.status(400).json({ error: 'بيانات الفريق غير مكتملة' });
  }

  const idx = configuredTeams.findIndex((t) => t.id === updatedTeam.id);
  if (idx !== -1) {
    configuredTeams[idx] = { ...configuredTeams[idx], ...updatedTeam };
  } else {
    configuredTeams.push(updatedTeam);
  }

  saveStore();
  const vNotice = updatedTeam.targetVoiceChannelId?.trim() ? `روم الفويس: ${updatedTeam.targetVoiceChannelId}` : 'أي روم صوتي';
  addLog('success', `💾 تم حفظ إعدادات [${updatedTeam.name}] بنجاح (${vNotice} | إنذار لشات الإدارة: ${updatedTeam.logChannelId || 'غير محدد'}).`);
  res.json({ success: true, team: updatedTeam, teams: configuredTeams });
});

app.delete('/api/teams/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageTeams)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لحذف الفرق.' });
  }

  const teamId = req.params.id;
  configuredTeams = configuredTeams.filter((t) => t.id !== teamId);
  saveStore();
  addLog('info', `🗑️ تم حذف صفحة الفريق (ID: ${teamId}).`);
  res.json({ success: true, teams: configuredTeams });
});

// Authentication & Role Management API Routes
// 1. Get all registered users (passwords omitted)
app.get('/api/users', (_req, res) => {
  const safeUsers = userAccounts.map((u) => {
    const { password: _, ...rest } = u;
    return rest;
  });
  res.json({ users: safeUsers });
});

// 2. User Login: by username or ID + password
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم أو الآيدي مع كلمة المرور' });
  }

  const cleanIdent = String(identifier).trim().toLowerCase();
  const cleanPass = String(password).trim();

  const user = userAccounts.find(
    (u) =>
      (u.username.toLowerCase() === cleanIdent ||
       u.id.toLowerCase() === cleanIdent ||
       (u.gameUsername && u.gameUsername.toLowerCase() === cleanIdent) ||
       (u.discordUsername && u.discordUsername.toLowerCase() === cleanIdent) ||
       (u.discordId && u.discordId.toLowerCase() === cleanIdent)) &&
      u.password === cleanPass
  );

  if (!user) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة (تأكد من يوزر اللعبة في فايف ام أو اسم المستخدم وكلمة المرور)' });
  }

  user.lastLogin = Date.now();
  saveStore();
  addLog('info', `🔐 تسجيل دخول المستخدم: [${user.username}] (${user.roleTitle || user.role}).`);

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// 3. Register New Account: requires Discord Username, Game Username, Username/ID, and Password
app.post('/api/auth/register', (req, res) => {
  const { username, password, discordUsername, gameUsername, discordId } = req.body;

  if (!username?.trim() || !password?.trim() || !discordUsername?.trim() || !gameUsername?.trim()) {
    return res.status(400).json({
      error: 'جميع الحقول مطلوبة: اسم المستخدم، كلمة المرور، يوزر الديسكورد، ويوزر اللعبة',
    });
  }

  const cleanUser = String(username).trim();
  const exists = userAccounts.some(
    (u) => u.username.toLowerCase() === cleanUser.toLowerCase() || u.id.toLowerCase() === cleanUser.toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ error: 'اسم المستخدم أو الآيدي مسجل مسبقاً، اختر اسماً آخر' });
  }

  // New accounts default to 'member' role with baseline read permissions until the Owner grants roles
  const newUser: UserAccount = {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUser,
    password: String(password).trim(),
    discordUsername: String(discordUsername).trim(),
    discordId: discordId ? String(discordId).trim() : undefined,
    gameUsername: String(gameUsername).trim(),
    role: 'member',
    roleTitle: 'عضو مسجل (بانتظار الرتبة)',
    permissions: {
      manageTeams: false,
      manageBot: false,
      viewHistory: true,
      clearHistory: false,
      manageSettings: false,
      manageUsers: false,
    },
    allowedTeamIds: ['*'], // Default can access all, owner can restrict to specific teams
    createdAt: Date.now(),
    lastLogin: Date.now(),
  };

  userAccounts.push(newUser);
  saveStore();
  addLog('success', `✨ تم إنشاء حساب جديد: [${newUser.username}] | ديسكورد: ${newUser.discordUsername} | اللعبة: ${newUser.gameUsername}.`);

  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// 4. Update User Role & Permissions (Leader/Owner or users with manageUsers permission)
app.put('/api/users/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageUsers)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لتعديل رولات وصلاحيات الأعضاء.' });
  }

  const userId = req.params.id;
  const { role, roleTitle, permissions, allowedTeamIds } = req.body;

  const target = userAccounts.find((u) => u.id === userId);
  if (!target) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  // Prevent modifying the owner account unless the requester is the owner
  if (target.role === 'owner' && requester.role !== 'owner') {
    return res.status(403).json({ error: 'لا يمكن لغير صاحب الموقع تعديل بيانات القائد أو رتبته.' });
  }

  if (role) {
    // Only owner can create another owner
    if (role === 'owner' && requester.role !== 'owner') {
      return res.status(403).json({ error: 'لا يمكن ترقية عضو لرتبة المالك إلا من قِبل المالك فقط.' });
    }
    target.role = role;
  }
  if (roleTitle !== undefined) {
    target.roleTitle = roleTitle;
  }
  if (permissions && typeof permissions === 'object') {
    target.permissions = { ...target.permissions, ...permissions };
  }
  if (allowedTeamIds !== undefined) {
    target.allowedTeamIds = Array.isArray(allowedTeamIds) ? allowedTeamIds : ['*'];
  }

  saveStore();
  addLog('info', `👑 تم تحديث رتبة وصلاحيات وتخصيص فرق المستخدم [${target.username}] إلى (${target.roleTitle || target.role}).`);
  
  const { password: _, ...safeUser } = target;
  res.json({ success: true, user: safeUser, users: userAccounts.map(({ password: _, ...u }) => u) });
});

// 5. Delete User Account
app.delete('/api/users/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageUsers)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لحذف حسابات الأعضاء.' });
  }

  const userId = req.params.id;
  const target = userAccounts.find((u) => u.id === userId);
  if (!target) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }
  if (target.role === 'owner') {
    return res.status(403).json({ error: 'لا يمكن حذف حساب المالك / صاحب الموقع' });
  }

  userAccounts = userAccounts.filter((u) => u.id !== userId);
  saveStore();
  addLog('info', `🗑️ تم حذف حساب المستخدم [${target.username}].`);
  res.json({ success: true, users: userAccounts.map(({ password: _, ...u }) => u) });
});

app.post('/api/bot/stop', async (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageBot)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لإيقاف البوت.' });
  }

  try {
    if (discordClient) {
      // Clear timeouts
      for (const session of activeSessions.values()) {
        if (session.timeoutId) clearTimeout(session.timeoutId);
      }
      activeSessions.clear();
      await discordClient.destroy();
      discordClient = null;
    }
    botStatus = {
      isRunning: false,
      tag: '',
      id: '',
      avatar: '',
      guildsCount: 0,
      startedAt: 0,
    };
    addLog('info', 'تم إيقاف البوت بنجاح.');
    res.json({ success: true, message: 'تم إيقاف البوت' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    addLog('error', `فشل إيقاف البوت: ${errorMsg}`);
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/api/bot/clear-history', (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.clearHistory)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لمسح سجل التقارير.' });
  }

  attendanceHistory = [];
  saveStore();
  addLog('info', 'تم مسح سجل التقارير تلقائياً وتحديث التخزين.');
  res.json({ success: true, message: 'تم مسح السجل بنجاح' });
});

// 10-Second Cooldown Tracker to prevent spamming 'د خ د خ'
const userCommandCooldowns = new Map<string, number>();

// Core Check-In Handler
async function processCheckIn(
  userId: string,
  userTag: string,
  userName: string,
  userAvatar: string,
  member: unknown,
  channel: unknown,
  reply: (content: string) => Promise<unknown>,
  team?: TeamConfig
) {
  const nowTime = Date.now();
  const lastAction = userCommandCooldowns.get(userId) || 0;
  const elapsed = nowTime - lastAction;
  if (elapsed < 10000) {
    const remainingSecs = Math.ceil((10000 - elapsed) / 1000);
    await reply(`⏳ **مهلاً <@${userId}>!** يرجى الانتظار **${remainingSecs} ثوانٍ** قبل تسجيل عملية جديدة (تم تفعيل منع التكرار السريع 10 ثوانٍ).`);
    return;
  }
  userCommandCooldowns.set(userId, nowTime);

  if (activeSessions.has(userId)) {
    const active = activeSessions.get(userId);
    await reply(`⚠️ أنت مسجل دخولك بالفعل في **${active?.teamName || 'النظام'}**! اكتب **${team?.checkOutCmd || currentConfig?.checkOutCmd || 'خ'}** لتسجيل الخروج.`);
    return;
  }

  const voiceMember = member as { voice?: { channelId?: string; channel?: { name?: string } } } | null;
  const currentVoiceChannelId = voiceMember?.voice?.channelId;
  const targetVoiceId = team?.targetVoiceChannelId?.trim() || currentConfig?.targetVoiceChannelId?.trim() || '';
  
  // Check if currently in required voice
  const isCurrentlyInVoice = Boolean(currentVoiceChannelId);
  const isInTargetVoice = targetVoiceId ? currentVoiceChannelId === targetVoiceId : isCurrentlyInVoice;
  const voiceChannelName = voiceMember?.voice?.channel?.name;
  const now = Date.now();

  const teamTitle = team?.name || 'فريق العمل';
  addLog('info', `[تسجيل دخول] العضو ${userTag} بدأ شفت (${teamTitle}). التواجد الصوتي الحالي: ${isCurrentlyInVoice ? 'متواجد في ' + voiceChannelName : 'خارج الفويس'}.`);

  const checkMins = team?.checkMinutes || currentConfig?.checkMinutes || 5;
  const timeoutDuration = checkMins * 60 * 1000;

  const timeoutId = setTimeout(async () => {
    try {
      const session = activeSessions.get(userId);
      if (!session) return;

      const guild = (channel as { guild?: { members?: { fetch: (id: string) => Promise<{ voice?: { channelId?: string; channel?: { name?: string } } }> } } })?.guild;
      const freshMember = await guild?.members?.fetch(userId).catch(() => null);
      const freshVoiceId = freshMember?.voice?.channelId;
      const freshVoiceName = freshMember?.voice?.channel?.name;

      // Check condition: must be in specific targetVoiceChannelId if defined, or any voice channel if empty
      let inTargetVoice = false;
      if (session.targetVoiceChannelId && session.targetVoiceChannelId.trim() !== '') {
        inTargetVoice = freshVoiceId === session.targetVoiceChannelId.trim();
      } else {
        inTargetVoice = Boolean(freshVoiceId);
      }

      if (!inTargetVoice) {
        session.warned = true;
        session.warnCount += 1;
        saveStore();

        addLog('warn', `🚨 [إنذار فويس] مرت ${checkMins} دقائق والعضو ${userTag} ليس في روم الفويس المطلوب (${session.teamName || 'العام'}). جاري إرسال إنذار لشات الإدارة.`);

        // 1. Send Automatic Warning to Admin / Management Chat (شات الإدارة)
        const adminChannelId = session.logChannelId || currentConfig?.logChannelId;
        if (adminChannelId && discordClient) {
          try {
            const adminChannel = await discordClient.channels.fetch(adminChannelId).catch(() => null);
            if (adminChannel && adminChannel.isTextBased()) {
              const reqVoiceText = session.targetVoiceChannelId?.trim() 
                ? `<#${session.targetVoiceChannelId.trim()}>` 
                : 'أي روم صوتي';
              const curVoiceText = freshVoiceId 
                ? `<#${freshVoiceId}> (${freshVoiceName})` 
                : '❌ غير متواجد بأي روم صوتي نهائياً';
              const checkInTimeStr = new Date(session.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });

              const warnEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(`🚨 إنذار فويس تلقائي: ${session.teamName || 'فريق العمل'}`)
                .setDescription(`تم رصد عدم التواجد في الروم الصوتي المطلوب بعد انتهاء مهلة الـ **${checkMins} دقائق**!`)
                .setThumbnail(userAvatar)
                .addFields(
                  { name: '👤 العضو المخالف', value: `<@${userId}> (${userTag})`, inline: true },
                  { name: '🏢 الفريق / المهمة', value: session.teamName || 'عام', inline: true },
                  { name: '⚠️ حالة الإنذار', value: `🔴 **مسجل عليه إنذار رقم ${session.warnCount}**`, inline: true },
                  { name: '🎙️ الروم الصوتي المطلوب', value: reqVoiceText, inline: true },
                  { name: '🔊 المكان الحالي للعضو', value: curVoiceText, inline: true },
                  { name: '⏰ وقت تسجيل الدخول', value: checkInTimeStr, inline: true }
                )
                .setFooter({ text: 'نظام المراقبة والإنذارات الآلية للأطقم', iconURL: discordClient.user?.displayAvatarURL() })
                .setTimestamp();

              let adminContent = team?.customWarningAdminMsg?.trim() || currentConfig?.customWarningAdminMsg?.trim();
              if (adminContent) {
                adminContent = replaceMessageVars(adminContent, {
                  user: `<@${userId}>`,
                  userTag,
                  userName: session.userName,
                  team: session.teamName || 'فريق العمل',
                  minutes: String(checkMins),
                  voiceChannel: reqVoiceText,
                  warnCount: String(session.warnCount),
                });
              } else {
                adminContent = `🚨 **تنبيه إداري:** العضو <@${userId}> عليه إنذار رسمي لعدم تواجده في روم الفويس المطلوب!`;
              }

              await (adminChannel as { send: (options: unknown) => Promise<unknown> }).send({
                content: adminContent,
                embeds: [warnEmbed],
              });
              addLog('success', `✅ تم إرسال إشعار الإنذار بنجاح إلى شات الإدارة (<#${adminChannelId}>).`);
            }
          } catch (adminErr) {
            console.error('Error sending alert to admin chat:', adminErr);
          }
        }

        // 2. Send notice in attendance channel to inform member (ONLY IF ENABLED)
        // User request: "او اني ما اخليه يرسل مثلا في شات تسجيل الدخول الانذار"
        const sendWarningToAttendance = team?.sendWarningToAttendanceChat ?? (currentConfig?.sendWarningToAttendanceChat ?? false);
        if (sendWarningToAttendance) {
          const textChannel = channel as { send: (options: unknown) => Promise<unknown> };
          if (textChannel?.send) {
            const voiceNotice = session.targetVoiceChannelId?.trim()
              ? `روم الفويس المطلوب (<#${session.targetVoiceChannelId.trim()}>)`
              : 'الروم الصوتي';

            let warnAttendanceContent = team?.customWarningAttendanceMsg?.trim() || currentConfig?.customWarningAttendanceMsg?.trim();
            if (warnAttendanceContent) {
              warnAttendanceContent = replaceMessageVars(warnAttendanceContent, {
                user: `<@${userId}>`,
                userTag,
                userName: session.userName,
                team: session.teamName || 'الفريق',
                minutes: String(checkMins),
                voiceNotice,
                voiceChannel: voiceNotice,
                warnCount: String(session.warnCount),
              });
            } else {
              warnAttendanceContent = `⚠️ **إنذار فويس!** <@${userId}>\nمرت **${checkMins} دقائق** على تسجيل دخولك في **${session.teamName || 'الفريق'}** ولست متواجداً في ${voiceNotice}!\n🔴 **تم تقييد إنذار رسمي عليك وإرسال بلاغ لشات الإدارة.**`;
            }

            await textChannel.send({
              content: warnAttendanceContent,
            });
            addLog('info', `📢 تم إرسال تنبيه الإنذار في شات الحضور للعضو ${userTag}.`);
          }
        } else {
          addLog('info', `🔕 تم تخطي إرسال الإنذار في شات الحضور (تم إلغاء التفعيل حسب الإعدادات) واقتصر الإرسال على شات الإدارة.`);
        }
      } else {
        addLog('success', `✅ [فحص ناجح] العضو ${userTag} متواجد في روم الفويس المطلوب (${freshVoiceName}) لـ (${session.teamName}) بعد مهلة الـ ${checkMins} د.`);
      }
    } catch (err) {
      console.error('Error during voice check timeout:', err);
    }
  }, timeoutDuration);

  activeSessions.set(userId, {
    userId,
    userTag,
    userName,
    userAvatar,
    teamId: team?.id,
    teamName: team?.name,
    targetVoiceChannelId: targetVoiceId,
    logChannelId: team?.logChannelId || currentConfig?.logChannelId,
    checkInTime: now,
    voiceStartTime: isInTargetVoice ? now : null,
    totalVoiceMs: 0,
    timeoutId,
    warned: false,
    warnCount: 0,
    currentlyInVoice: isCurrentlyInVoice,
    voiceChannelName,
  });

  const voiceTargetMention = targetVoiceId ? ` في <#${targetVoiceId}>` : '';
  let checkInReply = team?.customCheckInMsg?.trim() || currentConfig?.customCheckInMsg?.trim();
  if (checkInReply) {
    checkInReply = replaceMessageVars(checkInReply, {
      user: `<@${userId}>`,
      userTag,
      userName,
      team: teamTitle,
      minutes: String(checkMins),
      voiceChannel: voiceTargetMention || 'الروم الصوتي',
    });
  } else {
    checkInReply = `✅ **تم تسجيل دخولك بنجاح في [${teamTitle}]!**\n⏱️ سيتم التحقق من تواجدك في الروم الصوتي${voiceTargetMention} بعد **${checkMins} دقائق**.\n⚠️ *في حال عدم تواجدك، سيتم إرسال إنذار فوري لشات الإدارة.*`;
  }
  await reply(checkInReply);
}

// Core Check-Out Handler
async function processCheckOut(
  userId: string,
  userTag: string,
  userAvatar: string,
  reply: (content: string) => Promise<unknown>,
  team?: TeamConfig
) {
  const nowTime = Date.now();
  const lastAction = userCommandCooldowns.get(userId) || 0;
  const elapsed = nowTime - lastAction;
  if (elapsed < 10000) {
    const remainingSecs = Math.ceil((10000 - elapsed) / 1000);
    await reply(`⏳ **مهلاً <@${userId}>!** يرجى الانتظار **${remainingSecs} ثوانٍ** قبل تسجيل عملية جديدة (تم تفعيل منع التكرار السريع 10 ثوانٍ).`);
    return;
  }
  userCommandCooldowns.set(userId, nowTime);

  const session = activeSessions.get(userId);
  if (!session) {
    await reply(`❌ لست مسجل دخولك حالياً! اكتب **${team?.checkInCmd || currentConfig?.checkInCmd || 'د'}** لتسجيل الدخول أولاً.`);
    return;
  }

  const now = Date.now();
  if (session.timeoutId) clearTimeout(session.timeoutId);

  let finalVoiceMs = session.totalVoiceMs;
  if (session.voiceStartTime) {
    finalVoiceMs += (now - session.voiceStartTime);
  }

  const totalShiftMs = now - session.checkInTime;
  const formattedVoice = formatDurationArabic(finalVoiceMs);
  const formattedTotal = formatDurationArabic(totalShiftMs);

  activeSessions.delete(userId);

  attendanceHistory.unshift({
    id: `hist-${Date.now()}`,
    userId,
    userName: session.userName,
    userTag: session.userTag,
    userAvatar: session.userAvatar,
    teamId: session.teamId || team?.id,
    teamName: session.teamName || team?.name || 'عام',
    checkInTime: session.checkInTime,
    checkOutTime: now,
    totalShiftMs,
    totalVoiceMs: finalVoiceMs,
    warnCount: session.warnCount,
  });
  saveStore();

  const teamTitle = session.teamName || team?.name || 'فريق العمل';
  addLog('info', `[تسجيل خروج] العضو ${userTag} أنهى شفت (${teamTitle}). مدة الفويس: ${formattedVoice} من إجمالي: ${formattedTotal}.`);

  let checkOutReply = team?.customCheckOutMsg?.trim() || currentConfig?.customCheckOutMsg?.trim();
  if (checkOutReply) {
    checkOutReply = replaceMessageVars(checkOutReply, {
      user: `<@${userId}>`,
      userTag,
      userName: session.userName,
      team: teamTitle,
      voiceDuration: formattedVoice,
      totalDuration: formattedTotal,
    });
  } else {
    checkOutReply = `👋 **تم تسجيل خروجك بنجاح من [${teamTitle}]!** شكراً لجهودك.`;
  }
  await reply(checkOutReply);

  // Send embed to log channel
  const targetLogChannelId = session.logChannelId || team?.logChannelId || currentConfig?.logChannelId;
  if (targetLogChannelId && discordClient) {
    try {
      const logChannel = await discordClient.channels.fetch(targetLogChannelId).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const checkInTimeStr = new Date(session.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
        const checkOutTimeStr = new Date(now).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });

        const embed = new EmbedBuilder()
          .setColor(finalVoiceMs > 0 ? 0x5865F2 : 0xED4245)
          .setTitle(`📋 تقرير انصراف وحضور: ${teamTitle}`)
          .setThumbnail(userAvatar)
          .addFields(
            { name: '👤 العضو', value: `<@${userId}> (${userTag})`, inline: true },
            { name: '🏢 الفريق / القسم', value: teamTitle, inline: true },
            { name: '🟢 وقت تسجيل الدخول', value: checkInTimeStr, inline: true },
            { name: '🔴 وقت تسجيل الخروج', value: checkOutTimeStr, inline: true },
            { name: '🎙️ مدة التواجد في الفويس', value: `**${formattedVoice}**`, inline: false },
            { name: '⏱️ إجمالي مدة الشفت', value: formattedTotal, inline: true },
            { 
              name: '⚠️ حالة الالتزام والإنذارات', 
              value: session.warnCount > 0 
                ? `⚠️ مسجل عليه ${session.warnCount} إنذار لعدم دخول الفويس` 
                : (finalVoiceMs > 0 ? '✅ ملتزم بالفويس تماماً' : '❌ لم يدخل الروم الصوتي نهائياً'), 
              inline: true 
            }
          )
          .setFooter({ text: 'نظام مراقبة حضور وانصراف الفويس', iconURL: discordClient.user?.displayAvatarURL() })
          .setTimestamp();

        await (logChannel as { send: (options: unknown) => Promise<unknown> }).send({ embeds: [embed] });
        addLog('success', `📋 تم إرسال تقرير الفويس بنجاح إلى شات الإدارة (<#${targetLogChannelId}>).`);
      }
    } catch (err) {
      console.error('Error posting embed to log channel:', err);
    }
  }
}

// Attach Event Listeners to Client
function attachClientListeners(client: Client) {
  client.once('ready', async () => {
    botStatus = {
      isRunning: true,
      tag: client.user?.tag || '',
      id: client.user?.id || '',
      avatar: client.user?.displayAvatarURL() || '',
      guildsCount: client.guilds.cache.size,
      startedAt: Date.now(),
    };
    addLog('success', `✅ اتصل البوت بنجاح في تطبيق ديسكورد كـ: ${client.user?.tag} في ${client.guilds.cache.size} سيرفر!`);

    // Register slash commands /د and /خ
    try {
      await client.application?.commands.set([
        {
          name: 'د',
          description: 'تسجيل الدخول في شفت الحضور والتحقق من التواجد في الفويس',
        },
        {
          name: 'خ',
          description: 'تسجيل الخروج وإنهاء الشفت وإرسال تقرير الفويس للإدارة',
        },
      ]);
      addLog('info', '⚡ تم تفعيل أوامر السلاش (/د و /خ) وأوامر الشات المباشرة بنجاح.');
    } catch (cmdErr) {
      console.error('Slash commands registration note:', cmdErr);
    }
  });

  // Handle Slash Commands (Always work with or without privileged intents!)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, channelId } = interaction;
    const member = interaction.member;

    // Find which team this channel or interaction belongs to
    let targetTeam = configuredTeams.find(
      (t) => t.enabled && t.attendanceChannelId && t.attendanceChannelId.trim() === channelId
    );
    if (!targetTeam) {
      targetTeam = configuredTeams[0];
    }

    if (commandName === 'د') {
      await interaction.deferReply();
      await processCheckIn(
        user.id,
        user.tag,
        user.username,
        user.displayAvatarURL(),
        member,
        interaction.channel,
        async (msg) => interaction.editReply(msg),
        targetTeam
      );
    } else if (commandName === 'خ') {
      await interaction.deferReply();
      await processCheckOut(
        user.id,
        user.tag,
        user.displayAvatarURL(),
        async (msg) => interaction.editReply(msg),
        targetTeam
      );
    }
  });

  // Handle Text Messages (د and خ)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channel.id;

    // Match which team this message's channel belongs to
    let matchedTeam = configuredTeams.find(
      (t) => t.enabled && t.attendanceChannelId && t.attendanceChannelId.trim() === channelId
    );

    // Fallback: If no team configured this specific channel
    if (!matchedTeam) {
      if (currentConfig?.attendanceChannelId && currentConfig.attendanceChannelId.trim() === channelId) {
        matchedTeam = configuredTeams[0];
      } else {
        // If there's an enabled team with an empty attendance channel, allow it
        const fallbackTeam = configuredTeams.find(
          (t) => t.enabled && (!t.attendanceChannelId || t.attendanceChannelId.trim() === '')
        );
        if (!currentConfig?.attendanceChannelId && fallbackTeam) {
          matchedTeam = fallbackTeam;
        } else {
          return; // Ignore message outside configured channels
        }
      }
    }

    let raw = (message.content || '').trim();
    const botId = client.user?.id;
    // Allow mention prefix e.g. <@123> د
    if (botId && raw.includes(`<@${botId}>`)) {
      raw = raw.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
    }

    const checkIn = matchedTeam?.checkInCmd || currentConfig?.checkInCmd || 'د';
    const checkOut = matchedTeam?.checkOutCmd || currentConfig?.checkOutCmd || 'خ';

    if (raw === checkIn) {
      await processCheckIn(
        message.author.id,
        message.author.tag,
        message.author.username,
        message.author.displayAvatarURL(),
        message.member,
        message.channel,
        async (msg) => message.reply(msg),
        matchedTeam
      );
    } else if (raw === checkOut) {
      await processCheckOut(
        message.author.id,
        message.author.tag,
        message.author.displayAvatarURL(),
        async (msg) => message.reply(msg),
        matchedTeam
      );
    }
  });

  // Handle Voice Channel Movements
  client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;
    const session = activeSessions.get(userId);
    if (!session) return;

    const now = Date.now();
    const joinedVoice = !oldState.channelId && Boolean(newState.channelId);
    const leftVoice = Boolean(oldState.channelId) && !newState.channelId;

    if (joinedVoice) {
      session.voiceStartTime = now;
      session.currentlyInVoice = true;
      session.voiceChannelName = newState.channel?.name;
      addLog('info', `🎙️ [دخول فويس] العضو ${session.userTag} انضم إلى الروم الصوتي: ${newState.channel?.name}.`);
    } else if (leftVoice) {
      if (session.voiceStartTime) {
        session.totalVoiceMs += (now - session.voiceStartTime);
        session.voiceStartTime = null;
      }
      session.currentlyInVoice = false;
      session.voiceChannelName = undefined;
      addLog('info', `🔇 [خروج فويس] العضو ${session.userTag} غادر الروم الصوتي. مدة الفويس المسجلة: ${formatDurationArabic(session.totalVoiceMs)}.`);
    } else if (oldState.channelId !== newState.channelId) {
      session.voiceChannelName = newState.channel?.name;
    }
  });
}

async function startBotClient(token: string): Promise<{ success: boolean; message: string }> {
  let cleanToken = String(token || '').trim();
  cleanToken = cleanToken.replace(/^["'`]|["'`]$/g, '').trim();
  if (cleanToken.startsWith('Bot ')) cleanToken = cleanToken.slice(4).trim();
  if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7).trim();
  cleanToken = cleanToken.replace(/[\u200B-\u200D\uFEFF]/g, '');

  if (!cleanToken) {
    throw new Error('يرجى إدخال توكن البوت (Bot Token)');
  }

  // Stop previous client if running
  if (discordClient) {
    try {
      for (const session of activeSessions.values()) {
        if (session.timeoutId) clearTimeout(session.timeoutId);
      }
      activeSessions.clear();
      await discordClient.destroy();
      discordClient = null;
    } catch {
      // continue
    }
  }

  addLog('info', 'جاري محاولة الاتصال بديسكورد عبر التوكن المدخل...');

  // Attempt 1: Standard connection with MessageContent intent
  try {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [Partials.Message, Partials.Channel],
    });

    attachClientListeners(client);
    await client.login(cleanToken);
    discordClient = client;

    return {
      success: true,
      message: 'تم بدء البوت والاتصال بديسكورد بنجاح',
    };
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);

    // Check if error is Disallowed Intents (fallback)
    if (
      rawError.toLowerCase().includes('disallowed') ||
      rawError.toLowerCase().includes('intents') ||
      (err as { code?: number })?.code === 4014
    ) {
      addLog('warn', '⚠️ تعذر استخدام Message Content Intent. جاري الاتصال التلقائي بالوضع التوافقي...');

      try {
        const fallbackClient = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
          ],
          partials: [Partials.Message, Partials.Channel],
        });

        attachClientListeners(fallbackClient);
        await fallbackClient.login(cleanToken);
        discordClient = fallbackClient;

        addLog('success', '✅ تم الاتصال بنجاح بالوضع التوافقي! تعمل أوامر السلاش (/د و /خ) ومنشن البوت (@البوت د).');
        return {
          success: true,
          message: 'تم الاتصال بنجاح بالوضع التوافقي عبر أوامر السلاش ومنشن البوت',
        };
      } catch (fallbackErr: unknown) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        addLog('error', `❌ فشل الاتصال التوافقي: ${fallbackMsg}`);
        throw new Error(fallbackMsg);
      }
    }

    let userFriendlyError = rawError;
    if (rawError.toLowerCase().includes('invalid token') || rawError.includes('TOKEN_INVALID')) {
      userFriendlyError = 'التوكن المدخل غير صحيح (An invalid token was provided). تأكد أنك نسخت Bot Token من قسم Bot بالضغط على Reset Token، وليس Client Secret أو Application ID.';
    }

    addLog('error', `❌ فشل الاتصال بديسكورد: ${userFriendlyError}`);
    throw new Error(userFriendlyError);
  }
}

app.post('/api/bot/start', async (req, res) => {
  const requester = getRequester(req);
  if (!requester || (requester.role !== 'owner' && !requester.permissions?.manageBot)) {
    return res.status(403).json({ error: 'عذراً، لا تملك رول أو صلاحية لتشغيل البوت.' });
  }

  const { token, attendanceChannelId, logChannelId, targetVoiceChannelId, checkMinutes = 5, checkInCmd = 'د', checkOutCmd = 'خ' } = req.body;

  let cleanToken = String(token || '').trim();
  cleanToken = cleanToken.replace(/^["'`]|["'`]$/g, '').trim();
  if (cleanToken.startsWith('Bot ')) cleanToken = cleanToken.slice(4).trim();
  if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7).trim();
  cleanToken = cleanToken.replace(/[\u200B-\u200D\uFEFF]/g, '');

  const envToken = process.env.DISCORD_BOT_TOKEN ? String(process.env.DISCORD_BOT_TOKEN).trim().replace(/^["'`]|["'`]$/g, '') : '';
  const tokenToUse = cleanToken || envToken || currentConfig?.token || '';

  if (!tokenToUse) {
    return res.status(400).json({ error: 'يرجى إدخال توكن البوت أو التأكد من إضافته في متغير البيئة DISCORD_BOT_TOKEN' });
  }

  currentConfig = {
    token: tokenToUse,
    attendanceChannelId: attendanceChannelId?.trim() || undefined,
    targetVoiceChannelId: targetVoiceChannelId?.trim() || undefined,
    logChannelId: logChannelId?.trim() || undefined,
    checkMinutes: Number(checkMinutes) || 5,
    checkInCmd: checkInCmd?.trim() || 'د',
    checkOutCmd: checkOutCmd?.trim() || 'خ',
    teams: configuredTeams,
  };
  saveStore();

  try {
    const result = await startBotClient(tokenToUse);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: message });
  }
});

// Vite Middleware mounting
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);

    // Auto-connect if token is available in process.env.DISCORD_BOT_TOKEN or storage
    const envToken = process.env.DISCORD_BOT_TOKEN ? String(process.env.DISCORD_BOT_TOKEN).trim().replace(/^["'`]|["'`]$/g, '') : '';
    const bootToken = envToken || (currentConfig && currentConfig.token);
    if (bootToken && !discordClient) {
      console.log('Found Discord Bot Token in environment (DISCORD_BOT_TOKEN), auto-connecting to Discord...');
      startBotClient(bootToken).catch((err) => {
        console.error('Auto-connect on boot note:', err.message);
      });
    }
  });
}

startServer();
