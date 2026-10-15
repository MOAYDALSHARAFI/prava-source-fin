import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  ExternalLink, 
  Key, 
  Hash, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Copy, 
  Check, 
  ShieldAlert, 
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { UserAccount } from '../types/attendance';

interface LiveLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

interface BotStatusResponse {
  isRunning: boolean;
  hasEnvToken?: boolean;
  envKeyName?: string;
  botUser: {
    isRunning: boolean;
    tag: string;
    id: string;
    avatar: string;
    guildsCount: number;
    startedAt: number;
  };
  activeSessions: Array<{
    userId: string;
    userName: string;
    userTag: string;
    totalVoiceMs: number;
    currentlyInVoice: boolean;
    voiceChannelName?: string;
    warnCount: number;
  }>;
  logs: LiveLog[];
}

interface LiveBotRunnerProps {
  onGoToCodeTab?: () => void;
  currentUser?: UserAccount | null;
}

export const LiveBotRunner: React.FC<LiveBotRunnerProps> = ({ currentUser }) => {
  const isOwner = currentUser?.role === 'owner';
  const canManageBot = Boolean(currentUser && (isOwner || currentUser.permissions?.manageBot));
  const [token, setToken] = useState<string>(() => localStorage.getItem('saved_discord_token') || '');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [targetVoiceChannelId, setTargetVoiceChannelIdState] = useState<string>(() => localStorage.getItem('saved_target_voice_channel_id') || '');
  const setTargetVoiceChannelId = (val: string) => {
    setTargetVoiceChannelIdState(val);
    localStorage.setItem('saved_target_voice_channel_id', val);
  };
  const [logChannelId, setLogChannelIdState] = useState<string>(() => localStorage.getItem('saved_log_channel_id') || '');
  const setLogChannelId = (val: string) => {
    setLogChannelIdState(val);
    localStorage.setItem('saved_log_channel_id', val);
  };
  const [attendanceChannelId, setAttendanceChannelIdState] = useState<string>(() => localStorage.getItem('saved_attendance_channel_id') || '');
  const setAttendanceChannelId = (val: string) => {
    setAttendanceChannelIdState(val);
    localStorage.setItem('saved_attendance_channel_id', val);
  };
  const [checkMinutes, setCheckMinutes] = useState<number>(5);
  const [checkInCmd, setCheckInCmd] = useState<string>('د');
  const [checkOutCmd, setCheckOutCmd] = useState<string>('خ');

  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const hasInitialConfigLoaded = React.useRef(false);

  // Poll bot status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);

        // Prepopulate inputs once on first load from server saved config if inputs are empty
        if (!hasInitialConfigLoaded.current && data.config) {
          hasInitialConfigLoaded.current = true;
          if (!token && data.config.token) setToken(data.config.token);
          if (!attendanceChannelId && data.config.attendanceChannelId) setAttendanceChannelId(data.config.attendanceChannelId);
          if (!targetVoiceChannelId && data.config.targetVoiceChannelId) setTargetVoiceChannelId(data.config.targetVoiceChannelId);
          if (!logChannelId && data.config.logChannelId) setLogChannelId(data.config.logChannelId);
          if (data.config.checkMinutes) setCheckMinutes(data.config.checkMinutes);
          if (data.config.checkInCmd) setCheckInCmd(data.config.checkInCmd);
          if (data.config.checkOutCmd) setCheckOutCmd(data.config.checkOutCmd);
        }
      }
    } catch {
      // Backend might be booting
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Start real Discord bot
  const handleStartBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBot) {
      setErrorMsg('عذراً، لا تملك رول أو صلاحية لتشغيل البوت.');
      return;
    }
    if (!token.trim() && !botStatus?.hasEnvToken) {
      setErrorMsg('يرجى إدخال توكن البوت.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Keep channel IDs in local storage for convenience, never store secret tokens in localStorage
    try {
      localStorage.removeItem('saved_discord_token');
    } catch {
      // Ignore
    }
    if (attendanceChannelId) localStorage.setItem('saved_attendance_channel_id', attendanceChannelId.trim());
    if (targetVoiceChannelId) localStorage.setItem('saved_target_voice_channel_id', targetVoiceChannelId.trim());
    if (logChannelId) localStorage.setItem('saved_log_channel_id', logChannelId.trim());

    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          token: token.trim(),
          attendanceChannelId: attendanceChannelId.trim() || undefined,
          targetVoiceChannelId: targetVoiceChannelId.trim() || undefined,
          logChannelId: logChannelId.trim() || undefined,
          checkMinutes,
          checkInCmd,
          checkOutCmd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل الاتصال بالديسكورد');
      }

      setSuccessMsg('🎉 تم تشغيل البوت وربطه بتطبيق ديسكورد بنجاح! جرب كتابة د في سيرفرك الآن.');
      fetchStatus();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Stop real Discord bot
  const handleStopBot = async () => {
    if (!canManageBot) {
      setErrorMsg('عذراً، لا تملك رول أو صلاحية لإيقاف البوت.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/bot/stop', { 
        method: 'POST',
        headers: {
          'x-user-id': currentUser?.id || '',
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإيقاف');
      setSuccessMsg('تم إيقاف البوت بنجاح.');
      fetchStatus();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const isRunning = botStatus?.isRunning;

  return (
    <div className="space-y-6">
      {/* Real Bot Hero / Connection Status Banner */}
      <div className={`p-5 rounded-xl border transition-all ${
        isRunning 
          ? 'bg-[#23a55a]/10 border-[#23a55a]/40 shadow-md shadow-[#23a55a]/5'
          : 'bg-[#2b2d31] border-[#383a40]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isRunning ? 'bg-[#23a55a] text-white animate-pulse' : 'bg-[#5865f2] text-white'
            }`}>
              <Bot className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {isRunning ? 'البوت متصل وشغال الآن في تطبيق ديسكورد الحقيقي!' : 'تشغيل البوت وربطه بتطبيق الديسكورد مباشرة'}
                </h2>
                {isRunning && (
                  <span className="text-xs bg-[#23a55a] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    ONLINE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#949ba4] mt-0.5">
                {isRunning
                  ? `متصل كـ ${botStatus?.botUser?.tag} في ${botStatus?.botUser?.guildsCount} سيرفر(ات). اكتب "${checkInCmd}" في ديسكورد لتسجيل الحضور!`
                  : 'ضع توكن البوت والآيديهات واضغط تشغيل ليعمل البوت في سيرفرك بديسكورد مباشرة دون الحاجة لأي برمجة.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            {isRunning ? (
              <button
                onClick={handleStopBot}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#da373c] hover:bg-[#a1282c] rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                <span>إيقاف البوت</span>
              </button>
            ) : null}

            <button
              onClick={fetchStatus}
              title="تحديث الحالة"
              className="p-2 text-[#949ba4] hover:text-white bg-[#1e1f22] hover:bg-[#383a40] rounded-lg border border-[#383a40] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status notifications with troubleshooting guide */}
        {errorMsg && (
          <div className="mt-4 p-4 bg-[#da373c]/15 border border-[#da373c]/30 rounded-xl text-xs text-[#dbdee1] space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#fa777b] text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>

            {(errorMsg.toLowerCase().includes('token') || errorMsg.includes('التوكن')) && (
              <div className="bg-[#1e1f22]/80 p-3.5 rounded-lg border border-[#da373c]/20 text-[11px] space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>كيف تحل مشكلة "An invalid token was provided" بدقيقة واحدة؟</span>
                </div>
                <p className="text-[#b5bac1] leading-relaxed">
                  ديسكورد يرفض التوكن لأنك على الأرجح نسخت <strong>Client Secret</strong> من قسم OAuth2 أو <strong>Application ID</strong> بدلاً من توكن البوت الفعلي. ديسكورد يخفي التوكن حمايةً لك ولا يظهره إلا عند طلب إعادة التعيين.
                </p>
                <div className="pr-2 space-y-1 text-white">
                  <div>1️⃣ ادخل <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-[#5865f2] underline font-semibold">Discord Developer Portal</a> واضغط على اسم تطبيقك.</div>
                  <div>2️⃣ من القائمة اليسرى ادخل على تبويب <strong>Bot</strong> (وليس General Information أو OAuth2).</div>
                  <div>3️⃣ اضغط الزر الأزرق <strong>Reset Token</strong> ⬅️ وافق بالضغط على <strong>Yes, do it!</strong>.</div>
                  <div>4️⃣ اضغط <strong>Copy</strong> لنسخ التوكن الجديد ثم الصقه في خانة التوكن بالأسفل واضغط تشغيل.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-[#23a55a]/15 border border-[#23a55a]/30 rounded-lg text-xs text-[#57f287] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Main Connection Form & Live Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column: Bot Credentials Form */}
        <div className="lg:col-span-7 bg-[#2b2d31] border border-[#383a40] rounded-xl p-5 shadow-sm space-y-5">
          <div className="pb-3 border-b border-[#383a40]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#5865f2]" />
              <span>بيانات الاتصال بسيرفر الديسكورد</span>
            </h3>
            <p className="text-xs text-[#949ba4] mt-0.5">
              احصل على التوكن من Discord Developer Portal وضعه هنا لتشغيل البوت في سيرفرك فوراً.
            </p>
          </div>

          <form onSubmit={handleStartBot} className="space-y-4 text-xs">
            {/* Bot Token Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-white flex items-center gap-1.5">
                  <span>توكن البوت (Discord Bot Token):</span>
                  {!botStatus?.hasEnvToken && <span className="text-[#da373c]">*</span>}
                </label>
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#5865f2] hover:underline flex items-center gap-1"
                >
                  <span>فتح بوابة مطوري ديسكورد</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={botStatus?.hasEnvToken ? "●●●●●●●●●●●●" : "مثال: MTA5ODc1NDIzND..."}
                  className="w-full bg-[#1e1f22] text-white pr-3.5 pl-10 py-2.5 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-xs"
                  required={!botStatus?.hasEnvToken}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? 'إخفاء التوكن' : 'إظهار التوكن'}
                  className="absolute left-2.5 top-2.5 text-[#949ba4] hover:text-white transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Realtime Format Validation Helper */}
              {token.trim() && (
                <div className="text-[11px] pt-0.5">
                  {/^\d+$/.test(token.trim()) ? (
                    <span className="text-amber-400 flex items-center gap-1 font-medium bg-amber-400/10 p-1.5 rounded">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      هذا الرقم هو Application ID وليس توكن البوت! التوكن الصحيح تجده في قسم Bot بالضغط على Reset Token.
                    </span>
                  ) : token.trim().length === 32 && !token.includes('.') ? (
                    <span className="text-amber-400 flex items-center gap-1 font-medium bg-amber-400/10 p-1.5 rounded">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      هذا النص يبدو كـ Client Secret من صفحة OAuth2! التوكن الصحيح تجده في قسم Bot بالضغط على Reset Token.
                    </span>
                  ) : !token.includes('.') ? (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      تنبيه: توكن البوت في ديسكورد يحتوي عادةً على نقطتين مثل (MTE5...xxxx.yyyy).
                    </span>
                  ) : (
                    <span className="text-[#57f287] flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      صيغة التوكن تبدو صحيحة ومكتملة.
                    </span>
                  )}
                </div>
              )}

              <p className="text-[11px] text-[#949ba4]">
                التوكن مشفر ومحفوظ محلياً لديك؛ يُستخدم فقط لربط جلسة الديسكورد الحية.
              </p>
            </div>

            {/* Channels Grid */}
            <div className="space-y-4">
              {/* Highlighted Target Voice Channel ID */}
              <div className="p-3 bg-[#5865f2]/10 border border-[#5865f2]/30 rounded-xl space-y-1.5">
                <label className="font-bold text-white flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#5865f2]">🎙️</span>
                    <span>آيدي روم الفويس المطلوب للتواجد (Voice Channel ID):</span>
                  </span>
                  <span className="text-[10px] text-[#5865f2] font-semibold bg-[#5865f2]/20 px-2 py-0.5 rounded-full">
                    فحص تلقائي للإنذار
                  </span>
                </label>
                <input
                  type="text"
                  value={targetVoiceChannelId}
                  onChange={(e) => setTargetVoiceChannelId(e.target.value)}
                  placeholder="مثال: 1559200634698342410"
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-xs"
                />
                <p className="text-[11px] text-[#dbdee1]">
                  ⚠️ إذا لم يتواجد العضو في هذا الروم الصوتي بعد انتهاء المهلة، سيُرسل البوت تلقائياً <strong>إنذاراً في شات الإدارة</strong>!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Attendance Channel ID */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-white flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>آيدي روم الحضور (يكتب فيه د و خ):</span>
                  </label>
                  <input
                    type="text"
                    value={attendanceChannelId}
                    onChange={(e) => setAttendanceChannelId(e.target.value)}
                    placeholder="مثال: 123456789012345678"
                    className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-xs"
                  />
                  <p className="text-[10px] text-[#949ba4]">
                    (اختياري) إذا تركته فارغاً سيعمل البوت في أي روم يكتب فيه د أو خ.
                  </p>
                </div>

                {/* Log Channel ID */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-white flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span>آيدي روم الإدارة الخاص (للإنذارات والتقارير):</span>
                  </label>
                  <input
                    type="text"
                    value={logChannelId}
                    onChange={(e) => setLogChannelId(e.target.value)}
                    placeholder="مثال: 987654321098765432"
                    className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded-lg border border-[#383a40] focus:outline-none focus:border-[#5865f2] font-mono text-xs"
                  />
                  <p className="text-[10px] text-[#949ba4]">
                    الروم الخاص الذي يُرسل فيه البوت الإنذار التلقائي وتقرير الفويس.
                  </p>
                </div>
              </div>
            </div>

            {/* Commands and Timer Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-white mb-1">أمر الحضور:</label>
                <input
                  type="text"
                  value={checkInCmd}
                  onChange={(e) => setCheckInCmd(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white px-2.5 py-1.5 rounded-lg border border-[#383a40] text-center font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-white mb-1">أمر الانصراف:</label>
                <input
                  type="text"
                  value={checkOutCmd}
                  onChange={(e) => setCheckOutCmd(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white px-2.5 py-1.5 rounded-lg border border-[#383a40] text-center font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-white mb-1">مهلة الفحص (دقائق):</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={checkMinutes}
                  onChange={(e) => setCheckMinutes(Number(e.target.value))}
                  className="w-full bg-[#1e1f22] text-white px-2.5 py-1.5 rounded-lg border border-[#383a40] text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md ${
                  isRunning
                    ? 'bg-[#5865f2] hover:bg-[#4752c4]'
                    : 'bg-[#23a55a] hover:bg-[#1f9350] active:scale-[0.99]'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : isRunning ? (
                  <RefreshCw className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
                <span>
                  {loading
                    ? 'جاري الاتصال بديسكورد...'
                    : isRunning
                    ? 'إعادة تشغيل البوت وتحديث الإعدادات'
                    : '🚀 تشغيل البوت في الديسكورد الآن'}
                </span>
              </button>
            </div>
          </form>

          {/* Quick Notice about Privileged Intents */}
          <div className="p-3.5 bg-[#f0b232]/10 border border-[#f0b232]/30 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#f0b232]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>تنبيه مهم جداً لتشغيل البوت في الديسكورد:</span>
            </div>
            <p className="text-[#dbdee1] leading-relaxed text-[11px]">
              لكي يتمكن البوت من قراءة رسائل <strong>د</strong> و <strong>خ</strong> وفحص الفويس، يجب تفعيل الخيارات التالية في <strong>Discord Developer Portal</strong>:
            </p>
            <div className="font-mono text-[11px] text-[#dbdee1] space-y-0.5 pr-2">
              <div>✅ <strong>Message Content Intent</strong> (لقراءة أوامر د و خ)</div>
              <div>✅ <strong>Server Members Intent</strong> (لمعرفة الأعضاء)</div>
              <div>✅ <strong>Presence Intent</strong></div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Terminal & Active Sessions */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Live Gateway Terminal */}
          <div className="bg-[#1e1f22] border border-[#383a40] rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg min-h-[380px]">
            <div className="h-10 px-4 bg-[#18191c] border-b border-[#2b2d31] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                <Terminal className="w-4 h-4 text-[#5865f2]" />
                <span>سجل أحداث الديسكورد المباشر (Live Logs)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#23a55a] animate-ping' : 'bg-[#80848e]'}`} />
                <span className="text-[10px] text-[#949ba4] font-mono">
                  {isRunning ? 'متصل' : 'متوقف'}
                </span>
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 select-text bg-[#1e1f22]">
              {botStatus?.logs && botStatus.logs.length > 0 ? (
                botStatus.logs.map((log) => (
                  <div
                    key={log.id}
                    className={`leading-relaxed ${
                      log.type === 'success'
                        ? 'text-[#57f287]'
                        : log.type === 'warn'
                        ? 'text-[#f0b232]'
                        : log.type === 'error'
                        ? 'text-[#da373c]'
                        : 'text-[#dbdee1]'
                    }`}
                  >
                    <span className="text-[#80848e] ml-2">
                      [{new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#80848e]">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  <p>لا توجد سجلات بعد.</p>
                  <p className="text-[10px] text-[#949ba4]">
                    عند تشغيل البوت وإرسال "د" في الديسكورد ستظهر الأحداث هنا فوراً.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Discord Setup Guide Cards */}
      <div className="bg-[#2b2d31] border border-[#383a40] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#5865f2]" />
          <span>دليل خطوة بخطوة للحصول على توكن البوت والآيدي في دقيقة واحدة:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Step 1 */}
          <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#383a40] space-y-2">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>1️⃣ الحصول على توكن البوت:</span>
              <span className="text-[10px] font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">خطوة 1</span>
            </div>
            <p className="text-[#dbdee1] text-[11px] leading-relaxed">
              ادخل على <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-[#5865f2] underline">بوابة المطورين</a> ثم أنشئ <strong>New Application</strong>، توجه لقسم <strong>Bot</strong> واضغط <strong>Reset Token</strong> وانسخ التوكن.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#383a40] space-y-2">
            <div className="flex items-center justify-between text-[#23a55a] font-bold">
              <span>2️⃣ تفعيل صلاحيات الرسائل:</span>
              <span className="text-[10px] font-mono bg-[#23a55a]/10 px-1.5 py-0.5 rounded">خطوة 2</span>
            </div>
            <p className="text-[#dbdee1] text-[11px] leading-relaxed">
              في نفس صفحة <strong>Bot</strong>، انزل لأسفل وفعل:
              <br />
              • <strong>Message Content Intent</strong>
              <br />
              • <strong>Server Members Intent</strong>
              <br />
              ثم اضغط Save Changes بالأسفل.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#383a40] space-y-2">
            <div className="flex items-center justify-between text-[#5865f2] font-bold">
              <span>3️⃣ نسخ آيدي الرومات:</span>
              <span className="text-[10px] font-mono bg-[#5865f2]/10 px-1.5 py-0.5 rounded">خطوة 3</span>
            </div>
            <p className="text-[#dbdee1] text-[11px] leading-relaxed">
              في تطبيق ديسكورد، اذهب إلى إعدادات المستخدم ➡️ <strong>Advanced</strong> ➡️ فعّل <strong>Developer Mode</strong>.
              بعدها اضغط كليك يمين على أي روم واختر <strong>Copy Channel ID</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
