import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Users, 
  FileText, 
  Settings, 
  Volume2,
  VolumeX,
  Crown,
  LogOut,
  Gamepad2,
  ExternalLink,
  UserPlus,
  LogIn,
  ChevronDown,
  Check,
  Download,
  Terminal
} from 'lucide-react';
import { UserAccount, TeamDepartment } from '../types/attendance';

interface TopNavProps {
  activeTab: 'teams' | 'live-bot' | 'active-shifts' | 'history' | 'settings' | 'roles' | 'developer';
  setActiveTab: (tab: 'teams' | 'live-bot' | 'active-shifts' | 'history' | 'settings' | 'roles' | 'developer') => void;
  activeShiftsCount: number;
  teamsCount?: number;
  teams?: TeamDepartment[];
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isRealBotRunning?: boolean;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  activeShiftsCount,
  teams = [],
  selectedTeamId,
  onSelectTeam,
  soundEnabled,
  setSoundEnabled,
  isRealBotRunning = false,
  currentUser,
  onLogout,
  onOpenAuthModal,
}) => {
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTeamDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict Role & Team Filtering
  const isOwner = currentUser?.role === 'owner';
  const hasAllTeams = !currentUser || isOwner || !currentUser.allowedTeamIds || currentUser.allowedTeamIds.length === 0 || currentUser.allowedTeamIds.includes('*') || currentUser.allowedTeamIds.includes('all');
  const visibleTeams = hasAllTeams ? teams : teams.filter(t => currentUser.allowedTeamIds?.includes(t.id));

  // Permissions for tabs
  const canAccessSettings = Boolean(currentUser && (isOwner || currentUser.permissions?.manageSettings || currentUser.permissions?.manageBot));
  const canAccessRoles = Boolean(currentUser && (isOwner || currentUser.permissions?.manageUsers));

  const currentSelectedTeam = visibleTeams.find((t) => t.id === selectedTeamId) || visibleTeams[0] || teams[0];
  const activeTeamName = currentSelectedTeam?.name ? currentSelectedTeam.name.split('(')[0].trim() : 'الذهبي الملكي';

  return (
    <header className="bg-[#0b0c0f] border-b border-[#1c1e24] shrink-0 select-none">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row: Branding, Server Status, User Profile / Auth */}
        <div className="flex items-center justify-between gap-4 py-2.5">
          
          {/* Right Section (in RTL): Avatar Logo + PRAVA V2.5 + Subtitle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Circular Glowing Emblem with live green dot */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full border-2 border-amber-500/60 bg-gradient-to-b from-amber-600/30 via-[#16171c] to-[#0c0d10] p-0.5 shadow-[0_0_16px_rgba(245,158,11,0.3)] flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#121318] flex items-center justify-center text-amber-400">
                  <Crown className="w-4 h-4 drop-shadow-[0_2px_6px_rgba(245,158,11,0.7)]" />
                </div>
              </div>
              {/* Live Green Status Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#23a55a] border-2 border-[#0b0c0f] rounded-full shadow-[0_0_8px_#23a55a]" />
            </div>

            <div className="flex flex-col text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white tracking-wider font-mono">
                  PRAVA
                </span>
                <span className="text-[10px] font-mono font-bold bg-[#16171b] border border-[#2b2e36] text-[#9ca3af] px-1.5 py-0.2 rounded shadow-2xs">
                  V2.5
                </span>
              </div>
              <span className="text-[10px] text-[#949ba4] font-medium leading-tight">
                منصة التوظيف الموحدة
              </span>
            </div>

            {/* Server Status Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('live-bot')}
              className="hidden sm:flex items-center gap-2 bg-[#121317] hover:bg-[#18191f] border border-[#23252d] rounded-lg px-2.5 py-1.5 text-xs text-[#dbdee1] font-semibold transition-colors cursor-pointer shadow-2xs mr-1"
              title="حالة اتصال السيرفر والبوت"
            >
              <span className={`w-2 h-2 rounded-full ${isRealBotRunning ? 'bg-[#23a55a] shadow-[0_0_8px_#23a55a] animate-pulse' : 'bg-[#23a55a]'}`} />
              <span>سيرفر PRAVA متصل</span>
            </button>

            {/* Team / Department Dropdown (only displays authorized teams) */}
            {visibleTeams.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                  className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                    activeTab === 'teams'
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-[#121317] hover:bg-[#18191f] border-[#23252d] text-white'
                  }`}
                  title="اختيار صفحة الفريق المسموح لك بالدخول إليها"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate max-w-[130px]">
                    {activeTeamName ? `${activeTeamName} (PRAVA)` : 'الذهبي الملكي (PRAVA)'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#80848e] transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showTeamDropdown && (
                  <div className="absolute top-full right-0 mt-1.5 w-64 bg-[#121317] border border-[#262832] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] text-[#80848e] font-bold border-b border-[#23252d] flex items-center justify-between">
                      <span>الفرق المسموح لك بها:</span>
                      <span className="text-amber-400 font-mono">{visibleTeams.length} فرق</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {visibleTeams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (onSelectTeam) onSelectTeam(t.id);
                            setActiveTab('teams');
                            setShowTeamDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-right transition-colors ${
                            t.id === selectedTeamId && activeTab === 'teams'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'text-[#dbdee1] hover:bg-[#1d1f26] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#5865f2' }} />
                            <span className="truncate">{t.name}</span>
                          </div>
                          {t.id === selectedTeamId && activeTab === 'teams' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Discord Link */}
            <button
              type="button"
              onClick={() => setActiveTab('live-bot')}
              className="hidden lg:flex items-center gap-1.5 bg-[#1a1c24] hover:bg-[#232632] border border-[#343847] text-[#9bb3ff] hover:text-white rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ديسكورد</span>
            </button>

            {/* Download Project ZIP */}
            <a
              href="/api/download/project"
              download="discord-attendance-bot.zip"
              className="flex items-center gap-1.5 bg-[#23a55a]/15 hover:bg-[#23a55a]/25 border border-[#23a55a]/40 text-[#57f287] hover:text-white rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="تحميل كود المشروع كامل في ملف ZIP"
            >
              <Download className="w-3.5 h-3.5 text-[#57f287]" />
              <span className="hidden sm:inline">تحميل المشروع</span>
              <span className="text-[10px] font-mono opacity-80">(ZIP)</span>
            </a>
          </div>

          {/* Left Section (in RTL): User info when logged in, or Login/Register buttons when logged out */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              /* LOGGED IN USER: user badge, role and logout button */
              <div className="flex items-center gap-2 bg-[#14151a] border border-[#232630] rounded-xl px-3 py-1.5 shadow-2xs">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentUser.role === 'owner' ? 'bg-amber-500/20 text-amber-300' : 'bg-[#5865f2]/20 text-[#5865f2]'
                }`}>
                  {currentUser.role === 'owner' ? '👑' : (currentUser.gameUsername || currentUser.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-right leading-none">
                  <span className="text-xs font-bold text-white truncate max-w-[130px]">
                    {currentUser.gameUsername || currentUser.username}
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold mt-0.5">
                    {currentUser.roleTitle || (currentUser.role === 'owner' ? 'القائد' : 'عضو')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="تسجيل الخروج من الحساب"
                  className="text-[#80848e] hover:text-[#ed4245] p-1 rounded-md hover:bg-white/5 transition-colors mr-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* LOGGED OUT: Clean Manual Register & Login Buttons ONLY */
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('register')}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white font-bold text-xs rounded-lg px-3 py-1.5 shadow-md shadow-orange-950/50 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">إنشاء حساب</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 bg-[#14151a] hover:bg-[#1e2027] border border-[#232630] text-white font-bold text-xs rounded-lg px-3 py-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
              </>
            )}

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'كتم الأصوات' : 'تفعيل الأصوات'}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#b5bac1] hover:text-white bg-[#141519] hover:bg-[#1c1e24] border border-[#23252d] rounded-lg transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#23a55a]" />
                  <span className="text-[11px] text-[#23a55a] hidden sm:inline">صوت</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#80848e]" />
                  <span className="text-[11px] text-[#80848e] hidden sm:inline">كتم</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-t border-[#1a1c22] py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">

            {/* Tab 1: Teams Pages */}
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-amber-500 text-black shadow-[0_2px_10px_rgba(245,158,11,0.35)] font-black'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#171920]'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>صفحات الفرق والمهمات</span>
            </button>

            {/* Tab 2: Discord Bot Runner */}
            <button
              onClick={() => setActiveTab('live-bot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'live-bot'
                  ? 'bg-[#5865f2] text-white shadow-[0_2px_10px_rgba(88,101,242,0.35)]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#171920]'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-[#57f287]" />
              <span>تشغيل في ديسكورد</span>
            </button>

            {/* Tab 3: Active Shifts */}
            <button
              onClick={() => setActiveTab('active-shifts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'active-shifts'
                  ? 'bg-[#5865f2] text-white shadow-[0_2px_10px_rgba(88,101,242,0.35)]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#171920]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>كافة الشفتات</span>
              {activeShiftsCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-[#23a55a] text-white px-1.5 py-0.2 rounded-full">
                  {activeShiftsCount}
                </span>
              )}
            </button>

            {/* Tab 4: Shift History */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#5865f2] text-white shadow-[0_2px_10px_rgba(88,101,242,0.35)]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#171920]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>سجل التقارير الحقيقي</span>
            </button>

            {/* Tab 5: Settings - ONLY VISIBLE IF USER HAS PERMISSION */}
            {canAccessSettings && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#5865f2] text-white shadow-[0_2px_10px_rgba(88,101,242,0.35)]'
                    : 'text-[#9ca3af] hover:text-white hover:bg-[#171920]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>الإعدادات</span>
                <span className="text-[9px] bg-black/40 text-amber-300 px-1 py-0.2 rounded font-mono">
                  صلاحية
                </span>
              </button>
            )}

            {/* Tab 6: Roles & Permissions - ONLY VISIBLE IF USER HAS ROLE MANAGEMENT PERMISSION */}
            {canAccessRoles && (
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'roles'
                    ? 'bg-amber-500 text-white shadow-[0_2px_10px_rgba(245,158,11,0.35)]'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-[#171920]'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>الرولات والصلاحيات</span>
                {currentUser?.role === 'owner' && (
                  <span className="text-[9px] bg-black/50 text-amber-200 px-1.5 py-0.2 rounded-full font-bold">
                    الليدر
                  </span>
                )}
              </button>
            )}

            {/* Tab 7: Developer Vault - ONLY VISIBLE TO LEADER / OWNER */}
            {isOwner && (
              <button
                onClick={() => setActiveTab('developer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'developer'
                    ? 'bg-purple-600 text-white shadow-[0_2px_10px_rgba(168,85,247,0.4)]'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 border border-purple-500/25'
                }`}
                title="قسم خاص بالمطور والليدر لتحميل المشروع والأكواد"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>خاص بالمطور</span>
                <span className="text-[9px] bg-purple-950/80 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded font-mono">
                  سري
                </span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
