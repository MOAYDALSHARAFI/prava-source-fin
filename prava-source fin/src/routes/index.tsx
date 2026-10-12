import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  User,
  ClipboardCheck,
  Paperclip,
  Stamp,
  MessageCircle,
  Upload,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import logoUrl from "@/assets/prava-logo.png";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, fillTemplate, settingsQuery } from "@/lib/settings";
import { SectorSelect } from "@/components/SectorSelect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRAVA — نظام التوظيف الموحد" },
      {
        name: "description",
        content: "نظام التوظيف الموحد لقطاعات سيرفر PRAVA.",
      },
      { property: "og:title", content: "PRAVA — نظام التوظيف الموحد" },
      {
        property: "og:description",
        content: "قدّم على قطاعات سيرفر PRAVA من مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const MIN_AGE = 17;

const steps = [
  { id: 1, title: "الملف الشخصي", sub: "جارِ التعبئة", Icon: User },
  { id: 2, title: "التقييم", sub: "5 من 0", Icon: ClipboardCheck },
  { id: 3, title: "المرفقات والأدوار", sub: "بانتظار المرفقات", Icon: Paperclip },
  { id: 4, title: "الإصدار", sub: "لم يُصدر بعد", Icon: Stamp },
];

const requirements = [
  `أن لا يقل العمر عن ${MIN_AGE}`,
  "حسن السيرة والسلوك",
  "مايك جيد",
  "أن يكون مؤهلًا بأن يصبح فردًا من أفراد السوات",
];

const questions = [
  {
    q: "السوات تابع لأي وزارة؟",
    options: ["وزارة الداخلية", "وزارة الدفاع"],
    answer: 0,
  },
  {
    q: "متى يُسمح لك باستخدام السلاح الناري؟",
    options: ["في أي تهديد", "عند الخطر المباشر فقط"],
    answer: 1,
  },
  {
    q: "ما أول إجراء عند دخول موقع عملية؟",
    options: ["الاقتحام فورًا", "تأمين المحيط والتنسيق مع القائد"],
    answer: 1,
  },
  {
    q: "هل يجوز مخالفة أوامر القائد الميداني؟",
    options: ["نعم إذا كانت خاطئة", "لا، التنفيذ ثم الاعتراض لاحقًا"],
    answer: 1,
  },
  {
    q: "ما واجبك تجاه المدنيين أثناء العمليات؟",
    options: ["حمايتهم أولًا", "إبعادهم عن الطريق فقط"],
    answer: 0,
  },
];

const inputCls =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Index() {
  const { data: settings = DEFAULT_SETTINGS } = useQuery(settingsQuery);
  const [sector, setSector] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    discord: "",
    playerName: "",
    name: "",
    gameId: "",
    age: "",
    gender: "",
    militaryNo: "",
    officer: "",
  });

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const score = useMemo(
    () =>
      questions.reduce(
        (acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0),
        0,
      ),
    [answers],
  );

  const [roleProof, setRoleProof] = useState<string | null>(null);
  const [grantProof, setGrantProof] = useState<string | null>(null);

  const profileDone =
    form.discord.trim() !== "" &&
    form.playerName.trim() !== "" &&
    form.name.trim() !== "" &&
    form.age.trim() !== "" &&
    form.gender !== "";

  const profileStatus = profileDone ? "منجز" : "جارِ التعبئة";
  const evalSub = `5 من ${answered}`;
  const attachDone = roleProof !== null && grantProof !== null;

  const stepState = [
    { sub: profileStatus, done: profileDone },
    { sub: evalSub, done: answered === questions.length },
    { sub: attachDone ? "مكتملة" : "بانتظار المرفقات", done: attachDone },
    { sub: "لم يُصدر بعد", done: false },
  ];

  const cur = settings.sectors.find((x) => x.name === sector);
  const rankText = fillTemplate(cur?.template || settings.template, {
    militaryNo: form.militaryNo || "0000",
    playerName: form.playerName || "اسم الاعب",
    gameId: form.gameId || "الهوية",
    discord: form.discord || "<@123456789012345678>",
    sector: sector ?? "",
  });

  const copyRank = async () => {
    try {
      await navigator.clipboard.writeText(rankText);
      setCopied(true);
      toast.success("تم نسخ الطلب — افتح روم الرولات والصقه");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ، انسخه يدويًا");
    }
  };

  if (!sector) {
    return <SectorSelect settings={settings} onPick={setSector} />;
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-background px-4 py-10"
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl space-y-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-xl">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              بانتظار الرئي
            </span>
            <p
              className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground"
              dir="ltr"
            >
              PRAVA / RECRUITMENT OPS
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left">
              <h1 className="text-2xl font-extrabold text-foreground" dir="ltr">
                PRAVA
              </h1>
              <p className="text-xs text-muted-foreground">
                منصة التوظيف الموحدة
              </p>
            </div>
            <img
              src={cur?.logo || logoUrl}
              alt="PRAVA"
              className="h-14 w-14 rounded-full border border-border object-cover"
            />
          </div>
        </header>

        {/* Steps nav */}
        <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2 sm:grid-cols-4">
          {steps.map(({ id, title, Icon }, i) => {
            const active = step === id;
            return (
              <button
                key={id}
                onClick={() => setStep(id)}
                className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-right transition ${
                  active
                    ? "bg-primary/15 ring-1 ring-primary/50"
                    : "hover:bg-secondary"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold text-foreground">
                    {title}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {stepState[i]!.sub}
                  </span>
                </span>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {stepState[i]!.done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                الحد الأدنى للعمر {MIN_AGE}
              </span>
              <h2 className="text-xl font-extrabold text-foreground">
                الملف الشخصي للمتقدم
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
              {/* Side panel */}
              <aside className="space-y-4 rounded-xl border border-border bg-secondary/50 p-5">
                <div>
                  <h3 className="mb-3 text-sm font-bold text-primary">
                    شروط الالتحاق
                  </h3>
                  <ul className="space-y-2.5">
                    {requirements.map((r) => (
                      <li
                        key={r}
                        className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">حالة الملف</p>
                  <p className="mt-1 text-lg font-extrabold text-primary">
                    {profileDone ? "جاهز للتقييم" : "جارِ التعبئة"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    أكمل مراحل الملف بالترتيب
                  </p>
                </div>
              </aside>

              {/* Form */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label="Discord ID أو المنشن"
                    hint="يقبل رقم ID مباشرًا أو منشن بصيغة <@123456789012345678>."
                  >
                    <input
                      dir="ltr"
                      className={inputCls}
                      placeholder="<@123456789012345678>"
                      value={form.discord}
                      onChange={(e) =>
                        setForm({ ...form, discord: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="اسم الاعب"
                    hint="اسمك داخل اللعبة، يظهر في نص طلب الرولات."
                  >
                    <input
                      className={inputCls}
                      placeholder="ABU IBRAHIM"
                      value={form.playerName}
                      onChange={(e) =>
                        setForm({ ...form, playerName: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="اسم المتقدم">
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="هوية المتقدم داخل اللعبة">
                  <input
                    className={inputCls}
                    value={form.gameId}
                    onChange={(e) =>
                      setForm({ ...form, gameId: e.target.value })
                    }
                  />
                </Field>
                <Field label="العمر">
                  <input
                    type="number"
                    min={MIN_AGE}
                    className={inputCls}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </Field>
                <Field label="الجنس">
                  <select
                    className={inputCls}
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                  >
                    <option value="">اختر الجنس</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </Field>
                <Field label="الرقم العسكري">
                  <input
                    className={inputCls}
                    value={form.militaryNo}
                    onChange={(e) =>
                      setForm({ ...form, militaryNo: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="اليونت الحالي"
                  hint="يظهر تلقائيًا بصيغة M- حسب الرقم العسكري."
                >
                  <input
                    dir="ltr"
                    className={inputCls}
                    value={`M-${form.militaryNo}`}
                    readOnly
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="مسؤول القبول">
                    <input
                      className={inputCls}
                      value={form.officer}
                      onChange={(e) =>
                        setForm({ ...form, officer: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>

            <StepFooter
              onNext={() => setStep(2)}
              nextDisabled={!profileDone}
              nextLabel="التالي: التقييم"
            />
          </section>
        )}

        {/* Step 2 — Evaluation */}
        {step === 2 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                التصحيح الآلي فعّال
              </span>
              <h2 className="text-xl font-extrabold text-foreground">
                تقييم القبول
              </h2>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { v: `${score}/5`, l: "نتيجة التصحيح" },
                { v: String(questions.length), l: "مجموع البنود" },
                { v: String(answered), l: "تمت الإجابة" },
              ].map(({ v, l }) => (
                <div
                  key={l}
                  className="rounded-xl border border-border bg-secondary/50 px-4 py-4 text-center"
                >
                  <p className="text-xl font-extrabold text-primary">{v}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div
                  key={qi}
                  className="rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <p className="mb-3 text-sm font-bold text-foreground">
                    <span className="ml-2 text-xs text-primary">
                      {String(qi + 1).padStart(2, "0")}
                    </span>
                    {q.q}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[qi] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() =>
                            setAnswers({ ...answers, [qi]: oi })
                          }
                          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
                            selected
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {opt}
                          <span
                            className={`h-4 w-4 rounded-full border-2 ${
                              selected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <StepFooter
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={answered < questions.length}
              nextLabel="التالي: المرفقات"
            />
          </section>
        )}

        {/* Step 3 — Attachments & roles */}
        {step === 3 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                الطلب لم يُرسل
              </span>
              <h2 className="text-xl font-extrabold text-foreground">
                المرفقات وطلب الرولات
              </h2>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              ارفع الصورة المطلوبة، ثم أرسل طلب الرولات وأرفق صورة الإثبات. كلا
              الصورتين شرط للمتابعة.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Rank request */}
              <div className="rounded-xl border border-border bg-secondary/30 p-5">
                <h3 className="text-base font-bold text-foreground">
                  طلب الرولات
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  انسخ الطلب وافتح روم الرولات قبل إرفاق صورة الإثبات.
                </p>
                <pre
                  dir="ltr"
                  className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-left text-xs leading-relaxed text-foreground"
                >
                  {rankText}
                </pre>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={copyRank}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    نسخ الطلب
                  </button>
                  <a
                    href={cur?.rankUrl || settings.rankUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/20"
                  >
                    <MessageCircle className="h-4 w-4 text-primary" />
                    فتح روم الرولات
                  </a>
                </div>
              </div>

              {/* Uploads */}
              <div className="space-y-4">
                <UploadBox
                  title="إثبات إعطاء الرولات"
                  hint="الإرفاق مقفل حتى إرسال الطلب."
                  placeholder="أرسل طلب الرولات أولًا لفتح الإرفاق"
                  file={grantProof}
                  onFile={setGrantProof}
                />
                <UploadBox
                  title="صورة الرئي الرسمي"
                  hint="أرفق صورة الرئي الرسمي الخاص بك."
                  placeholder="اسحب الصورة أو اضغط للاختيار"
                  file={roleProof}
                  onFile={setRoleProof}
                />
              </div>
            </div>

            <StepFooter
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextDisabled={!attachDone}
              nextLabel="التالي: الإصدار"
            />
          </section>
        )}

        {/* Step 4 — Issuance */}
        {step === 4 && (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                لم يُصدر بعد
              </span>
              <h2 className="text-xl font-extrabold text-foreground">
                الإصدار
              </h2>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
              <Stamp className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-extrabold text-foreground">
                طلبك قيد المراجعة
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                اكتملت مراحل الملف. سيتم مراجعة طلبك من مسؤول القبول، ويُصدر
                القرار عبر روم طلب الرتب في الديسكورد. تابع إشعاراتك هناك.
              </p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">الملف</p>
                  <p className="mt-1 text-sm font-bold text-primary">منجز</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">التقييم</p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {score}/5
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">المرفقات</p>
                  <p className="mt-1 text-sm font-bold text-primary">مكتملة</p>
                </div>
              </div>
              <a
                href={settings.discordInvite}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-medium text-foreground transition hover:bg-primary/20"
              >
                <MessageCircle className="h-4 w-4 text-primary" />
                انضم إلى ديسكورد PRAVA
              </a>
            </div>

            <StepFooter onBack={() => setStep(3)} />
          </section>
        )}

        {/* Footer */}
        <footer className="flex flex-wrap items-end justify-between gap-4 pt-2 text-xs text-muted-foreground" dir="ltr">
          <div className="text-left">
            <p className="font-semibold text-primary">PRAVA</p>
            <p className="mt-1 select-all">fg_t6_85964</p>
          </div>
          <a
            href={settings.discordInvite}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-primary"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            discord.gg/qr3hVs6tQ
          </a>
        </footer>
      </div>
    </main>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel}
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function UploadBox({
  title,
  hint,
  placeholder,
  file,
  onFile,
}: {
  title: string;
  hint: string;
  placeholder: string;
  file: string | null;
  onFile: (name: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-5">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center transition hover:border-primary/50">
        <Upload className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {file ? file : placeholder}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onFile(f.name);
              toast.success("تم إرفاق الصورة");
            }
          }}
        />
      </label>
    </div>
  );
}
