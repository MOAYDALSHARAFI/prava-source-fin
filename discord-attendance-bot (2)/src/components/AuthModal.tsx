import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Gamepad2, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  AlertCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { UserAccount } from '../types/attendance';

interface AuthModalProps {
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual login fields start completely blank for privacy & security
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields: Game Username (FiveM Brava), Discord Username, Site Username, Password
  const [regGameUsername, setRegGameUsername] = useState('');
  const [regDiscordUsername, setRegDiscordUsername] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('يرجى كتابة يوزر اللعبة في فايف ام أو اسم المستخدم مع كلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'بيانات الدخول غير صحيحة');
      }

      // Store only active session token/user profile - never store raw passwords
      try {
        localStorage.setItem('site_logged_user', JSON.stringify(data.user));
        // Clean up any legacy password keys
        localStorage.removeItem('bot_saved_password');
        localStorage.removeItem('bot_saved_game_user');
        localStorage.removeItem('bot_saved_username');
        localStorage.removeItem('bot_saved_identifier');
        localStorage.removeItem('bot_remember_me');
      } catch (storageErr) {
        console.warn('Storage error:', storageErr);
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || !regDiscordUsername.trim() || !regGameUsername.trim()) {
      setError('يرجى ملء جميع الحقول: يوزر اللعبة في فايف ام برافا، يوزر الديسكورد، اسم المستخدم، وكلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPassword.trim(),
          gameUsername: regGameUsername.trim(),
          discordUsername: regDiscordUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      try {
        localStorage.setItem('site_logged_user', JSON.stringify(data.user));
        localStorage.removeItem('bot_saved_password');
        localStorage.removeItem('bot_saved_game_user');
        localStorage.removeItem('bot_saved_username');
        localStorage.removeItem('bot_saved_identifier');
        localStorage.removeItem('bot_remember_me');
      } catch (storageErr) {
        console.warn('Storage error:', storageErr);
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#2b2d31] border border-[#383a40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#1e1f22] to-[#2b2d31] border-b border-[#383a40] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865f2]/20 border border-[#5865f2]/40 flex items-center justify-center text-[#5865f2]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>سيرفر برافا فايف ام & ديسكورد</span>
              </h2>
              <p className="text-[11px] text-[#949ba4]">
                بوابة تسجيل الدخول الرسمية للنظام
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#949ba4] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Buttons: Login / Register */}
        <div className="grid grid-cols-2 p-2 bg-[#1e1f22] border-b border-[#383a40] gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'login'
                ? 'bg-[#5865f2] text-white shadow-xs'
                : 'text-[#949ba4] hover:text-white hover:bg-white/5'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'register'
                ? 'bg-[#23a55a] text-white shadow-xs'
                : 'text-[#949ba4] hover:text-white hover:bg-white/5'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>إنشاء حساب جديد</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="mb-4 p-3 bg-[#ed4245]/15 border border-[#ed4245]/40 rounded-xl flex items-center gap-2 text-[#ed4245] text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1.5">
                  يوزر اللعبة في فايف ام برافا أو اسم المستخدم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="مثال: يوزر فايف ام أو اسم المستخدم"
                    className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] outline-hidden pr-10"
                    dir="ltr"
                    autoFocus
                  />
                  <User className="w-4 h-4 text-[#80848e] absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1.5">
                  كلمة المرور (Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] outline-hidden pr-10 pl-10"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-[#80848e] absolute right-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3 text-[#80848e] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Game Username (FiveM Brava) */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1">
                  يوزر اللعبة في فايف ام برافا (FiveM Brava) <span className="text-[#ed4245]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regGameUsername}
                    onChange={(e) => setRegGameUsername(e.target.value)}
                    placeholder="اسمك داخل سيرفر فايف ام برافا"
                    className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] outline-hidden pr-10"
                    dir="ltr"
                    autoFocus
                  />
                  <Gamepad2 className="w-4 h-4 text-[#57f287] absolute right-3.5 top-3" />
                </div>
              </div>

              {/* Discord Username */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1">
                  يوزر الديسكورد (Discord Username / Tag) <span className="text-[#ed4245]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regDiscordUsername}
                    onChange={(e) => setRegDiscordUsername(e.target.value)}
                    placeholder="مثال: ahmed_dev أو Ahmed#1001"
                    className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] outline-hidden pr-10"
                    dir="ltr"
                  />
                  <span className="absolute right-3.5 top-2.5 text-base">💬</span>
                </div>
              </div>

              {/* Site Username */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1">
                  اسم المستخدم للدخول (Username / Login ID) <span className="text-[#ed4245]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="اسم مستخدم باللغة الإنجليزية"
                    className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] outline-hidden pr-10"
                    dir="ltr"
                  />
                  <User className="w-4 h-4 text-[#80848e] absolute right-3.5 top-3" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1">
                  كلمة المرور (Password) <span className="text-[#ed4245]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="اختر كلمة مرور حسابك"
                    className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#80848e] outline-hidden pr-10 pl-10"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-[#80848e] absolute right-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-3 text-[#80848e] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#1e1f22] rounded-xl border border-[#383a40] text-[11px] text-[#949ba4] leading-relaxed">
                ℹ️ <strong className="text-white">ملاحظة أمان:</strong> بعد إنشاء حسابك، ستحصل تلقائياً على رتبة عضو، وسيقوم <span className="text-amber-400 font-bold">القائد (الليدر / صاحب الموقع)</span> بتعيين الرتبة وتخصيص صلاحيات الفرق لك.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#23a55a] hover:bg-[#1f9350] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>إنشاء الحساب الآن</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
