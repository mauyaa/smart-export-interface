import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  COMMON_CROPS,
  checkFertilizer,
  escalate,
  extractLabel,
  type ResultCard,
  type RiskLevel,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartExports — EU compliance for Kenyan fertilizers" },
      {
        name: "description",
        content:
          "Snap a fertilizer label. Get a Safe, Risky, or Unclear verdict in seconds — grounded in EU regulations and real rejection cases.",
      },
    ],
  }),
  component: SmartExportsApp,
});

type Step = "intro" | "capture" | "confirm" | "loading" | "result" | "escalate";

function SmartExportsApp() {
  const [step, setStep] = useState<Step>("intro");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [product, setProduct] = useState("");
  const [crop, setCrop] = useState<string>("");
  const [result, setResult] = useState<ResultCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);

  // Revoke object URLs on unmount / change
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const reset = () => {
    setStep("intro");
    setPhoto(null);
    setProduct("");
    setCrop("");
    setResult(null);
    setError(null);
    setEscalated(false);
  };

  const onPhoto = async (file: File) => {
    setError(null);
    const url = URL.createObjectURL(file);
    setPhoto({ file, url });
    setStep("confirm");
    setExtracting(true);
    try {
      const { product_name } = await extractLabel(file);
      setProduct(product_name);
    } catch (e) {
      const msg = e instanceof ApiError ? e.detail : "Could not read the label. Type the product name below.";
      setError(msg);
    } finally {
      setExtracting(false);
    }
  };

  const runCheck = async () => {
    if (!product.trim() || !crop) return;
    setError(null);
    setStep("loading");
    try {
      const r = await checkFertilizer({ fertilizer_name: product.trim(), crop_name: crop });
      setResult(r);
      setStep("result");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setStep("escalate");
        return;
      }
      setError(e instanceof ApiError ? e.detail : "Something went wrong. Please retry.");
      setStep("confirm");
    }
  };

  const submitEscalate = async (contact: string, notes: string) => {
    await escalate({
      fertilizer_name: product.trim(),
      crop_name: crop,
      farmer_contact: contact || undefined,
      notes: notes || undefined,
    });
    setEscalated(true);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-6 pb-10 pt-6">
        <TopBar onReset={step !== "intro" ? reset : undefined} />

        <main className="flex-1">
          {step === "intro" && <Intro onStart={() => setStep("capture")} />}
          {step === "capture" && (
            <Capture onPhoto={onPhoto} onBack={() => setStep("intro")} />
          )}
          {step === "confirm" && photo && (
            <Confirm
              photo={photo}
              product={product}
              setProduct={setProduct}
              crop={crop}
              setCrop={setCrop}
              extracting={extracting}
              error={error}
              onSubmit={runCheck}
              onRetake={() => { setPhoto(null); setProduct(""); setStep("capture"); }}
            />
          )}
          {step === "loading" && <Loading product={product} crop={crop} />}
          {step === "result" && result && (
            <Result result={result} onAgain={reset} onEscalate={() => setStep("escalate")} />
          )}
          {step === "escalate" && (
            <Escalate
              product={product}
              crop={crop}
              done={escalated}
              onSubmit={submitEscalate}
              onDone={reset}
            />
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

/* ---------- Layout pieces ---------- */

function TopBar({ onReset }: { onReset?: () => void }) {
  return (
    <header className="flex items-center justify-between">
      <button
        onClick={onReset}
        className="group flex items-center gap-2"
        aria-label="SmartExports home"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-foreground text-background">
          <Leaf className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium tracking-tight">SmartExports</span>
      </button>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
        >
          Start over
        </button>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      <span>EU compliance · Kenya</span>
      <span>Grounded in real rejection cases</span>
    </footer>
  );
}

/* ---------- 01 · Intro ---------- */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="animate-fade-up pt-10">
      <StepLabel index="01" label="Begin" />

      <h1 className="mt-6 font-display text-[44px] leading-[0.95] tracking-tight">
        Is your fertilizer
        <br />
        <em className="font-display italic text-primary">EU-safe</em> for export?
      </h1>

      <p className="mt-5 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
        Snap the label. We check it against EU rules and real shipment rejections —
        then return a plain verdict in seconds.
      </p>

      <div className="mt-10 hairline" />

      <ul className="mt-6 space-y-4 text-[13px]">
        <Bullet n="①" title="Photograph the label" body="Front of the bag, clear light." />
        <Bullet n="②" title="Tell us the crop" body="Tea, coffee, avocado…" />
        <Bullet n="③" title="Read the verdict" body="Safe · Risky · Unclear, with reasoning." />
      </ul>

      <div className="mt-12">
        <PrimaryButton onClick={onStart}>
          Start a check
          <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
        <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Takes about 20 seconds
        </p>
      </div>
    </section>
  );
}

function Bullet({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="font-display text-xl leading-none text-primary">{n}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

/* ---------- 02 · Capture ---------- */

function Capture({
  onPhoto,
  onBack,
}: {
  onPhoto: (f: File) => void;
  onBack: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <section className="animate-fade-up pt-10">
      <StepLabel index="02" label="Photograph" />
      <h2 className="mt-6 font-display text-[34px] leading-[1] tracking-tight">
        Show us the label.
      </h2>
      <p className="mt-4 max-w-[34ch] text-[14px] text-muted-foreground">
        Hold the bag steady. Fill the frame with the front of the label so the product
        name is readable.
      </p>

      <div className="mt-8 aspect-[4/5] w-full rounded-md border border-dashed border-border bg-card/40 p-3">
        <div className="flex h-full w-full items-center justify-center rounded-sm border border-border/60 bg-paper">
          <div className="text-center">
            <CameraIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Frame here
            </p>
          </div>
        </div>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
      />

      <div className="mt-10">
        <PrimaryButton onClick={() => cameraRef.current?.click()}>
          <CameraIcon className="mr-2 h-4 w-4" />
          Open camera
        </PrimaryButton>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Upload from gallery
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- 03 · Confirm ---------- */

function Confirm({
  photo,
  product,
  setProduct,
  crop,
  setCrop,
  extracting,
  error,
  onSubmit,
  onRetake,
}: {
  photo: { file: File; url: string };
  product: string;
  setProduct: (s: string) => void;
  crop: string;
  setCrop: (s: string) => void;
  extracting: boolean;
  error: string | null;
  onSubmit: () => void;
  onRetake: () => void;
}) {
  const canSubmit = product.trim().length > 1 && crop.length > 0;
  return (
    <section className="animate-fade-up pt-8">
      <StepLabel index="03" label="Confirm" />
      <h2 className="mt-5 font-display text-[30px] leading-[1] tracking-tight">
        Confirm what we read.
      </h2>

      <div className="mt-6 flex gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
          <img src={photo.url} alt="Fertilizer label" className="h-full w-full object-cover" />
        </div>
        <button
          onClick={onRetake}
          className="self-start text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          Retake photo
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <Field label="Product on label">
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={extracting ? "Reading label…" : "e.g. Mavuno Planting"}
            className="w-full border-0 border-b border-border bg-transparent pb-2 font-display text-[26px] leading-tight tracking-tight outline-none transition focus:border-foreground"
          />
          {extracting && (
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-primary" /> Reading label
            </p>
          )}
        </Field>

        <Field label="Crop you're growing for export">
          <div className="-mx-1 mt-2 flex flex-wrap gap-2">
            {COMMON_CROPS.map((c) => (
              <button
                key={c}
                onClick={() => setCrop(c)}
                className={
                  "rounded-full border px-3 py-1.5 text-[13px] transition " +
                  (crop === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {error && (
        <p className="mt-6 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-10">
        <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>
          Check compliance
          <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/* ---------- Loading ---------- */

function Loading({ product, crop }: { product: string; crop: string }) {
  const steps = useMemo(
    () => [
      "Resolving product name",
      "Matching against EU regulations",
      "Searching rejection cases",
      "Composing verdict",
    ],
    [],
  );
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 900);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <section className="animate-fade-up flex flex-col items-center pt-24 text-center">
      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary animate-pulse-ring" />
      <h2 className="mt-10 font-display text-[26px] leading-tight tracking-tight">
        Checking <em className="italic text-primary">{product}</em> for {crop}…
      </h2>
      <ul className="mt-8 space-y-2 text-[13px] text-muted-foreground">
        {steps.map((s, idx) => (
          <li
            key={s}
            className={
              "transition-opacity " +
              (idx <= i ? "text-foreground" : "opacity-40")
            }
          >
            {idx < i ? "✓" : idx === i ? "→" : "·"} &nbsp;{s}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Result ---------- */

const RISK_THEME: Record<
  RiskLevel,
  { label: string; word: string; bg: string; fg: string; bar: string }
> = {
  Safe: {
    label: "Verdict",
    word: "Safe",
    bg: "bg-[color:var(--safe-soft)]",
    fg: "text-[color:var(--safe)]",
    bar: "bg-[color:var(--safe)]",
  },
  Risky: {
    label: "Verdict",
    word: "Risky",
    bg: "bg-[color:var(--risky-soft)]",
    fg: "text-[color:var(--risky)]",
    bar: "bg-[color:var(--risky)]",
  },
  Unclear: {
    label: "Verdict",
    word: "Unclear",
    bg: "bg-[color:var(--unclear-soft)]",
    fg: "text-[color:var(--unclear)]",
    bar: "bg-[color:var(--unclear)]",
  },
};

function Result({
  result,
  onAgain,
  onEscalate,
}: {
  result: ResultCard;
  onAgain: () => void;
  onEscalate: () => void;
}) {
  const t = RISK_THEME[result.risk_level];
  return (
    <section className="animate-fade-up pt-6">
      <StepLabel index="04" label="Verdict" />

      <div className={"mt-5 overflow-hidden rounded-md " + t.bg}>
        <div className={"h-1 w-full " + t.bar} />
        <div className="px-5 pb-6 pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/60">
            {result.fertilizer} · {result.crop}
          </p>
          <h2 className={"mt-2 font-display text-[64px] leading-[0.9] tracking-tight " + t.fg}>
            {t.word}.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-foreground">
            {result.explanation}
          </p>
        </div>
      </div>

      <Block label="What to do next">
        <p className="text-[14px] leading-relaxed">{result.next_step}</p>
      </Block>

      {result.alternative_product && (
        <Block label="Suggested alternative">
          <p className="font-display text-[24px] leading-tight tracking-tight">
            {result.alternative_product}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            A product with comparable nutrition that fits EU rules for {result.crop}.
          </p>
        </Block>
      )}

      <Block label="Match">
        <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
          {result.matched_via.startsWith("fuzzy")
            ? "Matched by fuzzy spelling"
            : "Exact match in dataset"}
        </p>
      </Block>

      <div className="mt-10 space-y-3">
        <PrimaryButton onClick={onAgain}>Check another product</PrimaryButton>
        <button
          onClick={onEscalate}
          className="block w-full text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          Flag this verdict for expert review
        </button>
      </div>
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="hairline mb-4" />
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/* ---------- Escalate ---------- */

function Escalate({
  product,
  crop,
  done,
  onSubmit,
  onDone,
}: {
  product: string;
  crop: string;
  done: boolean;
  onSubmit: (contact: string, notes: string) => Promise<void>;
  onDone: () => void;
}) {
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setSending(true);
    setErr(null);
    try {
      await onSubmit(contact, notes);
    } catch (e) {
      setErr(e instanceof ApiError ? e.detail : "Could not send. Please retry.");
    } finally {
      setSending(false);
    }
  }, [contact, notes, onSubmit]);

  if (done) {
    return (
      <section className="animate-fade-up pt-16 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--safe-soft)] text-[color:var(--safe)]">
          ✓
        </span>
        <h2 className="mt-6 font-display text-[30px] leading-tight tracking-tight">
          Sent to expert review.
        </h2>
        <p className="mx-auto mt-3 max-w-[30ch] text-[14px] text-muted-foreground">
          Our team will look into <em className="italic">{product}</em> for {crop} and follow up
          if you left contact details.
        </p>
        <div className="mt-10">
          <PrimaryButton onClick={onDone}>Done</PrimaryButton>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up pt-8">
      <StepLabel index="!" label="Not in dataset" />
      <h2 className="mt-5 font-display text-[30px] leading-[1] tracking-tight">
        We don't know this one yet.
      </h2>
      <p className="mt-3 max-w-[34ch] text-[14px] text-muted-foreground">
        <em className="italic">{product || "This product"}</em> isn't in our compliance graph.
        Send it to an agronomist for expert review — we'll add it for future farmers.
      </p>

      <div className="mt-8 space-y-6">
        <Field label="Your phone or email (optional)">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="+254… or you@example.com"
            className="w-full border-0 border-b border-border bg-transparent pb-2 text-[16px] outline-none focus:border-foreground"
          />
        </Field>
        <Field label="Anything we should know? (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Where you bought it, batch numbers, what's on the back of the label…"
            className="w-full resize-none border-0 border-b border-border bg-transparent pb-2 text-[14px] outline-none focus:border-foreground"
          />
        </Field>
      </div>

      {err && (
        <p className="mt-6 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {err}
        </p>
      )}

      <div className="mt-10 space-y-3">
        <PrimaryButton onClick={submit} disabled={sending}>
          {sending ? "Sending…" : "Send for review"}
        </PrimaryButton>
        <button
          onClick={onDone}
          className="block w-full text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

/* ---------- Atoms ---------- */

function StepLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
      <span className="font-display text-base italic text-primary">{index}</span>
      <span className="hairline flex-1" />
      <span>{label}</span>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex h-14 w-full items-center justify-center rounded-sm bg-foreground px-6 text-[14px] font-medium tracking-tight text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ---------- Inline icons (keep bundle lean) ---------- */

function Leaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 4 13C4 8 9 4 20 4c0 9-4 16-9 16Z" />
      <path d="M2 22c5-3 8-7 9-13" />
    </svg>
  );
}
function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m13 5 7 7-7 7" />
    </svg>
  );
}
function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
