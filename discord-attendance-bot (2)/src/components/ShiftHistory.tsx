import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Clock, 
  Mic, 
  AlertTriangle, 
  CheckCircle2,
  Users,
  Calendar,
  Settings,
  Sliders,
  ChevronDown,
  Layers
} from 'lucide-react';
import { AttendanceSession } from '../types/attendance';
import { formatArabicDuration, formatArabicTime, formatArabicDate } from '../utils/formatters';

interface ShiftHistoryProps {
  history: AttendanceSession[];
  onClearHistory: () => void;
}

export const ShiftHistory: React.FC<ShiftHistoryProps> = ({ history, onClearHistory }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'compliant' | 'warned'>('all');
  const [viewMode, setViewMode] = useState<'per-member' | 'all-shifts'>('per-member');
  
  // Custom weekly commitment target in hours (default 10 hours per week)
  const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(() => {
    const saved = localStorage.getItem('bot_target_weekly_hours');
    return saved ? Number(saved) : 10;
  });

  const handleUpdateWeeklyTarget = (hours: number) => {
    const validHours = Math.max(1, Math.min(168, hours));
    setTargetWeeklyHours(validHours);
    localStorage.setItem('bot_target_weekly_hours', String(validHours));
  };

  // Group history by Member Account (same account = aggregated stats)
  const memberAccounts = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      userTag: string;
      userAvatar: string;
      totalShifts: number;
      totalVoiceMs: number;
      totalShiftMs: number;
      totalWarnings: number;
      weeklyVoiceMs: number;
      teams: Set<string>;
      lastSessionTime: number;
      sessions: AttendanceSession[];
    }>();

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    history.forEach((session) => {
      const uid = session.userId || session.userTag || session.userName;
      const shiftDuration = (session.checkOutTime || session.checkInTime) - session.checkInTime;

      if (!map.has(uid)) {
        map.set(uid, {
          userId: session.userId,
          userName: session.userName,
          userTag: session.userTag,
          userAvatar: session.userAvatar,
          totalShifts: 0,
          totalVoiceMs: 0,
          totalShiftMs: 0,
          totalWarnings: 0,
          weeklyVoiceMs: 0,
          teams: new Set<string>(),
          lastSessionTime: session.checkInTime,
          sessions: [],
        });
      }

      const acc = map.get(uid)!;
      acc.totalShifts += 1;
      acc.totalVoiceMs += session.totalVoiceMs;
      acc.totalShiftMs += shiftDuration;
      acc.totalWarnings += session.warnCount;
      if (session.checkInTime >= oneWeekAgo) {
        acc.weeklyVoiceMs += session.totalVoiceMs;
      }
      if (session.teamName) {
        acc.teams.add(session.teamName);
      }
      if (session.checkInTime > acc.lastSessionTime) {
        acc.lastSessionTime = session.checkInTime;
      }
      acc.sessions.push(session);
    });

    return Array.from(map.values());
  }, [history]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return memberAccounts.filter((m) => {
      const matchesSearch =
        m.userName.toLowerCase().includes(search.toLowerCase()) ||
        m.userTag.toLowerCase().includes(search.toLowerCase()) ||
        m.userId.includes(search);

      if (!matchesSearch) return false;

      const targetWeeklyMs = targetWeeklyHours * 3600 * 1000;
      const isCompliant = m.weeklyVoiceMs >= targetWeeklyMs && m.totalWarnings === 0;

      if (filterType === 'compliant') return isCompliant;
      if (filterType === 'warned') return m.totalWarnings > 0 || m.weeklyVoiceMs < targetWeeklyMs;
      return true;
    });
  }, [memberAccounts, search, filterType, targetWeeklyHours]);

  // Filtered shift-by-shift list
  const filteredShifts = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.userName.toLowerCase().includes(search.toLowerCase()) ||
        item.userTag.toLowerCase().includes(search.toLowerCase()) ||
        item.userId.includes(search);

      if (!matchesSearch) return false;

      if (filterType === 'compliant') return item.warnCount === 0 && item.totalVoiceMs > 0;
      if (filterType === 'warned') return item.warnCount > 0;
      return true;
    });
  }, [history, search, filterType]);

  // Overall KPIs
  const totalVoiceMs = history.reduce((acc, curr) => acc + curr.totalVoiceMs, 0);
  const totalShiftMs = history.reduce(
    (acc, curr) => acc + ((curr.checkOutTime || curr.checkInTime) - curr.checkInTime),
    0
  );
  const totalWarnings = history.reduce((acc, curr) => acc + curr.warnCount, 0);
  const complianceRate = totalShiftMs > 0 ? Math.min(100, Math.round((totalVoiceMs / totalShiftMs) * 100)) : 100;

  // Export to CSV with UTF-8 BOM
  const exportToCSV = () => {
    if (history.length === 0) return;

    if (viewMode === 'per-member') {
      const headers = ['آيدي العضو', 'اسم الحساب', 'التاق', 'الفرق والأقسام', 'إجمالي الشفتات', 'ساعات الفويس الأسبوعية', 'الهدف الأسبوعي', 'نسبة الالتزام الأسبوعي', 'إجمالي ساعات الفويس الكلي', 'التحذيرات'];
      const targetWeeklyMs = targetWeeklyHours * 3600 * 1000;
      const rows = memberAccounts.map((m) => {
        const weeklyRatio = Math.min(100, Math.round((m.weeklyVoiceMs / targetWeeklyMs) * 100));
        return [
          `"${m.userId}"`,
          `"${m.userName}"`,
          `"${m.userTag}"`,
          `"${Array.from(m.teams).join(' - ') || 'عام'}"`,
          m.totalShifts,
          `"${formatArabicDuration(m.weeklyVoiceMs)}"`,
          `"${targetWeeklyHours} ساعة"`,
          `"%${weeklyRatio}"`,
          `"${formatArabicDuration(m.totalVoiceMs)}"`,
          m.totalWarnings
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_الأعضاء_والالتزام_الأسبوعي_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['اسم العضو', 'التاق', 'القسم/الفريق', 'تاريخ الشفت', 'وقت الدخول', 'وقت الخروج', 'إجمالي مدة الشفت', 'مدة التواجد في الفويس', 'عدد التحذيرات', 'الحالة'];
      const rows = history.map((s) => {
        const shiftDuration = (s.checkOutTime || s.checkInTime) - s.checkInTime;
        return [
          `"${s.userName}"`,
          `"${s.userTag}"`,
          `"${s.teamName || 'عام'}"`,
          `"${formatArabicDate(s.checkInTime)}"`,
          `"${formatArabicTime(s.checkInTime)}"`,
          `"${s.checkOutTime ? formatArabicTime(s.checkOutTime) : '-'}"`,
          `"${formatArabicDuration(shiftDuration)}"`,
          `"${formatArabicDuration(s.totalVoiceMs)}"`,
          s.warnCount,
          `"${s.warnCount > 0 ? 'تلقى تحذير' : 'ملتزم بالفويس'}"`
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `سجل_شفتات_الفويس_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4">
      {/* Target Hours Controller Banner */}
      <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🎯 تخصيص نسبة الالتزام وساعات الفويس المطلوبة أسبوعياً</span>
            </h3>
            <p className="text-xs text-[#949ba4] mt-0.5">
              حدد عدد الساعات المطلوبة من كل عضو في الأسبوع لحساب نسبة الالتزام المئوية تلقائياً لكل حساب
            </p>
          </div>
        </div>

        {/* Target Hours Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto bg-[#1e1f22] p-2 rounded-xl border border-[#383a40]">
          <span className="text-xs font-bold text-white whitespace-nowrap">الهدف الأسبوعي:</span>
          <div className="flex items-center gap-1">
            {[5, 10, 15, 20].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => handleUpdateWeeklyTarget(hours)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  targetWeeklyHours === hours
                    ? 'bg-[#5865f2] text-white shadow-sm'
                    : 'bg-[#2b2d31] text-[#949ba4] hover:text-white hover:bg-[#383a40]'
                }`}
              >
                {hours}س
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-r border-[#383a40] pr-2 mr-1">
            <input
              type="number"
              min="1"
              max="168"
              value={targetWeeklyHours}
              onChange={(e) => handleUpdateWeeklyTarget(Number(e.target.value) || 1)}
              className="w-14 bg-[#2b2d31] text-white text-xs font-bold font-mono text-center py-1 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2]"
            />
            <span className="text-[11px] text-[#949ba4]">ساعة/أسبوع</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#383a40]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#949ba4] font-medium">عدد الحسابات المسجلة</span>
            <div className="p-1.5 rounded-lg bg-[#5865f2]/10 text-[#5865f2]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {memberAccounts.length} حساب
          </div>
          <div className="text-[11px] text-[#949ba4] mt-1">
            يتم تجميع شفتات كل حساب في ملف موحد
          </div>
        </div>

        <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#383a40]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#949ba4] font-medium">إجمالي ساعات الفويس</span>
            <div className="p-1.5 rounded-lg bg-[#23a55a]/10 text-[#23a55a]">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {formatArabicDuration(totalVoiceMs)}
          </div>
          <div className="text-[11px] text-[#949ba4] mt-1">
            مجموع المدة المسجلة داخل الرومات الصوتية
          </div>
        </div>

        <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#383a40]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#949ba4] font-medium">معدل الالتزام العام</span>
            <div className="p-1.5 rounded-lg bg-[#23a55a]/10 text-[#23a55a]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            %{complianceRate}
          </div>
          <div className="text-[11px] text-[#949ba4] mt-1">
            نسبة وقت التواجد الفعلي بالفويس
          </div>
        </div>

        <div className="bg-[#2b2d31] p-4 rounded-xl border border-[#383a40]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#949ba4] font-medium">إجمالي التحذيرات المرسلة</span>
            <div className="p-1.5 rounded-lg bg-[#da373c]/10 text-[#da373c]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">
            {totalWarnings} تحذير
          </div>
          <div className="text-[11px] text-[#949ba4] mt-1">
            شفتات تخلفت عن دخول الفويس
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#383a40] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#1e1f22]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5865f2]/20 text-[#5865f2] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#2b2d31] p-1 rounded-lg border border-[#383a40] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('per-member')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                  viewMode === 'per-member'
                    ? 'bg-[#5865f2] text-white shadow-sm'
                    : 'text-[#949ba4] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ملف الحسابات الموحد ({memberAccounts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all-shifts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${
                  viewMode === 'all-shifts'
                    ? 'bg-[#5865f2] text-white shadow-sm'
                    : 'text-[#949ba4] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>كافة الشفتات بالتفصيل ({history.length})</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-1 bg-[#2b2d31] p-1 rounded-lg border border-[#383a40] text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  filterType === 'all' ? 'bg-[#5865f2] text-white' : 'text-[#949ba4] hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterType('compliant')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  filterType === 'compliant' ? 'bg-[#23a55a] text-white' : 'text-[#949ba4] hover:text-white'
                }`}
              >
                الملتزمين
              </button>
              <button
                onClick={() => setFilterType('warned')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  filterType === 'warned' ? 'bg-[#da373c] text-white' : 'text-[#949ba4] hover:text-white'
                }`}
              >
                المقصرين / محذرين
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#949ba4]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم أو آيدي الحساب..."
                className="bg-[#2b2d31] text-xs text-white placeholder-[#80848e] pr-7 pl-3 py-1.5 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] w-40 sm:w-52"
              />
            </div>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#383a40] hover:bg-[#4e5058] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors border border-[#4e5058]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel/CSV</span>
            </button>

            {/* Clear History */}
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                title="مسح السجل"
                className="p-1.5 bg-[#da373c]/10 hover:bg-[#da373c] text-[#da373c] hover:text-white rounded-lg transition-colors border border-[#da373c]/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* View Mode 1: PER-MEMBER AGGREGATED ACCOUNT VIEW */}
        {viewMode === 'per-member' ? (
          filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-[#949ba4] flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-[#80848e] mb-2" />
              <p className="text-sm font-semibold text-white mb-0.5">لا توجد حسابات مسجلة بعد</p>
              <p className="text-xs text-[#949ba4]">
                بمجرد قيام أي عضو بكتابة أمر <strong className="text-[#23a55a]">د</strong> ثم <strong className="text-[#da373c]">خ</strong>، سيتم إنشاء ملف موحد لحسابه وحساب نسبة التزامه.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1e1f22] text-[#949ba4] font-medium border-b border-[#383a40]">
                  <tr>
                    <th className="px-4 py-3">حساب العضو</th>
                    <th className="px-4 py-3">الفرق / المهام</th>
                    <th className="px-4 py-3">عدد الشفتات</th>
                    <th className="px-4 py-3">فويس هذا الأسبوع</th>
                    <th className="px-4 py-3">نسبة الالتزام الأسبوعي ({targetWeeklyHours}س)</th>
                    <th className="px-4 py-3">إجمالي ساعات الفويس</th>
                    <th className="px-4 py-3">التحذيرات</th>
                    <th className="px-4 py-3">الحالة التقييمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383a40]">
                  {filteredMembers.map((member) => {
                    const targetWeeklyMs = targetWeeklyHours * 3600 * 1000;
                    const weeklyPercentage = Math.min(100, Math.round((member.weeklyVoiceMs / targetWeeklyMs) * 100));
                    const isWeeklyCompleted = weeklyPercentage >= 100;

                    return (
                      <tr key={member.userId || member.userTag} className="hover:bg-[#35373c]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={member.userAvatar}
                              alt={member.userName}
                              className="w-8 h-8 rounded-full bg-[#1e1f22] border border-[#383a40]"
                            />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{member.userName}</span>
                              </div>
                              <div className="text-[10px] text-[#949ba4] font-mono flex items-center gap-1">
                                <span>{member.userTag}</span>
                                {member.userId && <span>• ID: {member.userId}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {member.teams.size > 0 ? (
                              Array.from(member.teams).map((t) => (
                                <span key={t} className="bg-[#1e1f22] text-[#dbdee1] border border-[#383a40] px-2 py-0.5 rounded text-[10px] font-semibold">
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#80848e] text-[10px]">عام</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-white tabular-nums">
                          {member.totalShifts} شفت
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-[#5865f2] tabular-nums">
                          {formatArabicDuration(member.weeklyVoiceMs)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 h-2.5 bg-[#1e1f22] rounded-full overflow-hidden border border-[#383a40]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  weeklyPercentage >= 100 
                                    ? 'bg-[#23a55a]' 
                                    : weeklyPercentage >= 60 
                                    ? 'bg-[#5865f2]' 
                                    : weeklyPercentage >= 30 
                                    ? 'bg-amber-400' 
                                    : 'bg-[#da373c]'
                                }`}
                                style={{ width: `${weeklyPercentage}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-white font-bold tabular-nums">
                              %{weeklyPercentage}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#949ba4] mt-0.5 block">
                            من أصل {targetWeeklyHours} ساعات مطلوبة
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono text-[#dbdee1] tabular-nums">
                          {formatArabicDuration(member.totalVoiceMs)}
                        </td>

                        <td className="px-4 py-3">
                          {member.totalWarnings > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#da373c] bg-[#da373c]/10 px-2 py-0.5 rounded text-[10px] font-medium border border-[#da373c]/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{member.totalWarnings} تحذير</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#23a55a] bg-[#23a55a]/10 px-2 py-0.5 rounded text-[10px] font-medium border border-[#23a55a]/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>0 تحذيرات</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isWeeklyCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[#23a55a] bg-[#23a55a]/15 px-2.5 py-1 rounded-md text-[11px] font-bold border border-[#23a55a]/30">
                              <span>ملتزم بالهدف ⭐</span>
                            </span>
                          ) : weeklyPercentage >= 50 ? (
                            <span className="inline-flex items-center gap-1 text-[#5865f2] bg-[#5865f2]/15 px-2.5 py-1 rounded-md text-[11px] font-bold border border-[#5865f2]/30">
                              <span>قيد الإنجاز ⏳</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/15 px-2.5 py-1 rounded-md text-[11px] font-bold border border-amber-400/30">
                              <span>بحاجة لزيادة الساعات ⚠️</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* View Mode 2: ALL INDIVIDUAL SHIFTS TABLE */
          filteredShifts.length === 0 ? (
            <div className="p-12 text-center text-[#949ba4] flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 text-[#80848e] mb-2" />
              <p className="text-sm font-semibold text-white mb-0.5">لا توجد تقارير شفتات</p>
              <p className="text-xs text-[#949ba4]">
                ستظهر شفتات الحضور والانصراف هنا بعد قيام الأعضاء بتسجيل الخروج.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1e1f22] text-[#949ba4] font-medium border-b border-[#383a40]">
                  <tr>
                    <th className="px-4 py-3">العضو</th>
                    <th className="px-4 py-3">القسم / المهمة</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">وقت الدخول (د)</th>
                    <th className="px-4 py-3">وقت الخروج (خ)</th>
                    <th className="px-4 py-3">مدة التواجد بالفويس</th>
                    <th className="px-4 py-3">إجمالي مدة الشفت</th>
                    <th className="px-4 py-3">الالتزام بالشفت</th>
                    <th className="px-4 py-3">التحذيرات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383a40]">
                  {filteredShifts.map((session) => {
                    const shiftDuration = (session.checkOutTime || session.checkInTime) - session.checkInTime;
                    const ratio = shiftDuration > 0 ? Math.min(100, Math.round((session.totalVoiceMs / shiftDuration) * 100)) : 0;

                    return (
                      <tr key={session.id} className="hover:bg-[#35373c]/50 transition-colors">
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

                        <td className="px-4 py-3 text-[#dbdee1] font-semibold">
                          {session.teamName || 'عام'}
                        </td>

                        <td className="px-4 py-3 text-[#dbdee1]">
                          {formatArabicDate(session.checkInTime)}
                        </td>

                        <td className="px-4 py-3 text-[#dbdee1] font-mono">
                          {formatArabicTime(session.checkInTime)}
                        </td>

                        <td className="px-4 py-3 text-[#dbdee1] font-mono">
                          {session.checkOutTime ? formatArabicTime(session.checkOutTime) : '-'}
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-[#5865f2] tabular-nums">
                          {formatArabicDuration(session.totalVoiceMs)}
                        </td>

                        <td className="px-4 py-3 font-mono text-white tabular-nums">
                          {formatArabicDuration(shiftDuration)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-[#1e1f22] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ratio >= 70 ? 'bg-[#23a55a]' : ratio >= 40 ? 'bg-amber-400' : 'bg-[#da373c]'
                                }`}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-[#dbdee1] font-bold">
                              %{ratio}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {session.warnCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[#da373c] bg-[#da373c]/10 px-2 py-0.5 rounded text-[10px] font-medium border border-[#da373c]/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{session.warnCount} تحذير</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#23a55a] bg-[#23a55a]/10 px-2 py-0.5 rounded text-[10px] font-medium border border-[#23a55a]/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ملتزم ✅</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
