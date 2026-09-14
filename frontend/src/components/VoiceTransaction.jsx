import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, RotateCcw, Check, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatRupiah, formatDateLong } from "@/lib/format";
import { toast } from "sonner";

const STEPS = [
  { key: "supplier", title: "Pilih Supplier", q: "Sebutkan nama supplier tujuan transfer" },
  { key: "sender", title: "Rekening Sumber Dana", q: "Sebutkan rekening pengirim / sumber dana" },
  { key: "amount", title: "Nominal Transfer", q: "Sebutkan nominal transfer, contoh: seratus juta" },
  { key: "date", title: "Tanggal Transfer", q: "Sebutkan tanggal transfer, contoh: besok atau tanggal 9 September" },
  { key: "time", title: "Jam Transfer", q: "Sebutkan jam transfer, contoh: jam 2 siang" },
  { key: "note_confirm", title: "Catatan?", q: "Apakah ingin menambahkan catatan? Jawab ya atau tidak" },
  { key: "note", title: "Isi Catatan", q: "Sebutkan catatan transaksi" },
];

const REQUIRED = ["supplier", "sender", "amount", "date", "time"];

export const VoiceTransaction = ({ open, onOpenChange, suppliers, senders, onSubmit }) => {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("steps");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [collected, setCollected] = useState({});
  const [saving, setSaving] = useState(false);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  const step = STEPS[idx];

  const resetAll = () => {
    setIdx(0); setPhase("steps"); setResult(null); setCollected({}); setRecording(false); setBusy(false);
  };

  const handleClose = (v) => { onOpenChange(v); if (!v) resetAll(); };

  const startRec = async () => {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await interpret(blob);
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      toast.error("Tidak bisa mengakses mikrofon. Izinkan akses mic di browser.");
    }
  };

  const stopRec = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    setRecording(false);
    setBusy(true);
  };

  const interpret = async (blob) => {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      fd.append("step", step.key);
      fd.append("suppliers", JSON.stringify(suppliers.map((s) => ({ id: s.id, name: s.name, alias: s.alias || "" }))));
      fd.append("senders", JSON.stringify(senders.map((s) => ({ id: s.id, name: s.name, account_number: s.account_number }))));
      const res = await api.voiceInterpret(fd);
      setResult(res);
      if (res.field && res.value !== null && res.value !== undefined) {
        setCollected((c) => ({ ...c, [res.field]: res.value }));
      }
    } catch (e) {
      toast.error("Gagal memproses suara. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const canProceed = result && (!REQUIRED.includes(step.key) ? true : result.value !== null && result.value !== undefined);

  const goNext = () => {
    if (step.key === "note_confirm") {
      setResult(null);
      if (collected.wants_note) { setIdx(STEPS.length - 1); } else { setPhase("summary"); }
      return;
    }
    if (step.key === "note") { setPhase("summary"); return; }
    setResult(null);
    setIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const supplier = suppliers.find((s) => s.id === collected.supplier_id);
  const sender = senders.find((s) => s.id === collected.sender_id);

  const save = async () => {
    setSaving(true);
    try {
      await onSubmit({
        supplier_id: collected.supplier_id,
        sender_id: collected.sender_id,
        amount: collected.amount,
        date: collected.date,
        transfer_time: collected.transfer_time || "",
        note: collected.note || "",
      });
      handleClose(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="voice-transaction-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Mic className="h-5 w-5 text-primary" /> Transaksi via Suara</DialogTitle>
          <DialogDescription>{phase === "steps" ? "Ikuti panduan, jawab tiap langkah dengan suara." : "Periksa ringkasan sebelum menyimpan."}</DialogDescription>
        </DialogHeader>

        {phase === "steps" && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              {STEPS.filter((s) => s.key !== "note").map((s, i) => (
                <div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Langkah {idx + 1} · {step.title}</p>
              <p className="mt-1 font-heading font-semibold text-base" data-testid="voice-question">{step.q}</p>
            </div>

            <div className="flex flex-col items-center gap-3 py-2">
              {!recording && !busy && (
                <Button data-testid="voice-record-button" onClick={startRec} className="h-20 w-20 rounded-full bg-primary hover:bg-primary/90 shadow-lg">
                  <Mic className="h-8 w-8" />
                </Button>
              )}
              {recording && (
                <Button data-testid="voice-stop-button" onClick={stopRec} className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 animate-pulse shadow-lg">
                  <Square className="h-7 w-7" />
                </Button>
              )}
              {busy && (
                <div className="h-20 w-20 rounded-full bg-muted grid place-items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {recording ? "Merekam... tap untuk berhenti" : busy ? "Memproses suara..." : "Tap mikrofon lalu bicara"}
              </p>
            </div>

            {result && (
              <div data-testid="voice-result" className={`rounded-xl border p-3 ${canProceed ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900" : "border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900"}`}>
                <p className="text-xs text-muted-foreground">Anda mengucapkan:</p>
                <p className="text-sm italic">"{result.transcript || "(tidak terdengar)"}"</p>
                <div className="flex items-center gap-2 mt-2">
                  {canProceed ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                  <p className="text-sm font-semibold">
                    {canProceed ? (result.label || "Dikenali") : "Tidak dikenali, silakan ulangi"}
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full flex-1 gap-1" data-testid="voice-retry-button" onClick={startRec}>
                  <RotateCcw className="h-4 w-4" /> Ulangi
                </Button>
                <Button className="rounded-full flex-1 gap-1" data-testid="voice-next-button" disabled={!canProceed} onClick={goNext}>
                  Lanjut <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "summary" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border divide-y divide-border" data-testid="voice-summary">
              {[
                ["Supplier", supplier ? supplier.name : "-"],
                ["Rekening Pengirim", sender ? `${sender.name} · ${sender.account_number}` : "-"],
                ["Nominal", collected.amount ? formatRupiah(collected.amount) : "-"],
                ["Tanggal", collected.date ? formatDateLong(collected.date) : "-"],
                ["Jam", collected.transfer_time || "-"],
                ["Catatan", collected.note || "-"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 p-2.5">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-sm font-semibold text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full flex-1 gap-1" data-testid="voice-restart-button" onClick={resetAll}>
                <RotateCcw className="h-4 w-4" /> Ulang
              </Button>
              <Button className="rounded-full flex-1 gap-1 font-semibold" data-testid="voice-save-button" onClick={save} disabled={saving || !collected.supplier_id || !collected.sender_id || !collected.amount || !collected.date}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Simpan Transaksi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
