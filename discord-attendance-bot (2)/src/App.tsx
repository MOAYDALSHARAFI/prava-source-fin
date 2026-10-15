import { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { TeamPagesManager } from './components/TeamPagesManager';
import { LiveBotRunner } from './components/LiveBotRunner';
import { ActiveShiftsTable } from './components/ActiveShiftsTable';
import { ShiftHistory } from './components/ShiftHistory';
import { BotSettings } from './components/BotSettings';
import { RoleManager } from './components/RoleManager';
import { DeveloperVault } from './components/DeveloperVault';
import { AuthModal } from './components/AuthModal';
import { 
  BotConfiguration, 
  AttendanceSession, 
  TeamDepartment, 
  UserAccount 
} from './types/attendance';

// Default configuration with 5 teams
const DEFAULT_CONFIG: BotConfiguration = {
  checkInCommand: 'د',
  checkOutCommand: 'خ',
  checkTimerMinutes: 5,
  attendanceChannelId: 'c-attendance',
  staffLogChannelId: 'c-staff-log',
  warningMessage: '⚠️ **إنذار فويس!** {user}\nمرت {minutes} دقائق على تسجيل دخولك في {team} ولست متواجداً بالفويس!',
  checkInSuccessMessage: '✅ تم تسجيل دخولك بنجاح في [{team}]! سيتم التحقق من تواجدك في {voiceChannel} بعد {minutes} دقائق.',
  checkOutSuccessMessage: '👋 تم تسجيل خروجك بنجاح من [{team}]! شكراً لجهودك.',
  warningAdminMessage: '🚨 تنبيه إداري: العضو {user} عليه إنذار رسمي لعدم تواجده في روم الفويس المطلوب!',
  sendWarningToAttendanceChat: false,
  sendWarningToAdminChat: true,
  soundEnabled: true,
  strictVoiceTracking: true,
};

// 5 Dedicated Departments / Pages for Brava FiveM & Discord
const DEFAULT_TEAMS: TeamDepartment[] = [
  {
    id: 'team-scenario',
    name: 'فريق السيناريو (Scenario Team)',
    description: 'إدارة وتنسيق سيناريوهات السيرفر والتحقق من تواجد الأعضاء بالروم الصوتي',
    color: '#5865F2',
    attendanceChannelId: '',
    targetVoiceChannelId: '',
    logChannelId: '',
    checkInCmd: 'د',
    checkOutCmd: 'خ',
    checkMinutes: 5,
    enabled: true,
    sendWarningToAttendanceChat: false,
    sendWarningToAdminChat: true,
    customCheckInMsg: '🎬 تم تسجيل دخولك في فريق السيناريو! يرجى التواجد بروم الفويس المخصص.',
    customCheckOutMsg: '👋 تم تسجيل خروجك من فريق السيناريو بنجاح. شكراً لجهودك.',
    customWarningAttendanceMsg: '⚠️ إنذار سيناريو: {user} لم يتم رصدك بروم الفويس المخصص!',
    customWarningAdminMsg: '🚨 إنذار رسمي: عضو فريق السيناريو {user} غير متواجد بالروم الصوتي!',
  },
  {
    id: 'team-support',
    name: 'فريق الدعم الفني (Support Team)',
    description: 'استقبال تذاكر اللاعبين وحل المشاكل التقنية مع الفحص الصوتي',
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
    id: 'team-police',
    name: 'فريق الشرطة والأمن (Police Department)',
    description: 'شفتات الضباط وتتبع تواجد الدوريات في الرومات الميدانية',
    color: '#3BA55D',
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
    description: 'متابعة شفتات المشرفين والتحقق من التواجد في روم الإدارة المباشر',
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
    description: 'تنسيق الفعاليات الأسبوعية وتتبع حضور المنظمين بالروم الصوتي',
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

// History starts completely clean with ZERO fake records
const INITIAL_HISTORY: AttendanceSession[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<'teams' | 'live-bot' | 'active-shifts' | 'history' | 'settings' | 'roles' | 'developer'>('teams');
  const [teams, setTeams] = useState<TeamDepartment[]>(DEFAULT_TEAMS);
  const [config, setConfig] = useState<BotConfiguration>(DEFAULT_CONFIG);
  const [activeSessions, setActiveSessions] = useState<Map<string, AttendanceSession>>(new Map());
  const [history, setHistory] = useState<AttendanceSession[]>(INITIAL_HISTORY);
  const [isRealBotRunning, setIsRealBotRunning] = useState<boolean>(false);

  // Authentication State: null if logged out, opens AuthModal gateway on site visit
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('site_logged_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('site_logged_user');
      return !saved; // Open the login gateway automatically if not logged in
    } catch {
      return true;
    }
  });
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('team-scenario');

  // Role Permissions
  const isOwner = currentUser?.role === 'owner';
  const canAccessSettings = Boolean(currentUser && (isOwner || currentUser.permissions?.manageSettings || currentUser.permissions?.manageBot));
  const canAccessRoles = Boolean(currentUser && (isOwner || currentUser.permissions?.manageUsers));

  const handleOpenAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('site_logged_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('site_logged_user');
      localStorage.removeItem('bot_saved_password');
      localStorage.removeItem('bot_saved_game_user');
      localStorage.removeItem('bot_saved_username');
      localStorage.removeItem('bot_saved_identifier');
      localStorage.removeItem('bot_remember_me');
    } catch {
      // ignore
    }
    // Return to teams tab to prevent lingering in protected tabs
    setActiveTab('teams');
    handleOpenAuthModal('login');
  };

  // Sync with real server bot state
  useEffect(() => {
    const checkBot = async () => {
      try {
        const res = await fetch('/api/bot/status');
        if (res.ok) {
          const data = await res.json();
          setIsRealBotRunning(Boolean(data.isRunning));
          
          // Auto-sync real persistent history from server
          if (Array.isArray(data.history)) {
            setHistory(data.history);
          }

          // Auto-sync teams configured on server only when genuinely changed
          if (Array.isArray(data.teams) && data.teams.length > 0) {
            setTeams((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(data.teams)) {
                return data.teams;
              }
              return prev;
            });
          }

          // Auto-sync global bot message config from server
          if (data.config) {
            setConfig((prev) => {
              const updated = {
                ...prev,
                checkInCommand: data.config.checkInCmd || prev.checkInCommand,
                checkOutCommand: data.config.checkOutCmd || prev.checkOutCommand,
                checkTimerMinutes: data.config.checkMinutes || prev.checkTimerMinutes,
                warningMessage: data.config.customWarningAttendanceMsg || prev.warningMessage,
                checkInSuccessMessage: data.config.customCheckInMsg || prev.checkInSuccessMessage,
                checkOutSuccessMessage: data.config.customCheckOutMsg || prev.checkOutSuccessMessage,
                warningAdminMessage: data.config.customWarningAdminMsg || prev.warningAdminMessage,
                sendWarningToAttendanceChat: data.config.sendWarningToAttendanceChat ?? prev.sendWarningToAttendanceChat,
                sendWarningToAdminChat: data.config.sendWarningToAdminChat ?? prev.sendWarningToAdminChat,
              };
              if (JSON.stringify(prev) !== JSON.stringify(updated)) {
                return updated;
              }
              return prev;
            });
          }

          // If real active sessions exist on Discord server, sync them
          if (Array.isArray(data.activeSessions) && data.activeSessions.length > 0) {
            const serverSessions = new Map<string, AttendanceSession>();
            data.activeSessions.forEach((s: {
              userId: string;
              userName: string;
              userTag: string;
              userAvatar: string;
              teamId?: string;
              teamName?: string;
              targetVoiceChannelId?: string;
              logChannelId?: string;
              checkInTime: number;
              totalVoiceMs: number;
              warnCount: number;
              currentlyInVoice: boolean;
            }) => {
              serverSessions.set(s.userId, {
                id: `session-${s.userId}`,
                userId: s.userId,
                userName: s.userName,
                userTag: s.userTag,
                userAvatar: s.userAvatar,
                channelId: 'c-attendance',
                teamId: s.teamId,
                teamName: s.teamName,
                targetVoiceChannelId: s.targetVoiceChannelId,
                checkInTime: s.checkInTime || Date.now(),
                initialVoiceStatus: s.currentlyInVoice,
                voiceCheckPassed: s.currentlyInVoice ? true : (s.warnCount > 0 ? false : null),
                warnCount: s.warnCount || 0,
                inVoiceCurrently: s.currentlyInVoice,
                voiceIntervals: [],
                totalVoiceMs: s.totalVoiceMs || 0,
                status: 'active',
              });
            });
            setActiveSessions(serverSessions);
          }
        }
      } catch {
        // server might not be ready yet
      }
    };

    checkBot();
    const interval = setInterval(checkBot, 3000);
    return () => clearInterval(interval);
  }, []);

  // Team Management Handlers with user identification
  const handleUpdateTeam = async (updatedTeam: TeamDepartment) => {
    try {
      const res = await fetch('/api/teams/save-one', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify(updatedTeam),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.teams)) {
          setTeams(data.teams);
        } else {
          setTeams((prev) => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
        }
      } else {
        alert(data.error || 'عذراً، ليس لديك الصلاحية لتعديل هذا الفريق');
      }
    } catch (err) {
      console.error('Error saving team:', err);
    }
  };

  const handleCreateTeam = async (newTeam: TeamDepartment) => {
    try {
      const res = await fetch('/api/teams/save-one', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify(newTeam),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.teams)) {
          setTeams(data.teams);
        } else {
          setTeams((prev) => [...prev, newTeam]);
        }
      } else {
        alert(data.error || 'عذراً، ليس لديك الصلاحية لإضافة فرق جديدة');
      }
    } catch (err) {
      console.error('Error creating team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`, { 
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || '',
        }
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.teams)) {
          setTeams(data.teams);
        } else {
          setTeams((prev) => prev.filter((t) => t.id !== teamId));
        }
      } else {
        alert(data.error || 'عذراً، ليس لديك الصلاحية لحذف الفرق');
      }
    } catch (err) {
      console.error('Error deleting team:', err);
    }
  };

  // Sound configuration sync
  const setSoundEnabled = (enabled: boolean) => {
    setConfig((prev) => ({ ...prev, soundEnabled: enabled }));
  };

  const handleSessionComplete = (session: AttendanceSession) => {
    setHistory((prev) => [session, ...prev]);
  };

  const handleClearHistory = async () => {
    if (!currentUser || (!isOwner && !currentUser.permissions?.clearHistory)) {
      alert('عذراً، ليس لديك الصلاحية لمسح سجل التقارير.');
      return;
    }
    if (confirm('هل أنت متأكد من رغبتك في مسح سجل التقارير؟')) {
      try {
        const res = await fetch('/api/bot/clear-history', { 
          method: 'POST',
          headers: {
            'x-user-id': currentUser.id,
          }
        });
        if (res.ok) {
          setHistory([]);
        } else {
          const data = await res.json();
          alert(data.error || 'فشل مسح السجل');
        }
      } catch {
        setHistory([]);
      }
    }
  };

  const handleForceCheckout = (userId: string) => {
    const session = activeSessions.get(userId);
    if (!session) return;

    const now = Date.now();
    let finalVoiceMs = session.totalVoiceMs;
    const intervals = session.voiceIntervals.map((inv, idx) => {
      if (idx === session.voiceIntervals.length - 1 && !inv.end) {
        finalVoiceMs += (now - inv.start);
        return { ...inv, end: now };
      }
      return inv;
    });

    const completed: AttendanceSession = {
      ...session,
      checkOutTime: now,
      inVoiceCurrently: false,
      voiceIntervals: intervals,
      totalVoiceMs: finalVoiceMs,
      status: 'completed',
    };

    const updated = new Map(activeSessions);
    updated.delete(userId);
    setActiveSessions(updated);
    handleSessionComplete(completed);
  };

  const handleTriggerCheck = (userId: string) => {
    const session = activeSessions.get(userId);
    if (!session) return;

    const updated = new Map(activeSessions);
    if (session.inVoiceCurrently) {
      updated.set(userId, { ...session, voiceCheckPassed: true });
    } else {
      updated.set(userId, { 
        ...session, 
        voiceCheckPassed: false, 
        warnCount: session.warnCount + 1,
        warnedAt: Date.now() 
      });
    }
    setActiveSessions(updated);
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] text-[#dbdee1] flex flex-col selection:bg-[#5865f2] selection:text-white">
      {/* Top Nav Bar */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeShiftsCount={activeSessions.size}
        teamsCount={teams.length}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={(tId) => {
          setSelectedTeamId(tId);
          setActiveTab('teams');
        }}
        soundEnabled={config.soundEnabled}
        setSoundEnabled={setSoundEnabled}
        isRealBotRunning={isRealBotRunning}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Tab 0: Multi-Page Teams & Tasks */}
        {activeTab === 'teams' && (
          <TeamPagesManager
            teams={teams}
            onUpdateTeam={handleUpdateTeam}
            onCreateTeam={handleCreateTeam}
            onDeleteTeam={handleDeleteTeam}
            activeSessions={activeSessions}
            history={history}
            onForceCheckout={handleForceCheckout}
            onTriggerCheck={handleTriggerCheck}
            isBotRunning={isRealBotRunning}
            currentUser={currentUser}
            selectedTeamId={selectedTeamId}
            onSelectTeam={setSelectedTeamId}
          />
        )}

        {/* Tab 1: Real Discord Bot Runner */}
        {activeTab === 'live-bot' && (
          <LiveBotRunner currentUser={currentUser} />
        )}

        {/* Tab 2: Live Active Shifts Table */}
        {activeTab === 'active-shifts' && (
          <ActiveShiftsTable
            activeSessions={activeSessions}
            config={config}
            onForceCheckout={handleForceCheckout}
            onTriggerCheck={handleTriggerCheck}
          />
        )}

        {/* Tab 3: Shift History & Reports */}
        {activeTab === 'history' && (
          <ShiftHistory
            history={history}
            onClearHistory={handleClearHistory}
          />
        )}

        {/* Tab 4: Bot Configuration & Team Management (Protected by Permissions) */}
        {activeTab === 'settings' && (
          canAccessSettings ? (
            <BotSettings
              config={config}
              setConfig={setConfig}
              teams={teams}
              onCreateTeam={handleCreateTeam}
              onDeleteTeam={handleDeleteTeam}
              onUpdateTeam={handleUpdateTeam}
              onSelectTeam={setSelectedTeamId}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-[#2b2d31] p-8 rounded-2xl border border-[#383a40] text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-[#ed4245]/20 border border-[#ed4245]/30 flex items-center justify-center text-[#ed4245] mx-auto text-3xl">
                🔒
              </div>
              <h2 className="text-lg font-bold text-white">تم رفض الوصول - إعدادات البوت والسيرفر</h2>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                عذراً، الدخول إلى قسم الإعدادات محصور على من يمتلك رول وصلاحية [إدارة الإعدادات] أو رتبة القائد (الليدر / صاحب الموقع).
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('teams')}
                  className="px-4 py-2 bg-[#1e1f22] hover:bg-[#35373c] border border-[#383a40] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  الرجوع إلى الفرق
                </button>
                {!currentUser && (
                  <button
                    onClick={() => handleOpenAuthModal('login')}
                    className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    تسجيل الدخول كمسؤول
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {/* Tab 5: User Accounts, Roles & Permissions Management (Leader / Owner Control Only) */}
        {activeTab === 'roles' && (
          canAccessRoles ? (
            <RoleManager currentUser={currentUser!} teams={teams} />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-[#2b2d31] p-8 rounded-2xl border border-[#383a40] text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto text-3xl">
                👑
              </div>
              <h2 className="text-lg font-bold text-white">إدارة الرولات والصلاحيات</h2>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                هذه الصفحة مخصصة للقائد (الليدر / صاحب الموقع) فقط لإسناد الرتب وتوزيع الصلاحيات وتخصيص الفرق للأعضاء. لا يمكنك الدخول أو التعديل دون امتلاك الرول المناسب.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('teams')}
                  className="px-4 py-2 bg-[#1e1f22] hover:bg-[#35373c] border border-[#383a40] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  الرجوع إلى الفرق
                </button>
                {!currentUser && (
                  <button
                    onClick={() => handleOpenAuthModal('login')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    تسجيل الدخول بحساب الليدر
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {/* Tab 7: Developer Vault (Protected by PIN 854, visible only to owner) */}
        {activeTab === 'developer' && (
          <DeveloperVault
            currentUser={currentUser}
            onBackToTeams={() => setActiveTab('teams')}
          />
        )}
      </main>

      {/* Login & Registration Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authModalMode}
          onLoginSuccess={handleLoginSuccess}
          onClose={currentUser ? () => setShowAuthModal(false) : undefined}
        />
      )}
    </div>
  );
}
