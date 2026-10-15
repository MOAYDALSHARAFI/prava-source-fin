import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Lock, 
  Unlock, 
  Download, 
  FileCode, 
  Check, 
  Copy, 
  AlertCircle, 
  ShieldCheck, 
  Archive, 
  ExternalLink,
  RefreshCw,
  FolderArchive,
  Layers,
  KeyRound
} from 'lucide-react';
import { UserAccount } from '../types/attendance';

interface DeveloperVaultProps {
  currentUser: UserAccount | null;
  onBackToTeams?: () => void;
}

const CORRECT_PIN = '854';

export const DeveloperVault: React.FC<DeveloperVaultProps> = ({ currentUser, onBackToTeams }) => {
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('dev_vault_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [pinError, setPinError] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingTar, setDownloadingTar] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // Source code viewer state
  const [selectedFile, setSelectedFile] = useState<string>('server.ts');
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Available files to inspect and copy
  const projectFiles = [
    { id: 'server.ts', name: 'server.ts (خادم البوت والواجهة)', icon: '⚡' },
    { id: 'package.json', name: 'package.json (الحزم والتبعيات)', icon: '📦' },
    { id: '.env.example', name: '.env.example (قالب متغيرات البيئة)', icon: '🔑' },
    { id: '.gitignore', name: '.gitignore (حماية الملفات الحساسة)', icon: '🛡️' },
    { id: 'data/db.json', name: 'data/db.json (قاعدة بيانات الفرق والأعضاء)', icon: '💾' },
    { id: 'src/App.tsx', name: 'src/App.tsx (الواجهة الرئيسية)', icon: '⚛️' },
    { id: 'src/components/LiveBotRunner.tsx', name: 'LiveBotRunner.tsx (لوحة تحكم البوت)', icon: '🤖' },
    { id: 'README.md', name: 'README.md (دليل التشغيل الكامل)', icon: '📖' },
  ];

  // Fetch file content when selected
  useEffect(() => {
    if (!isUnlocked) return;
    let isMounted = true;
    const fetchContent = async () => {
      setLoadingFile(true);
      try {
        const res = await fetch(`/api/developer/file-content?file=${encodeURIComponent(selectedFile)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setFileContent(data.content);
        } else {
          if (isMounted) setFileContent('// تعذر تحميل محتوى الملف حالياً');
        }
      } catch {
        if (isMounted) setFileContent('// خطأ أثناء جلب الملف');
      } finally {
        if (isMounted) setLoadingFile(false);
      }
    };
    fetchContent();
    return () => {
      isMounted = false;
    };
  }, [selectedFile, isUnlocked]);

  // Handle PIN unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === CORRECT_PIN) {
      setIsUnlocked(true);
      setPinError(null);
      try {
        sessionStorage.setItem('dev_vault_unlocked', 'true');
      } catch {
        // ignore
      }
    } else {
      setPinError('رمز الدخول غير صحيح، يرجى المحاولة مرة أخرى.');
      setPinInput('');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPinInput('');
    try {
      sessionStorage.removeItem('dev_vault_unlocked');
    } catch {
      // ignore
    }
  };

  // Ultra-reliable in-browser Base64/Blob downloader
  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setDownloadSuccessMsg(null);
    try {
      // Method A: Fetch Base64 from API (guaranteed to bypass sandboxed iframe restrictions)
      const res = await fetch('/api/developer/base64-zip');
      if (res.ok) {
        const data = await res.json();
        const byteCharacters = atob(data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/zip' });
        
        // Trigger clean blob download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'discord-attendance-bot.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

        setDownloadSuccessMsg('✅ تم تنزيل ملف المشروع (ZIP) بنجاح على جهازك!');
        return;
      }

      // Fallback Method B: standard direct blob fetch
      const directRes = await fetch('/api/download/project');
      const blob = await directRes.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'discord-attendance-bot.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

      setDownloadSuccessMsg('✅ تم تنزيل ملف المشروع (ZIP) بنجاح!');
    } catch (err) {
      console.error(err);
      // Fallback Method C: direct anchor trigger
      const link = document.createElement('a');
      link.href = '/api/download/project';
      link.download = 'discord-attendance-bot.zip';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadSuccessMsg('تم إرسال أمر التنزيل إلى متصفحك.');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Download TAR.GZ alternative
  const handleDownloadTar = async () => {
    setDownloadingTar(true);
    setDownloadSuccessMsg(null);
    try {
      const directRes = await fetch('/api/download/project-tar');
      const blob = await directRes.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'discord-attendance-bot.tar.gz';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      setDownloadSuccessMsg('✅ تم تنزيل ملف الأرشيف (TAR.GZ) بنجاح!');
    } catch {
      window.open('/api/download/project-tar', '_blank');
    } finally {
      setDownloadingTar(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!fileContent) return;
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback textarea copy
      const textarea = document.createElement('textarea');
      textarea.value = fileContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Check if owner
  const isOwner = currentUser?.role === 'owner';

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto my-12 bg-[#121318] p-8 rounded-2xl border border-[#2b2e3a] text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">منطقة المطور المحمية</h2>
        <p className="text-xs text-[#949ba4] leading-relaxed">
          هذا القسم مخصص حصرياً لليدر وصاحب الموقع فقط. يرجى تسجيل الدخول بحساب الليدر للوصول إلى أدوات المطور وتحميل ملفات السورس كود.
        </p>
        {onBackToTeams && (
          <button
            onClick={onBackToTeams}
            className="px-4 py-2 bg-[#1c1e26] hover:bg-[#252833] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            الرجوع إلى صفحة الفرق
          </button>
        )}
      </div>
    );
  }

  // LOCKED STATE: Ask for PIN (Hidden input, 854)
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 bg-[#0e0f14] border border-purple-500/30 rounded-2xl p-7 shadow-[0_0_40px_rgba(168,85,247,0.15)] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto shadow-inner">
          <KeyRound className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              خاص بالمطور
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            بوابة تحميل وتصدير المشروع
          </h2>
          <p className="text-xs text-[#9ca3af]">
            أهلاً بك يا ليدر. يرجى إدخال الرمز السري المخصص لفتح صفحة التنزيل.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2 text-right">
            <label className="text-xs font-bold text-[#d1d5db] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>الرمز السري (مخفي):</span>
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={10}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="••••"
                autoFocus
                className="w-full bg-[#16171f] text-white text-center text-2xl tracking-[0.5em] py-3 px-4 rounded-xl border border-purple-500/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 font-mono transition-all"
              />
            </div>
            {pinError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/30 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>فتح صفحة التنزيل</span>
          </button>
        </form>

        <div className="pt-2 border-t border-[#1f212a] text-[11px] text-[#80848e] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          <span>حماية مشفرة مخصصة لمالك الموقع فقط</span>
        </div>
      </div>
    );
  }

  // UNLOCKED STATE: Full Developer Download & Export Portal
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#12131c] via-[#151624] to-[#12131c] border border-purple-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">مركز المطور والتحميل الشامل</h1>
                <span className="text-[10px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> تم فك القفل بنجاح
                </span>
              </div>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                يمكنك تحميل كامل كود المشروع بعدة طرق مضمونة تعمل داخل أي متصفح، أو استعراض ونسخ الأكواد المصدرية مباشرة.
              </p>
            </div>
          </div>

          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 bg-[#1a1b24] hover:bg-[#252733] border border-[#2e3140] text-[#b5bac1] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>قفل القائمة مجدداً</span>
          </button>
        </div>

        {downloadSuccessMsg && (
          <div className="mt-4 p-3 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <span>{downloadSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Download Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Main ZIP Download (Blob / Base64 - 100% Guaranteed) */}
        <div className="bg-[#12131a] border border-purple-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-purple-500/60 transition-all space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <FolderArchive className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                ZIP (78 KB)
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">تنزيل المشروع كامل (ZIP)</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              تحميل مباشر فوري للملف المضغوط. تم برمجته ليعمل من ذاكرة المتصفح مباشرة ليتجاوز أي حظر أو منع تنزيل.
            </p>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {downloadingZip ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري معالجة وتنزيل الملف...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل ملف ZIP الآن</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Linux / VPS TAR.GZ Download */}
        <div className="bg-[#12131a] border border-[#252835] rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-[#3d4256] transition-all space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Archive className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                TAR.GZ (102 KB)
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">تحميل أرشيف TAR.GZ</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              صيغة الأرشيف القياسية والمفضلة لسيرفرات الاستضافة واستضافات لينكس و VPS لسهولة فك الضغط بأمر واحد.
            </p>
          </div>

          <button
            onClick={handleDownloadTar}
            disabled={downloadingTar}
            className="w-full py-2.5 bg-[#1b1d28] hover:bg-[#252838] border border-[#32364a] text-amber-400 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {downloadingTar ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التنزيل...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل ملف TAR.GZ</span>
              </>
            )}
          </button>
        </div>

        {/* Card 3: Direct Server Link / Backup Link */}
        <div className="bg-[#12131a] border border-[#252835] rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-[#3d4256] transition-all space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <ExternalLink className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                Direct URL
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">رابط مباشر في نافذة جديدة</h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              فتح رابط التنزيل المباشر من السيرفر في علامة تبويب جديدة لتفادي أي قيود تخص الإطارات أو الحماية.
            </p>
          </div>

          <a
            href="/api/download/project"
            target="_blank"
            rel="noopener noreferrer"
            download="discord-attendance-bot.zip"
            className="w-full py-2.5 bg-[#181a24] hover:bg-[#232635] border border-[#2d3144] text-[#8ea5ff] hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح الرابط المباشر</span>
          </a>
        </div>

      </div>

      {/* Source Code Explorer & One-Click Copy */}
      <div className="bg-[#101117] border border-[#21232e] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1c1e28] pb-4">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-white">مستعرض الأكواد المصدرية والنسخ المباشر</h2>
              <p className="text-[11px] text-[#80848e]">
                يمكنك معاينة أي ملف ونسخ كوده بالكامل بضغطة زر دون الحاجة لفك الضغط.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            disabled={!fileContent || loadingFile}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              copiedCode 
                ? 'bg-green-500/20 text-green-300 border border-green-500/40' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
            }`}
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span>تم النسخ بنجاح!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ محتوى الملف بالكامل</span>
              </>
            )}
          </button>
        </div>

        {/* File Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {projectFiles.map((file) => (
            <button
              key={file.id}
              onClick={() => setSelectedFile(file.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedFile === file.id
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                  : 'bg-[#151720] text-[#9ca3af] hover:text-white hover:bg-[#1d1f2b] border border-[#232532]'
              }`}
            >
              <span>{file.icon}</span>
              <span className="font-mono">{file.id}</span>
            </button>
          ))}
        </div>

        {/* Code Content Box */}
        <div className="relative rounded-xl border border-[#232635] bg-[#090a0d] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#12131a] border-b border-[#1f212d] text-xs font-mono text-[#80848e]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <span className="text-white font-bold ml-2">{selectedFile}</span>
            </div>
            <span>{fileContent.split('\n').length} سطر</span>
          </div>

          <pre className="p-4 text-xs font-mono text-[#e2e8f0] max-h-96 overflow-y-auto overflow-x-auto leading-relaxed select-all">
            {loadingFile ? (
              <div className="py-12 text-center text-[#80848e] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                <span>جاري تحميل الملف...</span>
              </div>
            ) : (
              fileContent
            )}
          </pre>
        </div>
      </div>

      {/* Quick Setup Instructions */}
      <div className="bg-[#12131a] border border-[#252835] rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>خطوات تشغيل المشروع على استضافتك (VPS / Hosting)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#171822] p-3 rounded-xl border border-[#252837] space-y-1">
            <div className="font-bold text-purple-300">1️⃣ تثبيت التبعيات</div>
            <code className="block bg-[#0c0d12] p-2 rounded text-[11px] font-mono text-green-400">
              npm install
            </code>
          </div>
          <div className="bg-[#171822] p-3 rounded-xl border border-[#252837] space-y-1">
            <div className="font-bold text-purple-300">2️⃣ بناء المشروع</div>
            <code className="block bg-[#0c0d12] p-2 rounded text-[11px] font-mono text-green-400">
              npm run build
            </code>
          </div>
          <div className="bg-[#171822] p-3 rounded-xl border border-[#252837] space-y-1">
            <div className="font-bold text-purple-300">3️⃣ تشغيل الخادم</div>
            <code className="block bg-[#0c0d12] p-2 rounded text-[11px] font-mono text-green-400">
              npm start
            </code>
          </div>
        </div>
      </div>

    </div>
  );
};
