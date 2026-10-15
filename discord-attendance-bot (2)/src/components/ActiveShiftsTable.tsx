import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut,
  FastForward,
  Search
} from 'lucide-react';
import { AttendanceSession, BotConfiguration } from '../types/attendance';
import { formatArabicDuration, formatArabicTime, formatCountdown } from '../utils/formatters';

interface ActiveShiftsTableProps {
  activeSessions: Map<string, AttendanceSession>;
  config: BotConfiguration;
  onForceCheckout: (userId: string) => void;
  onTriggerCheck: (userId: string) => void;
}

export const ActiveShiftsTable: React.FC<ActiveShiftsTableProps> = ({
  activeSessions,
  config,
  onForceCheckout,
  onTriggerCheck,
}) => {
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sessionList = Array.from(activeSessions.values()).filter((s) =>
    s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userTag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-[#383a40] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1e1f22]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#23a55a]/20 text-[#23a55a] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">الشفتات النشطة حالياً</h2>
            <p className="text-xs text-[#949ba4]">
              متابعة مباشرة للأعضاء المسجلين دخولهم، وتتبع التواجد في الفويس والتحذيرات
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#949ba4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم العضو..."
            className="w-full bg-[#2b2d31] text-xs text-white placeholder-[#80848e] pr-8 pl-3 py-1.5 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2]"
          />
        </div>
      </div>

      {/* Table Content */}
      {sessionList.length === 0 ? (
        <div className="p-12 text-center text-[#949ba4] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#1e1f22] flex items-center justify-center mb-3 text-[#80848e]">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">
            لا توجد جلسات حضور نشطة حالياً
          </p>
          <p className="text-xs text-[#949ba4] max-w-sm">
            يمكنك كتابة أمر <strong className="text-[#5865f2] font-mono">{config.checkInCommand}</strong> في محاكي الشات لتسجيل الدخول والبدء في تتبع التواجد الصوتي.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1e1f22] text-[#949ba4] font-medium border-b border-[#383a40]">
              <tr>
                <th className="px-4 py-3">العضو</th>
                <th className="px-4 py-3">وقت تسجيل الدخول</th>
                <th className="px-4 py-3">إجمالي مدة الشفت</th>
                <th className="px-4 py-3">الحالة في الفويس</th>
                <th className="px-4 py-3">الوقت المسجل بالفويس</th>
                <th className="px-4 py-3">حالة فحص الـ {config.checkTimerMinutes} دقائق</th>
                <th className="px-4 py-3 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#383a40]">
              {sessionList.map((session) => {
                const elapsedShiftMs = now - session.checkInTime;

                // Compute voice time
                let liveVoiceMs = session.totalVoiceMs;
                if (session.inVoiceCurrently && session.voiceIntervals.length > 0) {
                  const last = session.voiceIntervals[session.voiceIntervals.length - 1];
                  if (!last.end) {
                    liveVoiceMs += Math.max(0, now - last.start);
                  }
                }

                // Countdown to check
                const elapsedSecs = (now - session.checkInTime) / 1000;
                const targetSecs = config.checkTimerMinutes * 60;
                const remainingSecs = Math.max(0, targetSecs - elapsedSecs);

                return (
                  <tr key={session.userId} className="hover:bg-[#35373c]/50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={session.userAvatar}
                          alt={session.userName}
                          className="w-8 h-8 rounded-full bg-[#1e1f22] border border-[#383a40]"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{session.userName}</div>
                          <div className="text-[10px] text-[#949ba4] font-mono">{session.userTag}</div>
                        </div>
                      </div>
                    </td>

                    {/* Check In Time */}
                    <td className="px-4 py-3 text-[#dbdee1] font-mono">
                      {formatArabicTime(session.checkInTime)}
                    </td>

                    {/* Total Shift Duration */}
                    <td className="px-4 py-3 font-mono font-medium text-white tabular-nums">
                      {formatArabicDuration(elapsedShiftMs)}
                    </td>

                    {/* In Voice Currently */}
                    <td className="px-4 py-3">
                      {session.inVoiceCurrently ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#23a55a]/10 text-[#23a55a] border border-[#23a55a]/20">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>متواجد في الفويس</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#da373c]/10 text-[#da373c] border border-[#da373c]/20">
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>خارج الفويس</span>
                        </span>
                      )}
                    </td>

                    {/* Voice Duration Accumulator */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#5865f2] tabular-nums">
                        {formatArabicDuration(liveVoiceMs)}
                      </span>
                    </td>

                    {/* 5-Minute Voice Check Status */}
                    <td className="px-4 py-3">
                      {session.voiceCheckPassed === null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 tabular-nums">
                            {formatCountdown(remainingSecs)}
                          </span>
                          <button
                            onClick={() => onTriggerCheck(session.userId)}
                            title="فحص فوري الآن"
                            className="text-[10px] text-[#5865f2] hover:underline font-semibold flex items-center gap-0.5"
                          >
                            <FastForward className="w-3 h-3" />
                            <span>فحص</span>
                          </button>
                        </div>
                      ) : session.voiceCheckPassed ? (
                        <span className="inline-flex items-center gap-1 text-[#23a55a] text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اجتاز الفحص</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#da373c] text-[11px] font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>تحذير ({session.warnCount})</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => onForceCheckout(session.userId)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-[#da373c]/10 hover:bg-[#da373c] text-[#da373c] hover:text-white rounded border border-[#da373c]/30 transition-colors inline-flex items-center gap-1"
                        title="تسجيل خروج العضو الآن"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>إنهاء الشفت (خ)</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
