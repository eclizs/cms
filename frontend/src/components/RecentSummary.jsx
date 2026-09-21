import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowUpRight, Clock, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatRelativeTime, formatDateLong, toISODate } from "@/lib/format";
import { ExportDialog } from "@/components/ExportDialog";

const FILTERS = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "last7", label: "7 Hari" },
  { key: "all", label: "Semua" },
];

const dateStr = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return toISODate(d);
};

export const RecentSummary = ({ transactions, suppliers = [] }) => {
  const [filter, setFilter] = useState("today");
  const [visibleCount, setVisibleCount] = useState(6);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => { setVisibleCount(6); }, [filter]);

  const aliasById = {};
  suppliers.forEach((s) => { if (s.alias) aliasById[s.id] = s.alias; });

  const today = dateStr(0);
  const yesterday = dateStr(1);
  const last7Start = dateStr(6);

  const matches = (t) => {
    if (filter === "today") return t.date === today;
    if (filter === "yesterday") return t.date === yesterday;
    if (filter === "last7") return t.date >= last7Start && t.date <= today;
    return true;
  };

  const filtered = transactions
    .filter(matches)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const dateCount = new Set(filtered.map((t) => t.date)).size;
  const activeLabel = FILTERS.find((f) => f.key === filter)?.label;

  return (
    <Card className="p-5 sm:p-6 border-border/80" data-testid="recent-summary-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold tracking-tight">Ringkasan Transaksi</h3>
            <p className="text-xs text-muted-foreground">Ringkasan transfer per periode</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            data-testid="export-open-btn"
            onClick={() => setExportOpen(true)}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span> Excel
          </Button>
          <Badge variant="secondary" className="font-semibold shrink-0" data-testid="recent-count-badge">{filtered.length} transaksi</Badge>
        </div>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} transactions={transactions} />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`recent-filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Nominal</p>
          <p className="mt-1 font-mono-num font-bold text-base sm:text-lg" data-testid="recent-total-amount">{formatRupiah(total)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Jumlah Transaksi</p>
          <p className="mt-1 font-mono-num font-bold text-base sm:text-lg">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3 col-span-2 sm:col-span-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tersebar di</p>
          <p className="mt-1 font-mono-num font-bold text-base sm:text-lg">{dateCount} tanggal</p>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center" data-testid="recent-empty">Tidak ada transaksi pada periode "{activeLabel}".</p>
        )}
        {filtered.slice(0, visibleCount).map((t) => (
          <div key={t.id} data-testid={`recent-tx-${t.id}`} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
                {aliasById[t.supplier_id] && (
                  <span data-testid={`recent-alias-${t.id}`} className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">{aliasById[t.supplier_id]}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {t.sender_name ? `Dari ${t.sender_name} · ` : ""}{formatDateLong(t.date)}{t.transfer_time ? ` · ${t.transfer_time}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono-num font-semibold text-sm">{formatRupiah(t.amount)}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />{formatRelativeTime(t.created_at)}</p>
            </div>
          </div>
        ))}
        {filtered.length > 6 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            {visibleCount < filtered.length && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs gap-1"
                data-testid="recent-load-more"
                onClick={() => setVisibleCount((c) => c + 10)}
              >
                <ChevronDown className="h-3.5 w-3.5" /> Tampilkan lebih banyak ({filtered.length - visibleCount})
              </Button>
            )}
            {visibleCount > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs gap-1 text-muted-foreground"
                data-testid="recent-show-less"
                onClick={() => setVisibleCount(6)}
              >
                <ChevronUp className="h-3.5 w-3.5" /> Lebih sedikit
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
