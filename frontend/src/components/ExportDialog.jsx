import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toISODate } from "@/lib/format";

const PERIODS = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "last7", label: "7 Hari Terakhir" },
  { key: "all", label: "Semua" },
  { key: "custom", label: "Rentang Tanggal" },
];

const dateStr = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return toISODate(d);
};

export const ExportDialog = ({ open, onOpenChange, transactions = [] }) => {
  const [period, setPeriod] = useState("today");
  const [start, setStart] = useState(dateStr(0));
  const [end, setEnd] = useState(dateStr(0));
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    if (period === "today") return [dateStr(0), dateStr(0)];
    if (period === "yesterday") return [dateStr(1), dateStr(1)];
    if (period === "last7") return [dateStr(6), dateStr(0)];
    if (period === "all") return ["2000-01-01", dateStr(0)];
    return [start, end];
  }, [period, start, end]);

  const count = useMemo(() => {
    const [s, e] = range;
    if (!s || !e) return 0;
    return transactions.filter((t) => {
      if (!t.created_at) return false;
      const local = toISODate(new Date(t.created_at));
      return local >= s && local <= e;
    }).length;
  }, [transactions, range]);

  const invalid = period === "custom" && (!start || !end || start > end);

  const handleExport = async () => {
    if (invalid) return;
    setLoading(true);
    try {
      const [s, e] = range;
      const tz_offset = -new Date().getTimezoneOffset();
      const res = await api.exportTransactions({ start: s, end: e, tz_offset });
      const match = /filename="?([^"]+)"?/.exec(res.headers["content-disposition"] || "");
      const fname = match ? match[1] : `transaksi_${s}_sd_${e}.xlsx`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`File Excel berhasil diunduh (${res.headers["x-row-count"] ?? count} transaksi)`);
      onOpenChange(false);
    } catch (e) {
      toast.error("Gagal mengunduh file Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="export-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Export Transaksi ke Excel
          </DialogTitle>
          <DialogDescription>Pilih periode berdasarkan waktu transaksi dicatat di aplikasi.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                data-testid={`export-period-${p.key}`}
                onClick={() => setPeriod(p.key)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium text-left transition-colors ${period === p.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"} ${p.key === "custom" ? "col-span-2" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="grid grid-cols-2 gap-3" data-testid="export-custom-range">
              <div className="space-y-1.5">
                <Label htmlFor="export-start" className="text-xs">Dari Tanggal</Label>
                <Input id="export-start" type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} data-testid="export-start-date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="export-end" className="text-xs">Sampai Tanggal</Label>
                <Input id="export-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} data-testid="export-end-date" />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Transaksi yang akan diexport</span>
            <span className="font-mono-num font-bold" data-testid="export-count">{count}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Kolom: Nama & Rekening Pengirim, Nama Supplier, Rekening & Bank Tujuan, Jumlah Transfer, Tanggal, Jam Transaksi, Catatan.
          </p>

          <Button className="w-full gap-2" onClick={handleExport} disabled={loading || invalid || count === 0} data-testid="export-download-btn">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {count === 0 ? "Tidak ada transaksi" : "Unduh Excel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
