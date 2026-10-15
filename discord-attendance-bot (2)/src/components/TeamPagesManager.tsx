import React, { useState } from 'react';
import { 
  Users, 
  Volume2, 
  VolumeX, 
  Hash, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Mic, 
  ShieldAlert, 
  Download,
  Copy,
  Check,
  FastForward,
  LogOut,
  FolderPlus,
  Sparkles,
  Info,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { TeamDepartment, AttendanceSession, UserAccount } from '../types/attendance';
import { formatArabicDuration, formatArabicTime, formatCountdown, formatArabicDate } from '../utils/formatters';

interface TeamPagesManagerProps {
  teams: TeamDepartment[];
  onUpdateTeam: (team: TeamDepartment) => Promise<void>;
  onCreateTeam: (team: TeamDepartment) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  activeSessions: Map<string, AttendanceSession>;
  history: AttendanceSession[];
  onForceCheckout: (userId: string) => void;
  onTriggerCheck: (userId: string) => void;
  isBotRunning: boolean;
  currentUser?: UserAccount | null;
  selectedTeamId?: string;
  onSelectTeam?: (teamId: string) => void;
}

export const TeamPagesManager: React.FC<TeamPagesManagerProps> = ({
  teams,
  onUpdateTeam,
  onCreateTeam,
  onDeleteTeam,
  activeSessions,
  history,
  onForceCheckout,
  onTriggerCheck,
  isBotRunning,
  currentUser,
  selectedTeamId: externalSelectedTeamId,
  onSelectTeam,
}) => {
  const isOwner = currentUser?.role === 'owner';
  const hasAllTeams = !currentUser || isOwner || !currentUser.allowedTeamIds || currentUser.allowedTeamIds.length === 0 || currentUser.allowedTeamIds.includes('*') || currentUser.allowedTeamIds.includes('all');
  const accessibleTeams = hasAllTeams ? teams : teams.filter((t) => currentUser.allowedTeamIds?.includes(t.id));
  const canManageTeams = isOwner || Boolean(currentUser?.permissions?.manageTeams);
  const canControlShifts = isOwner || Boolean(currentUser?.permissions?.manageTeams || currentUser?.permissions?.manageBot);

  const [internalSelectedTeamId, setInternalSelectedTeamId] = useState<string>(() => externalSelectedTeamId || accessibleTeams[0]?.id || teams[0]?.id || 'team-scenario');
  const selectedTeamId = externalSelectedTeamId || internalSelectedTeamId;
  const setSelectedTeamId = (id: string) => {
    setInternalSelectedTeamId(id);
    if (onSelectTeam) onSelectTeam(id);
  };

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMessagesSection, setShowMessagesSection] = useState(false);

  // New team modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#5865F2');
  const [newTeamVoiceId, setNewTeamVoiceId] = useState('');
  const [newTeamAttendanceId, setNewTeamAttendanceId] = useState('');
  const [newTeamLogId, setNewTeamLogId] = useState('');
  const [newTeamSendWarningToAttendance, setNewTeamSendWarningToAttendance] = useState(false);

  // Ensure selected team is accessible when list changes
  React.useEffect(() => {
    if (accessibleTeams.length > 0 && !accessibleTeams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(accessibleTeams[0].id);
    }
  }, [accessibleTeams, selectedTeamId]);

  // Selected team object from accessible teams
  const currentTeam = accessibleTeams.find((t) => t.id === selectedTeamId) || accessibleTeams[0] || teams[0];

  // Editable form state for current selected team
  const [formData, setFormData] = useState<TeamDepartment>(() => currentTeam || {
    id: 'team-scenario',
    name: 'فريق السيناريو',
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
  });

  const isDirtyRef = React.useRef(false);
  const prevSelectedIdRef = React.useRef(selectedTeamId);

  React.useEffect(() => {
    // When switching tabs
    if (prevSelectedIdRef.current !== selectedTeamId) {
      prevSelectedIdRef.current = selectedTeamId;
      isDirtyRef.current = false;
      if (currentTeam) {
        setFormData(currentTeam);
        setSaveSuccess(false);
      }
    } else if (!isDirtyRef.current && currentTeam) {
      // Sync from server if user is not currently making local unsaved edits
      setFormData((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(currentTeam)) {
          return currentTeam;
        }
        return prev;
      });
    }
  }, [selectedTeamId, currentTeam]);

  // Filter active sessions for the selected team
  const teamActiveSessions = Array.from(activeSessions.values()).filter((s) => {
    if (s.teamId) return s.teamId === currentTeam?.id;
    if (currentTeam?.attendanceChannelId && s.channelId === currentTeam.attendanceChannelId) return true;
    return teams[0]?.id === currentTeam?.id;
  });

  // Filter history for this team
  const teamHistory = history.filter((h) => {
    if (h.teamId) return h.teamId === currentTeam?.id;
    return false;
  });

  const totalTeamVoiceMs = teamHistory.reduce((acc, curr) => acc + curr.totalVoiceMs, 0);
  const totalTeamWarnings = teamHistory.reduce((acc, curr) => acc + curr.warnCount, 0);

  // Helper to handle field change and mark as dirty for auto-save
  const handleFieldChange = <K extends keyof TeamDepartment>(field: K, value: TeamDepartment[K]) => {
    isDirtyRef.current = true;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save changes to current team
  const handleSaveTeam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData || !canManageTeams) return;
    setSaving(true);
    isDirtyRef.current = false;
    try {
      await onUpdateTeam(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save debounced whenever user edits team name, color, channels, or messages
  React.useEffect(() => {
    if (!isDirtyRef.current || !canManageTeams) return;
    const timer = setTimeout(() => {
      if (formData && formData.id === selectedTeamId) {
        onUpdateTeam(formData);
        isDirtyRef.current = false;
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [formData, selectedTeamId, onUpdateTeam, canManageTeams]);

  // Add new custom team page
  const handleCreateNewTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeam: TeamDepartment = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      color: newTeamColor,
      attendanceChannelId: newTeamAttendanceId.trim(),
      targetVoiceChannelId: newTeamVoiceId.trim(),
      logChannelId: newTeamLogId.trim(),
      checkInCmd: 'د',
      checkOutCmd: 'خ',
      checkMinutes: 5,
      enabled: true,
      sendWarningToAttendanceChat: newTeamSendWarningToAttendance,
      sendWarningToAdminChat: true,
    };

    await onCreateTeam(newTeam);
    setSelectedTeamId(newTeam.id);
    setShowAddModal(false);
    setNewTeamName('');
    setNewTeamVoiceId('');
    setNewTeamAttendanceId('');
    setNewTeamLogId('');
    setNewTeamSendWarningToAttendance(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export team-specific CSV
  const exportTeamCSV = () => {
    if (teamHistory.length === 0) return;
    const headers = ['اسم العضو', 'التاق', 'الفريق', 'تاريخ الشفت', 'وقت الدخول', 'وقت الخروج', 'مدة الشفت', 'مدة الفويس', 'عدد الإنذارات'];
    const rows = teamHistory.map((s) => [
      `"${s.userName}"`,
      `"${s.userTag}"`,
      `"${s.teamName || currentTeam?.name || ''}"`,
      `"${formatArabicDate(s.checkInTime)}"`,
      `"${formatArabicTime(s.checkInTime)}"`,
      `"${s.checkOutTime ? formatArabicTime(s.checkOutTime) : '-'}"`,
      `"${formatArabicDuration((s.checkOutTime || s.checkInTime) - s.checkInTime)}"`,
      `"${formatArabicDuration(s.totalVoiceMs)}"`,
      s.warnCount,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_${currentTeam?.name || 'فريق'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (accessibleTeams.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-[#2b2d31] p-8 rounded-2xl border border-[#383a40] text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto text-3xl">
          🔒
        </div>
        <h2 className="text-lg font-bold text-white">لم يتم تخصيص أي فريق لحسابك حالياً</h2>
        <p className="text-xs text-[#949ba4] leading-relaxed">
          حسابك الحالي <strong className="text-white">({currentUser?.username})</strong> غير مصرح له بالدخول لأي قسم حتى الآن.
          يرجى التواصل مع <span className="text-amber-400 font-bold">الليدر أو صاحب الموقع</span> لمنحك صلاحية الوصول لفريق الباند، فريق الإدارة والمسؤولين، أو الفرق الأخرى.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {currentTeam && (
        <>
          {/* Active Team Overview & Configuration Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Team Configuration & Channels Input */}
            <form onSubmit={handleSaveTeam} className="lg:col-span-7 bg-[#2b2d31] border border-[#383a40] rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#383a40]">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: formData.color || '#5865F2' }}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>إعدادات: {formData.name}</span>
                    </h3>
                    <p className="text-[11px] text-[#949ba4]">
                      قم بوضع آيدي روم الفويس وشات الإدارة وسيتم فحص الأعضاء وإرسال الإنذارات تلقائياً
                    </p>
                  </div>
                </div>

                {teams.length > 1 && canManageTeams && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف صفحة "${formData.name}"؟`)) {
                        onDeleteTeam(formData.id);
                        setSelectedTeamId(teams.filter((t) => t.id !== formData.id)[0]?.id || '');
                      }
                    }}
                    title="حذف هذه الصفحة"
                    className="p-1.5 text-[#da373c] hover:bg-[#da373c]/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {saveSuccess && (
                <div className="p-3 bg-[#23a55a]/15 border border-[#23a55a]/30 rounded-lg text-xs text-[#57f287] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>✅ تم حفظ إعدادات الرومات لـ [{formData.name}] وتحديث البوت تلقائياً!</span>
                </div>
              )}

              {!canManageTeams && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>🔒 وضع المشاهدة: تعديل إعدادات الرومات أو الآيديات لهذا الفريق محصور على من يمتلك صلاحية [إدارة الفرق] أو رتبة الليدر.</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Team Name & Color Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold text-white">اسم الصفحة / الفريق:</label>
                    <input
                      type="text"
                      disabled={!canManageTeams}
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      required
                      className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-semibold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="مثال: فريق السيناريو"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">لون الفريق:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        disabled={!canManageTeams}
                        value={formData.color}
                        onChange={(e) => handleFieldChange('color', e.target.value)}
                        className="w-10 h-8 rounded bg-[#1e1f22] border border-[#383a40] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        disabled={!canManageTeams}
                        value={formData.color}
                        onChange={(e) => handleFieldChange('color', e.target.value)}
                        className="w-full bg-[#1e1f22] text-white px-2 py-1.5 rounded-lg border border-[#383a40] font-mono text-[11px] disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* HIGHLIGHTED TARGET VOICE CHANNEL ID */}
                <div className="p-3.5 bg-[#5865F2]/10 border-2 border-[#5865F2]/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <Mic className="w-4 h-4 text-[#5865F2]" />
                      <span>🎙️ آيدي روم الفويس المطلوب التواجد فيه (Voice Channel ID):</span>
                    </label>
                    <span className="text-[10px] font-bold bg-[#5865F2] text-white px-2 py-0.5 rounded-full">
                      فحص وتخزين تلقائي
                    </span>
                  </div>

                  <input
                    type="text"
                    disabled={!canManageTeams}
                    value={formData.targetVoiceChannelId}
                    onChange={(e) => handleFieldChange('targetVoiceChannelId', e.target.value)}
                    placeholder="مثال: 1559200634698342410 (انسخ آيدي روم الفويس وضعه هنا)"
                    className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded-lg border border-[#5865F2]/50 focus:outline-none focus:border-[#5865F2] font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  <div className="text-[11px] text-[#dbdee1] space-y-1">
                    <p className="flex items-start gap-1.5 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                      <span>
                        <strong>طريقة العمل:</strong> بعد كتابة <strong>{formData.checkInCmd || 'د'}</strong>، يفحص البوت هذا الروم بعد <strong>{formData.checkMinutes || 5} دقائق</strong>. إذا لم يتواجد العضو، يرسل البوت إنذاراً تلقائياً!
                      </span>
                    </p>
                    <p className="text-[#949ba4] text-[10px]">
                      * ينحفظ هذا الآيدي فوراً على السيرفر ويظهر لجميع المسؤولين تلقائياً.
                    </p>
                  </div>
                </div>

                {/* Attendance Channel ID & Admin Log Channel ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Attendance Text Channel */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-white flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-[#23a55a]" />
                      <span>آيدي شات الحضور (يكتب فيه د و خ):</span>
                    </label>
                    <input
                      type="text"
                      disabled={!canManageTeams}
                      value={formData.attendanceChannelId}
                      onChange={(e) => handleFieldChange('attendanceChannelId', e.target.value)}
                      placeholder="آيدي الشات الكتابي المخصص لهذا الفريق"
                      className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-[#949ba4]">
                      الروم الذي يكتب فيه هذا الفريق أمر الدخول أو الخروج.
                    </p>
                  </div>

                  {/* Staff Log Channel ID */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#da373c]" />
                      <span>آيدي شات الإدارة (للإنذارات والتقارير):</span>
                    </label>
                    <input
                      type="text"
                      disabled={!canManageTeams}
                      value={formData.logChannelId}
                      onChange={(e) => handleFieldChange('logChannelId', e.target.value)}
                      placeholder="آيدي شات الإدارة الخاص"
                      className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-[#949ba4]">
                      الروم الإداري الذي يتلقى البلاغات الرسمية والإنذارات.
                    </p>
                  </div>
                </div>

                {/* Commands and Timer Grid */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-white mb-1">أمر الحضور:</label>
                    <input
                      type="text"
                      disabled={!canManageTeams}
                      value={formData.checkInCmd}
                      onChange={(e) => handleFieldChange('checkInCmd', e.target.value)}
                      className="w-full bg-[#1e1f22] text-white px-2.5 py-1.5 rounded-lg border border-[#383a40] text-center font-bold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-white mb-1">أمر الانصراف:</label>
                    <input
                      type="text"
                      disabled={!canManageTeams}
                      value={formData.checkOutCmd}
                      onChange={(e) => handleFieldChange('checkOutCmd', e.target.value)}
                      className="w-full bg-[#1e1f22] text-white px-2.5 py-1.5 rounded-lg border border-[#383a40] text-center font-bold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-white mb-1">مهلة الفحص (دقائق):</label>
                    <input
                      type="number"
                      disabled={!canManageTeams}
                      min="1"
                      max="60"
                      value={formData.checkMinutes}
                      onChange={(e) => handleFieldChange('checkMinutes', Number(e.target.value) || 5)}
                      className="w-full bg-[#1e1f22] text-white px-2.5 py-1.5 rounded-lg border border-[#383a40] text-center font-bold text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* WARNING DISPATCH CONTROL (Attendance Chat vs Admin Chat only) */}
                <div className="p-3.5 bg-[#1e1f22] border border-[#383a40] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!canManageTeams}
                        checked={Boolean(formData.sendWarningToAttendanceChat)}
                        onChange={(e) => handleFieldChange('sendWarningToAttendanceChat', e.target.checked)}
                        className="w-4 h-4 rounded text-[#5865f2] bg-[#2b2d31] border-[#383a40] focus:ring-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span>إرسال رسالة الإنذار في شات تسجيل الدخول (الحضور)؟</span>
                    </label>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      formData.sendWarningToAttendanceChat 
                        ? 'bg-[#23a55a]/20 text-[#57f287] border border-[#23a55a]/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {formData.sendWarningToAttendanceChat ? (
                        <>
                          <Bell className="w-3 h-3" />
                          <span>مفعل (يرسل في شات الدخول)</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-3 h-3" />
                          <span>معطل (يرسل لشات الإدارة فقط)</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#949ba4] leading-relaxed">
                    {formData.sendWarningToAttendanceChat ? (
                      <span className="text-[#dbdee1]">
                        🔔 <strong>مفعل:</strong> عند عدم التواجد بالفويس، سيقوم البوت بإرسال تنبيه في شات تسجيل الدخول للعضو، بالإضافة إلى إرسال التقرير لشات الإدارة.
                      </span>
                    ) : (
                      <span className="text-amber-300/90">
                        🔕 <strong>تم إيقاف الإرسال في شات تسجيل الدخول:</strong> لن يرسل البوت أي إنذار في شات الأعضاء أو تسجيل الدخول، وسيتم توجيه الإنذار والبلاغ <strong>إلى شات الإدارة فقط</strong> لحفظ الخصوصية والنظام!
                      </span>
                    )}
                  </p>
                </div>

                {/* ACCORDION: CUSTOMIZE ALL BOT MESSAGES FOR THIS TEAM */}
                <div className="border border-[#383a40] rounded-xl bg-[#1e1f22]/70 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMessagesSection(!showMessagesSection)}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-white hover:bg-[#35373c]/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#5865f2]" />
                      <span>✉️ تخصيص نصوص الرسائل والإنذارات لهذا الفريق</span>
                    </span>
                    <span className="text-[11px] text-[#949ba4] flex items-center gap-1">
                      {showMessagesSection ? (
                        <><span>إخفاء التخصيص</span><ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <><span>تعديل رسائل البوت</span><ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </span>
                  </button>

                  {showMessagesSection && (
                    <div className="p-4 border-t border-[#383a40] space-y-4 bg-[#232428]">
                      <div className="p-2.5 bg-[#5865f2]/10 border border-[#5865f2]/20 rounded-lg text-[11px] text-[#dbdee1]">
                        <p className="font-semibold text-white mb-1">💡 المتغيرات التلقائية المتاحة للاستخدام داخل النصوص:</p>
                        <div className="flex flex-wrap gap-1.5 font-mono text-[10px] text-[#5865f2]">
                          <span className="bg-[#1e1f22] px-1.5 py-0.5 rounded border border-[#383a40]"><code>{'{user}'}</code> منشن العضو</span>
                          <span className="bg-[#1e1f22] px-1.5 py-0.5 rounded border border-[#383a40]"><code>{'{team}'}</code> اسم الفريق</span>
                          <span className="bg-[#1e1f22] px-1.5 py-0.5 rounded border border-[#383a40]"><code>{'{minutes}'}</code> مهلة الفحص</span>
                          <span className="bg-[#1e1f22] px-1.5 py-0.5 rounded border border-[#383a40]"><code>{'{voiceChannel}'}</code> روم الفويس</span>
                          <span className="bg-[#1e1f22] px-1.5 py-0.5 rounded border border-[#383a40]"><code>{'{warnCount}'}</code> رقم الإنذار</span>
                        </div>
                      </div>

                      {/* 1. Check-In Success Message */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-white flex items-center justify-between">
                          <span>1️⃣ رسالة تسجيل الدخول الناجح في الشات:</span>
                          <span className="text-[10px] text-[#949ba4]">يتم إرسالها عند كتابة {formData.checkInCmd || 'د'}</span>
                        </label>
                        <textarea
                          rows={2}
                          disabled={!canManageTeams}
                          value={formData.customCheckInMsg ?? ''}
                          onChange={(e) => handleFieldChange('customCheckInMsg', e.target.value)}
                          placeholder="الافتراضي: ✅ تم تسجيل دخولك بنجاح في [{team}]! سيتم التحقق من تواجدك في الروم الصوتي {voiceChannel} بعد {minutes} دقائق."
                          className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] text-xs font-mono leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* 2. Warning in Attendance Chat (if enabled) */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-white flex items-center justify-between">
                          <span>2️⃣ رسالة الإنذار في شات الحضور (إذا كان مفعلاً):</span>
                          <span className="text-[10px] text-[#949ba4]">ترسل للعضو بعد انتهاء المهلة</span>
                        </label>
                        <textarea
                          rows={2}
                          disabled={!canManageTeams}
                          value={formData.customWarningAttendanceMsg ?? ''}
                          onChange={(e) => handleFieldChange('customWarningAttendanceMsg', e.target.value)}
                          placeholder="الافتراضي: ⚠️ إنذار فويس! {user} مرت {minutes} دقائق على تسجيل دخولك في {team} ولست متواجداً بالفويس!"
                          className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] text-xs font-mono leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* 3. Warning in Admin Chat */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-white flex items-center justify-between">
                          <span>3️⃣ نص التنبيه الإداري في شات الإدارة:</span>
                          <span className="text-[10px] text-[#949ba4]">يرسل أعلى رسالة الإمبد لشات الإدارة</span>
                        </label>
                        <input
                          type="text"
                          disabled={!canManageTeams}
                          value={formData.customWarningAdminMsg ?? ''}
                          onChange={(e) => handleFieldChange('customWarningAdminMsg', e.target.value)}
                          placeholder="الافتراضي: 🚨 تنبيه إداري: العضو {user} عليه إنذار رسمي لعدم تواجده في روم الفويس المطلوب!"
                          className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] text-xs font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* 4. Check-Out Success Message */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-white flex items-center justify-between">
                          <span>4️⃣ رسالة تسجيل الخروج الناجح في الشات:</span>
                          <span className="text-[10px] text-[#949ba4]">يتم إرسالها عند كتابة {formData.checkOutCmd || 'خ'}</span>
                        </label>
                        <textarea
                          rows={2}
                          disabled={!canManageTeams}
                          value={formData.customCheckOutMsg ?? ''}
                          onChange={(e) => handleFieldChange('customCheckOutMsg', e.target.value)}
                          placeholder="الافتراضي: 👋 تم تسجيل خروجك بنجاح من [{team}]! شكراً لجهودك."
                          className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] text-xs font-mono leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button - ONLY VISIBLE IF USER HAS PERMISSION */}
                {canManageTeams && (
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#5865f2] hover:bg-[#4752c4] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'جاري الحفظ والمزامنة...' : `💾 حفظ كافة إعدادات ورسائل [${formData.name}]`}</span>
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Right 5 Columns: Quick Stats & Bot Instructions Card */}
            <div className="lg:col-span-5 space-y-4">
              {/* Quick KPI for this Team */}
              <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>إحصائيات هذا الفريق المباشرة:</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#383a40]">
                    <span className="text-[11px] text-[#949ba4]">الحاضرين الآن</span>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">
                      {teamActiveSessions.length} عضو
                    </div>
                  </div>

                  <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#383a40]">
                    <span className="text-[11px] text-[#949ba4]">إنذارات مسجلة</span>
                    <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                      {totalTeamWarnings} إنذار
                    </div>
                  </div>

                  <div className="col-span-2 bg-[#1e1f22] p-3 rounded-lg border border-[#383a40]">
                    <span className="text-[11px] text-[#949ba4]">إجمالي ساعات الفويس المسجلة</span>
                    <div className="text-sm font-bold text-[#57f287] font-mono mt-0.5">
                      {formatArabicDuration(totalTeamVoiceMs)}
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={exportTeamCSV}
                    disabled={teamHistory.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#dbdee1] hover:text-white bg-[#1e1f22] hover:bg-[#383a40] rounded-lg transition-colors border border-[#383a40] disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير تقرير شفتات هذا الفريق (CSV)</span>
                  </button>
                </div>
              </div>

              {/* How Bot Handles Warnings Notice */}
              <div className="bg-[#1e1f22] border border-[#383a40] rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-[#57f287]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>كيف يعمل الإنذار التلقائي؟</span>
                </div>
                <ol className="text-[#dbdee1] space-y-2 pr-4 list-decimal text-[11px] leading-relaxed">
                  <li>
                    يكتب عضو الفريق <strong className="text-white font-mono">{formData.checkInCmd}</strong> في شات الحضور المخصص.
                  </li>
                  <li>
                    يبدأ البوت عداداً تنازلياً مدته <strong className="text-white">{formData.checkMinutes} دقائق</strong>.
                  </li>
                  <li>
                    إذا انتهت المدة ولم يكن العضو متواجداً في روم الفويس المطلوب (<span className="text-[#5865F2] font-mono">{formData.targetVoiceChannelId ? 'المحدد أعلاه' : 'أي روم صوتي'}</span>):
                    <div className="mt-1 p-2 bg-[#da373c]/10 border border-[#da373c]/20 rounded text-[#fa777b]">
                      🚨 <strong>يرسل البوت تلقائياً إنذاراً في شات الإدارة</strong> (<span className="font-mono">{formData.logChannelId || 'شات الإدارة'}</span>) يوضح أن العضو عليه إنذار لعدم دخوله الفويس!
                    </div>
                  </li>
                  <li>
                    عند كتابة <strong className="text-white font-mono">{formData.checkOutCmd}</strong>، يحسب البوت الوقت الفعلي بالفويس ويرسل تقريراً مفصلاً لشات الإدارة.
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Active Members in this Team */}
          <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#1e1f22] border-b border-[#383a40] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#23a55a]" />
                <h3 className="text-sm font-bold text-white">
                  الحاضرين حالياً في [{currentTeam.name}] ({teamActiveSessions.length})
                </h3>
              </div>
              <span className="text-xs text-[#949ba4]">
                تحديث حي لحالة الفويس والإنذارات
              </span>
            </div>

            {teamActiveSessions.length === 0 ? (
              <div className="p-8 text-center text-[#949ba4]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-white">
                  لا يوجد أعضاء مسجلين دخولهم حالياً في {currentTeam.name}
                </p>
                <p className="text-[11px] text-[#949ba4] mt-0.5">
                  بإمكان الأعضاء كتابة <strong>{currentTeam.checkInCmd}</strong> في شات الفريق لبدء الشفت
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#1e1f22]/70 text-[#949ba4] border-b border-[#383a40]">
                    <tr>
                      <th className="px-4 py-2.5">العضو</th>
                      <th className="px-4 py-2.5">وقت الدخول</th>
                      <th className="px-4 py-2.5">التواجد بالفويس</th>
                      <th className="px-4 py-2.5">مدة الفويس</th>
                      <th className="px-4 py-2.5">حالة الإنذار</th>
                      <th className="px-4 py-2.5 text-left">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#383a40]">
                    {teamActiveSessions.map((session) => (
                      <tr key={session.userId} className="hover:bg-[#35373c]/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={session.userAvatar}
                              alt={session.userName}
                              className="w-7 h-7 rounded-full bg-[#1e1f22]"
                            />
                            <div>
                              <div className="font-bold text-white">{session.userName}</div>
                              <div className="text-[10px] text-[#949ba4] font-mono">{session.userTag}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[#dbdee1]">
                          {formatArabicTime(session.checkInTime)}
                        </td>

                        <td className="px-4 py-3">
                          {session.inVoiceCurrently ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#23a55a]/15 text-[#57f287] border border-[#23a55a]/30 font-medium">
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>متواجد في الفويس</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#da373c]/15 text-[#fa777b] border border-[#da373c]/30 font-medium">
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>خارج الفويس</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-[#5865f2]">
                          {formatArabicDuration(session.totalVoiceMs)}
                        </td>

                        <td className="px-4 py-3">
                          {session.warnCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#da373c]/20 text-[#fa777b] border border-[#da373c]/40 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>عليه {session.warnCount} إنذار</span>
                            </span>
                          ) : session.voiceCheckPassed === true ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#23a55a]/15 text-[#57f287]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>سليم ملتزم</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-mono">
                              جاري الفحص التلقائي...
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-left">
                          {canControlShifts ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onTriggerCheck(session.userId)}
                                title="فحص فوري للروم الصوتي"
                                className="px-2 py-1 text-[11px] font-medium text-amber-400 hover:text-white bg-[#1e1f22] hover:bg-amber-600 rounded transition-colors border border-[#383a40] cursor-pointer"
                              >
                                ⚡ فحص فوري
                              </button>
                              <button
                                onClick={() => onForceCheckout(session.userId)}
                                title="تسجيل خروج إداري"
                                className="px-2 py-1 text-[11px] font-medium text-[#da373c] hover:text-white bg-[#1e1f22] hover:bg-[#da373c] rounded transition-colors border border-[#383a40] cursor-pointer"
                              >
                                إنهاء الشفت
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#80848e] bg-[#1e1f22] px-2 py-1 rounded border border-[#383a40]">
                              مشاهدة فقط
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
