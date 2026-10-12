import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Lock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import logoUrl from "@/assets/prava-logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { checkPin, saveSettings, type AppSettings } from "@/lib/settings";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50";

export function SectorSelect({
  settings,
  onPick,
}: {
  settings: AppSettings;
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const enabled = settings.sectors.filter((s) => s.enabled);

  return (
    <main dir="rtl" className="relative min-h-screen bg-background px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex justify-start">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
          >
            <Settings className="h-3.5 w-3.5" />
            إعدادات المنظم
          </button>
        </div>
        <div className="mt-2 flex flex-col items-center text-center">
          <img src={logoUrl} alt="PRAVA" className="h-20 w-20 rounded-full border border-border object-cover" />
          <h1 className="mt-4 text-xl font-bold text-foreground">منصة التوظيف الموحدة</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground" dir="ltr">PRAVA</p>
        </div>
        <div className="my-5 h-px bg-border" />
        <div className="space-y-2.5">
          {enabled.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد قطاعات مفتوحة حاليًا</p>
          )}
          {enabled.map((s) => (
            <button
              key={s.key}
              onClick={() => onPick(s.name)}
              className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-3.5 text-right transition hover:bg-primary/15 hover:ring-1 hover:ring-primary/50"
            >
              <span className="flex items-center gap-2">{s.logo && <img src={s.logo} alt="" className="h-7 w-7 rounded-full object-cover" />}<span className="text-sm font-bold text-foreground" dir="ltr">{s.name}</span></span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {s.subtitle}
                <ChevronLeft className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          قطاعك لا يظهر؟ تواصل مع رئاسة قطاعك ليطلبوا الإضافة
        </p>
        <div className="my-5 h-px bg-border" />
        <div className="flex items-end justify-between text-xs">
          <span className="font-mono text-muted-foreground" dir="ltr">fg_t6_85964</span>
          <span className="font-extrabold text-primary" dir="ltr">PRAVA</span>
        </div>
      </div>
      <AdminDialog open={open} onOpenChange={setOpen} settings={settings} />
    </main>
  );
}

function AdminDialog({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: AppSettings;
}) {
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [busy, setBusy] = useState(false);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setUnlocked(false);
      setPin("");
    }
  };

  const unlock = async () => {
    setBusy(true);
    const ok = await checkPin(pin);
    setBusy(false);
    if (!ok) {
      toast.error("الرمز غلط");
      return;
    }
    setDraft(settings);
    setUnlocked(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveSettings(pin, draft);
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("تم حفظ الإعدادات للجميع");
      close(false);
    } catch {
      toast.error("تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const setSector = (i: number, patch: Partial<AppSettings["sectors"][number]>) =>
    setDraft((d) => ({ ...d, sectors: d.sectors.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-right">إعدادات المنظم</DialogTitle>
        </DialogHeader>

        {!unlocked ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> اكتب رمز الدخول
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              className={inputCls}
              dir="ltr"
              aria-label="رمز الدخول"
            />
            <button
              onClick={unlock}
              disabled={busy || !pin}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              دخول
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">القطاعات</h3>
              {draft.sectors.map((s, i) => (
                <div key={s.key} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.enabled ? "مفعّل" : "مقفل"}</span>
                    <Switch checked={s.enabled} onCheckedChange={(v) => setSector(i, { enabled: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} value={s.name} onChange={(e) => setSector(i, { name: e.target.value })} aria-label="اسم القطاع" />
                    <input className={inputCls} value={s.subtitle} onChange={(e) => setSector(i, { subtitle: e.target.value })} aria-label="وصف القطاع" />
                  </div>
                  <textarea rows={4} dir="ltr" className={`${inputCls} font-mono text-xs`} placeholder="رسالة خاصة بالقطاع (فاضي = الرسالة العامة)" value={s.template ?? ""} onChange={(e) => setSector(i, { template: e.target.value })} aria-label="رسالة القطاع" />
                  <input dir="ltr" className={inputCls} placeholder="رابط روم القطاع (فاضي = العام)" value={s.rankUrl ?? ""} onChange={(e) => setSector(i, { rankUrl: e.target.value })} aria-label="رابط روم القطاع" />
                  <div className="flex items-center gap-2">
                    {s.logo && <img src={s.logo} alt="" className="h-10 w-10 rounded-full object-cover" />}
                    <input type="file" accept="image/*" className="text-xs text-muted-foreground" aria-label="شعار القطاع" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 500_000) { toast.error("الصورة كبيرة، الحد 500KB"); return; }
                      const r = new FileReader();
                      r.onload = () => setSector(i, { logo: String(r.result) });
                      r.readAsDataURL(f);
                    }} />
                    {s.logo && <button type="button" className="text-xs text-destructive" onClick={() => setSector(i, { logo: "" })}>حذف الشعار</button>}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">نص الرسالة</h3>
              <p className="text-xs text-muted-foreground">
                تقدر تستخدم: {"{militaryNo}"} الرقم العسكري، {"{playerName}"} اسم الاعب، {"{gameId}"} الهوية، {"{discord}"} منشن الديسكورد، {"{sector}"} القطاع
              </p>
              <textarea
                rows={8}
                dir="ltr"
                className={`${inputCls} font-mono text-xs`}
                value={draft.template}
                onChange={(e) => setDraft({ ...draft, template: e.target.value })}
                aria-label="نص الرسالة"
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">وين تنرسل الرسالة (رابط روم الديسكورد)</h3>
              <input dir="ltr" className={inputCls} value={draft.rankUrl} onChange={(e) => setDraft({ ...draft, rankUrl: e.target.value })} aria-label="رابط الروم" />
              <h3 className="pt-2 text-sm font-bold text-foreground">رابط دعوة السيرفر</h3>
              <input dir="ltr" className={inputCls} value={draft.discordInvite} onChange={(e) => setDraft({ ...draft, discordInvite: e.target.value })} aria-label="رابط الدعوة" />
            </section>

            <button
              onClick={save}
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              حفظ للجميع
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
