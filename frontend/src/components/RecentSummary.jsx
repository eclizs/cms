import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowUpRight, Clock } from "lucide-react";
import { formatRupiah, formatCompact, formatRelativeTime, formatDateLong } from "@/lib/format";

export const RecentSummary = ({ transactions }) => {
  const sorted = [...transactions].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const dayMs = 24 * 60 * 60 * 1000;
  const recent24 = sorted.filter((t) => t.created_at && Date.now() - new Date(t.created_at).getTime() <= dayMs);
  const recent = recent24.length > 0 ? recent24 : sorted.slice(0, 3);
  const isToday = recent24.length > 0;

  const total = recent.reduce((s, t) => s + t.amount, 0);
  const byDate = {};
  recent.forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + t.amount; });
  const dateCount = Object.keys(byDate).length;

  if (recent.length === 0) return null;

  return (
    <Card className="p-5 sm:p-6 border-border/80" data-testid="recent-summary-card">
      <div className="flex items-start justify-between gap-3 mb-4 relative">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Receipt className="h-4.5 w-4.5 h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold tracking-tight">Ringkasan Transaksi Terbaru</h3>
            <p className="text-xs text-muted-foreground">{isToday ? "Transaksi yang dijalankan dalam 24 jam terakhir" : "Transaksi terakhir yang dicatat"}</p>
          </div>
        </div>
        <Badge variant="secondary" className="font-semibold shrink-0" data-testid="recent-count-badge">{recent.length} transaksi</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 relative">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Nominal</p>
          <p className="mt-1 font-mono-num font-bold text-base sm:text-lg" data-testid="recent-total-amount">{formatRupiah(total)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Jumlah Transaksi</p>
          <p className="mt-1 font-mono-num font-bold text-base sm:text-lg">{recent.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3 col-span-2 sm:col-span-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tersebar di</p>
          <p className="mt-1 font-mono-num font-bold text-base sm:text-lg">{dateCount} tanggal</p>
        </div>
      </div>

      <div className="space-y-2 relative">
        {recent.slice(0, 5).map((t) => (
          <div key={t.id} data-testid={`recent-tx-${t.id}`} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t.sender_name ? `Dari ${t.sender_name} · ` : ""}{formatDateLong(t.date)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono-num font-semibold text-sm">{formatRupiah(t.amount)}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />{formatRelativeTime(t.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
