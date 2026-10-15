import React, { useState } from 'react';
import { 
  Settings, 
  RotateCcw, 
  Save, 
  Check, 
  MessageSquare, 
  Clock, 
  Volume2,
  Users,
  Plus,
  Trash2,
  ExternalLink,
  Mic,
  Hash,
  AlertCircle,
  FolderPlus,
  X,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { BotConfiguration, TeamDepartment, UserAccount } from '../types/attendance';

interface BotSettingsProps {
  config: BotConfiguration;
  setConfig: React.Dispatch<React.SetStateAction<BotConfiguration>>;
  teams?: TeamDepartment[];
  onCreateTeam?: (team: TeamDepartment) => Promise<void>;
  onDeleteTeam?: (teamId: string) => Promise<void>;
  onUpdateTeam?: (team: TeamDepartment) => Promise<void>;
  onSelectTeam?: (teamId: string) => void;
  setActiveTab?: (tab: 'teams' | 'live-bot' | 'active-shifts' | 'history' | 'settings' | 'roles') => void;
  currentUser?: UserAccount | null;
}

export const BotSettings: React.FC<BotSettingsProps> = ({ 
  config, 
  setConfig,
  teams = [],
  onCreateTeam,
  onDeleteTeam,
  onSelectTeam,
  setActiveTab,
  currentUser
}) => {
  const [form, setForm] = useState<BotConfiguration>({ ...config });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add Team Modal / Section state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#5865F2');
  const [newTeamVoiceId, setNewTeamVoiceId] = useState('');
  const [newTeamAttendanceId, setNewTeamAttendanceId] = useState('');
  const [newTeamLogId, setNewTeamLogId] = useState('');
  const [newTeamSendWarning, setNewTeamSendWarning] = useState(false);
  const [teamAddSuccess, setTeamAddSuccess] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Sync with props whenever config changes externally
  React.useEffect(() => {
    setForm(config);
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) {
      alert('عذراً، لا تملك رول أو صلاحية لتعديل وحفظ إعدادات البوت.');
      return;
    }
    setIsSaving(true);
    try {
      setConfig(form);
      localStorage.setItem('bot_custom_config', JSON.stringify(form));

      // Save permanently to server for all users
      const res = await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          checkInCmd: form.checkInCommand,
          checkOutCmd: form.checkOutCommand,
          checkMinutes: form.checkTimerMinutes,
          sendWarningToAttendanceChat: form.sendWarningToAttendanceChat ?? false,
          sendWarningToAdminChat: form.sendWarningToAdminChat ?? true,
          customCheckInMsg: form.checkInSuccessMessage,
          customCheckOutMsg: form.checkOutSuccessMessage,
          customWarningAttendanceMsg: form.warningMessage,
          customWarningAdminMsg: form.warningAdminMessage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل حفظ الإعدادات على السيرفر');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`خطأ: ${msg}`);
      console.error('Failed to save settings to server:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!canManageSettings) {
      alert('عذراً، لا تملك رول أو صلاحية لاستعادة الإعدادات الافتراضية.');
      return;
    }
    const defaults: BotConfiguration = {
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
    setForm(defaults);
    setConfig(defaults);
    try {
      await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          checkInCmd: defaults.checkInCommand,
          checkOutCmd: defaults.checkOutCommand,
          checkMinutes: defaults.checkTimerMinutes,
          sendWarningToAttendanceChat: false,
          sendWarningToAdminChat: true,
          customCheckInMsg: defaults.checkInSuccessMessage,
          customCheckOutMsg: defaults.checkOutSuccessMessage,
          customWarningAttendanceMsg: defaults.warningMessage,
          customWarningAdminMsg: defaults.warningAdminMessage,
        }),
      });
    } catch {
      // ignore
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isOwner = currentUser?.role === 'owner';
  const canManageTeams = isOwner || Boolean(currentUser?.permissions?.manageTeams);
  const canManageSettings = isOwner || Boolean(currentUser?.permissions?.manageSettings || currentUser?.permissions?.manageBot);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeams) {
      setPermissionError('عذراً، إضافة الفرق مقتصرة على من يملك صلاحية [إدارة الفرق] أو رتبة الليدر/المالك.');
      return;
    }
    if (!newTeamName.trim() || !onCreateTeam) return;

    setIsCreatingTeam(true);
    setPermissionError(null);
    try {
      const newTeam: TeamDepartment = {
        id: `team-${Date.now()}`,
        name: newTeamName.trim(),
        color: newTeamColor || '#5865F2',
        attendanceChannelId: newTeamAttendanceId.trim(),
        targetVoiceChannelId: newTeamVoiceId.trim(),
        logChannelId: newTeamLogId.trim(),
        checkInCmd: 'د',
        checkOutCmd: 'خ',
        checkMinutes: 5,
        enabled: true,
        sendWarningToAttendanceChat: newTeamSendWarning,
        sendWarningToAdminChat: true,
      };

      await onCreateTeam(newTeam);
      setTeamAddSuccess(true);
      setShowAddTeamModal(false);
      setNewTeamName('');
      setNewTeamVoiceId('');
      setNewTeamAttendanceId('');
      setNewTeamLogId('');
      setNewTeamSendWarning(false);
      setTimeout(() => setTeamAddSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create team:', err);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SEPARATE SECTION: Teams & Departments Management (إضافة وإدارة الفرق من الإعدادات على صلاحية) */}
      <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#383a40]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">إدارة وإضافة الفرق والأقسام</h2>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {teams.length} فرق مسجلة
                </span>
                {canManageTeams ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[#23a55a]/15 text-[#57f287] border border-[#23a55a]/30 px-2 py-0.5 rounded-full font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>مصرح لك</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-[#da373c]/15 text-[#fa777b] border border-[#da373c]/30 px-2 py-0.5 rounded-full font-bold">
                    <Lock className="w-3 h-3" />
                    <span>تتطلب صلاحية</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#949ba4] mt-0.5">
                {canManageTeams
                  ? 'بصفتك مصرحاً لك (الليدر أو صاحب صلاحية إدارة الفرق)، يمكنك إضافة فرق جديدة وتعيين رومات الفويس وشات الحضور.'
                  : 'استعراض الفرق وروماتها. لإضافة أو حذف الفرق يرجى مراجعة الليدر لمنحك صلاحية [إدارة الفرق] من الرولات.'}
              </p>
            </div>
          </div>

          {canManageTeams ? (
            <button
              type="button"
              onClick={() => {
                setPermissionError(null);
                setShowAddTeamModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ إضافة فريق جديد</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1f22] border border-[#383a40] text-[#949ba4] text-[11px] font-semibold rounded-lg">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>إضافة الفرق محصورة بالصلاحية</span>
            </div>
          )}
        </div>

        {permissionError && (
          <div className="p-3 bg-[#da373c]/15 border border-[#da373c]/30 rounded-lg text-xs text-[#fa777b] flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}

        {teamAddSuccess && (
          <div className="p-3 bg-[#23a55a]/15 border border-[#23a55a]/30 rounded-lg text-xs text-[#57f287] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>✅ تم إضافة الفريق الجديد بنجاح ويمكنك الآن اختياره من القائمة العلوية!</span>
          </div>
        )}

        {/* List of Current Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((t) => (
            <div
              key={t.id}
              className="p-3.5 bg-[#1e1f22] border border-[#383a40] rounded-xl flex flex-col justify-between gap-3 hover:border-[#4e5058] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: t.color || '#5865F2' }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[170px]">{t.name}</h4>
                    <p className="text-[10px] font-mono text-[#949ba4] mt-0.5">
                      {t.targetVoiceChannelId ? `🎙️ روم: ${t.targetVoiceChannelId}` : 'لم يحدد روم فويس'}
                    </p>
                  </div>
                </div>

                {teams.length > 1 && onDeleteTeam && canManageTeams && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف فريق "${t.name}"؟`)) {
                        onDeleteTeam(t.id);
                      }
                    }}
                    title="حذف هذا الفريق"
                    className="p-1.5 text-[#80848e] hover:text-[#da373c] hover:bg-[#da373c]/10 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2b2d31] text-[11px]">
                <span className="text-[#80848e]">
                  مهلة الفحص: <strong className="text-white">{t.checkMinutes || 5}د</strong>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (onSelectTeam) onSelectTeam(t.id);
                    if (setActiveTab) setActiveTab('teams');
                  }}
                  className="flex items-center gap-1 text-[#5865f2] hover:text-[#7983f5] font-semibold transition-colors cursor-pointer"
                >
                  <span>عرض الصفحة</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. ADD TEAM MODAL */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#2b2d31] border border-[#383a40] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#383a40]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إضافة فريق أو قسم جديد</h3>
                  <p className="text-[11px] text-[#949ba4]">سيتم إنشاء صفحة مخصصة لهذا الفريق وربطه بالبوت</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                className="text-[#949ba4] hover:text-white p-1 rounded-lg hover:bg-[#35373c] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
              {/* Name & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-white">اسم الفريق / القسم:</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    required
                    placeholder="مثال: فريق الباند (Ban Team)"
                    className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">لون الفريق:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTeamColor}
                      onChange={(e) => setNewTeamColor(e.target.value)}
                      className="w-10 h-8 rounded bg-[#1e1f22] border border-[#383a40] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newTeamColor}
                      onChange={(e) => setNewTeamColor(e.target.value)}
                      className="w-full bg-[#1e1f22] text-white px-2 py-1.5 rounded-lg border border-[#383a40] font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Target Voice Channel */}
              <div className="space-y-1.5 p-3 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>آيدي روم الفويس المطلوب التواجد فيه (Voice Channel ID):</span>
                </label>
                <input
                  type="text"
                  value={newTeamVoiceId}
                  onChange={(e) => setNewTeamVoiceId(e.target.value)}
                  placeholder="مثال: 123456789012345678"
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] font-mono text-xs focus:outline-none focus:border-[#5865f2]"
                />
                <p className="text-[10px] text-[#949ba4]">
                  يقوم البوت تلقائياً بفحص إذا كان العضو متواجداً في هذا الروم الصوتي بعد تسجيل الدخول.
                </p>
              </div>

              {/* Attendance Channel */}
              <div className="space-y-1.5">
                <label className="font-semibold text-white flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#23a55a]" />
                  <span>آيدي شات تسجيل الحضور والانصراف (اختياري):</span>
                </label>
                <input
                  type="text"
                  value={newTeamAttendanceId}
                  onChange={(e) => setNewTeamAttendanceId(e.target.value)}
                  placeholder="مثال: 1559200634698342410"
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] font-mono text-xs focus:outline-none focus:border-[#23a55a]"
                />
              </div>

              {/* Log Channel */}
              <div className="space-y-1.5">
                <label className="font-semibold text-white flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>آيدي شات الإدارة والسجلات الخاصة (اختياري):</span>
                </label>
                <input
                  type="text"
                  value={newTeamLogId}
                  onChange={(e) => setNewTeamLogId(e.target.value)}
                  placeholder="مثال: 1559200800218022020"
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Send Warning to Attendance */}
              <label className="flex items-center gap-2 cursor-pointer text-[#dbdee1] pt-1">
                <input
                  type="checkbox"
                  checked={newTeamSendWarning}
                  onChange={(e) => setNewTeamSendWarning(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5865f2] bg-[#1e1f22] border-[#383a40] focus:ring-0"
                />
                <span>إرسال تنبيه الإنذار في شات الحضور أيضاً بالإضافة لشات الإدارة</span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#383a40]">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#dbdee1] hover:text-white bg-[#1e1f22] hover:bg-[#383a40] rounded-lg transition-colors border border-[#383a40]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam || !newTeamName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingTeam ? 'جاري الإنشاء...' : 'حفظ وإنشاء الفريق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BOT GENERAL SETTINGS FORM */}
      <form onSubmit={handleSave} className="bg-[#2b2d31] border border-[#383a40] rounded-xl p-5 shadow-sm space-y-6">
        {!canManageSettings && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>🔒 وضع القراءة فقط: أنت تتصفح إعدادات البوت للمشاهدة. تعديل أو حفظ هذه الإعدادات يتطلب صلاحية [إدارة الإعدادات] أو رتبة القائد.</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#383a40]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5865f2]/20 text-[#5865f2] flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">إعدادات البوت والتحكم العامة</h2>
              <p className="text-xs text-[#949ba4]">
                تخصيص حروف الأوامر (د / خ)، مهلة فحص الفويس، ورسائل التحذير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!canManageSettings || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#dbdee1] bg-[#1e1f22] hover:bg-[#383a40] rounded-lg transition-colors border border-[#383a40] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>

            <button
              type="submit"
              disabled={!canManageSettings || isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#5865f2] hover:bg-[#4752c4] rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saved ? 'تم الحفظ!' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </div>

        {/* Grid of Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Command 1: Check-in */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#23a55a]" />
              <span>حرف أو أمر تسجيل الدخول:</span>
            </label>
            <input
              type="text"
              value={form.checkInCommand}
              onChange={(e) => setForm({ ...form, checkInCommand: e.target.value })}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-center text-sm font-bold"
              placeholder="د"
              required
            />
            <p className="text-[11px] text-[#949ba4]">
              الحرف الذي يكتبه العضو لتسجيل الحضور (الافتراضي: <strong>د</strong>).
            </p>
          </div>

          {/* Command 2: Check-out */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#da373c]" />
              <span>حرف أو أمر تسجيل الخروج:</span>
            </label>
            <input
              type="text"
              value={form.checkOutCommand}
              onChange={(e) => setForm({ ...form, checkOutCommand: e.target.value })}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-center text-sm font-bold"
              placeholder="خ"
              required
            />
            <p className="text-[11px] text-[#949ba4]">
              الحرف الذي يكتبه العضو لتسجيل الانصراف واستخراج تقرير مدة الفويس (الافتراضي: <strong>خ</strong>).
            </p>
          </div>

          {/* Timer Duration */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>مهلة فحص التواجد في الفويس (بالدقائق):</span>
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={form.checkTimerMinutes}
              onChange={(e) => setForm({ ...form, checkTimerMinutes: Math.max(1, Number(e.target.value)) })}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-sm"
              required
            />
            <p className="text-[11px] text-[#949ba4]">
              الوقت الذي ينتظره البوت بعد تسجيل الدخول للتأكد من دخول الفويس (الافتراضي: <strong>5</strong> دقائق).
            </p>
          </div>

          {/* Sound Toggle */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#5865f2]" />
              <span>أصوات تنبيهات المحاكي:</span>
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#dbdee1]">
                <input
                  type="checkbox"
                  checked={form.soundEnabled}
                  onChange={(e) => setForm({ ...form, soundEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#5865f2] bg-[#1e1f22] border-[#383a40] focus:ring-0"
                />
                <span>تفعيل أصوات الديسكورد والتنبيهات الصوتية</span>
              </label>
            </div>
            <p className="text-[11px] text-[#949ba4]">
              تشغيل نغمات دخول وخروج الفويس ورنين الرسائل أثناء التجربة.
            </p>
          </div>

          {/* Warning message template */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <span>نص رسالة التحذير (عند عدم التواجد في الفويس بعد 5 دقائق):</span>
            </label>
            <textarea
              rows={2}
              value={form.warningMessage}
              onChange={(e) => setForm({ ...form, warningMessage: e.target.value })}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] leading-relaxed"
            />
            <p className="text-[11px] text-[#949ba4]">
              يمكنك استخدام المتغيرات: <code>{'{user}'}</code> لمنشن العضو، و <code>{'{minutes}'}</code> لعدد الدقائق.
            </p>
          </div>

          {/* Check in success text */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">نص رد تسجيل الدخول الناجح:</label>
            <input
              type="text"
              value={form.checkInSuccessMessage}
              onChange={(e) => setForm({ ...form, checkInSuccessMessage: e.target.value })}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2]"
            />
          </div>

          {/* Check out success text */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">نص رد تسجيل الخروج الناجح:</label>
            <input
              type="text"
              value={form.checkOutSuccessMessage}
              onChange={(e) => setForm({ ...form, checkOutSuccessMessage: e.target.value })}
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2]"
            />
          </div>

          {/* Admin Chat Alert text */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="font-semibold text-white">نص رسالة التنبيه في شات الإدارة (أعلى الإمبد):</label>
            <input
              type="text"
              value={form.warningAdminMessage || ''}
              onChange={(e) => setForm({ ...form, warningAdminMessage: e.target.value })}
              placeholder="🚨 تنبيه إداري: العضو {user} عليه إنذار رسمي لعدم تواجده في روم الفويس المطلوب!"
              className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2]"
            />
          </div>

          {/* Global Warning Dispatch Toggle */}
          <div className="md:col-span-2 p-3.5 bg-[#1e1f22] border border-[#383a40] rounded-xl space-y-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-white select-none">
              <input
                type="checkbox"
                checked={Boolean(form.sendWarningToAttendanceChat)}
                onChange={(e) => setForm({ ...form, sendWarningToAttendanceChat: e.target.checked })}
                className="w-4 h-4 rounded text-[#5865f2] bg-[#2b2d31] border-[#383a40] focus:ring-0 cursor-pointer"
              />
              <span>إرسال رسائل الإنذار في شات تسجيل الدخول (الحضور) افتراضياً؟</span>
            </label>
            <p className="text-[11px] text-[#949ba4] pr-6 leading-relaxed">
              {form.sendWarningToAttendanceChat
                ? '🔔 يتم إرسال الإنذار في شات تسجيل الدخول مع إرسال البلاغ لشات الإدارة.'
                : '🔕 تم إيقاف الإرسال في شات تسجيل الدخول: يتم كتم الإنذارات في شات الحضور وإرسالها لشات الإدارة فقط (يمكنك أيضاً التحكم بها لكل فريق على حدة في صفحات الفرق).'}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
