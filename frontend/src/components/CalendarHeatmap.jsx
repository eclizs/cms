import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { formatCompact, formatRupiah, formatDateLong, getDayStatus, STATUS_META, toISODate, MONTH_NAMES } from "@/lib/format";

const WEEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const cellTone = {
  empty: "bg-card border-border hover:border-primary/40",
  safe: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 hover:border-emerald-400",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 hover:border-amber-400",
  danger: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900 hover:border-red-400",
};
const amtTone = {
  empty: "text-muted-foreground",
  safe: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  danger: "text-red-700 dark:text-red-300",
};

export const CalendarHeatmap = ({ month, dailyTotals, dailyLimit, transactions = [], selectedDate, onSelectDay, onResultClick, onPrev, onNext, onToday }) => {
  const [query, setQuery] = useState("");
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const todayIso = toISODate(new Date());

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const results = q
    ? transactions.filter((t) =>
        (t.supplier_name || "").toLowerCase().includes(q) ||
        (t.sender_name || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q) ||
        (t.bank || "").toLowerCase().includes(q) ||
        (t.account_number || "").includes(digits && digits.length ? digits : "\u0000") ||
        (digits.length >= 3 && String(t.amount).includes(digits)) ||
        t.date.includes(q) ||
        formatDateLong(t.date).toLowerCase().includes(q)
      ).sort((a, b) => (a.date < b.date ? 1 : -1))
    : [];
  const matchingDates = new Set(results.map((r) => r.date));

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card className="p-5 sm:p-6 border-border/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight">{MONTH_NAMES[m]} {year}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Warna menunjukkan beban transfer terhadap limit harian</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button data-testid="calendar-today-button" variant="outline" size="sm" className="rounded-full text-xs" onClick={onToday}>Hari Ini</Button>
          <Button data-testid="calendar-prev-button" variant="outline" size="icon" className="rounded-full h-8 w-8" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button data-testid="calendar-next-button" variant="outline" size="icon" className="rounded-full h-8 w-8" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          data-testid="calendar-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari transaksi: supplier, rekening, catatan, nominal, atau tanggal..."
          className="pl-9 pr-9 rounded-full"
        />
        {query && (
          <button data-testid="calendar-search-clear" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}

        {q && (
          <div data-testid="calendar-search-results" className="absolute z-30 mt-2 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
              {results.length} hasil ditemukan
            </div>
            <div className="max-h-72 overflow-y-auto">
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6" data-testid="calendar-search-empty">Tidak ada transaksi yang cocok.</p>
              )}
              {results.slice(0, 30).map((t) => (
                <button
                  key={t.id}
                  data-testid={`calendar-search-result-${t.id}`}
                  onClick={() => { onResultClick(t.date); setQuery(""); }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/60 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatDateLong(t.date)}{t.note ? ` · ${t.note}` : ""}</p>
                  </div>
                  <span className="font-mono-num font-semibold text-sm shrink-0">{formatRupiah(t.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {WEEK.map((w) => (
          <div key={w} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((d, idx) => {
          if (d === null) return <div key={`e${idx}`} />;
          const iso = toISODate(new Date(year, m, d));
          const info = dailyTotals[iso] || { total: 0, count: 0 };
          const status = getDayStatus(info.total, dailyLimit);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          const isMatch = matchingDates.has(iso);
          const ring = isSelected
            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
            : isMatch
            ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background"
            : "";
          return (
            <button
              key={iso}
              data-testid={`calendar-day-cell-${iso}`}
              onClick={() => onSelectDay(iso)}
              className={`relative aspect-square sm:aspect-[4/3] rounded-lg border p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors duration-150 ${cellTone[status]} ${ring}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs sm:text-sm font-semibold ${isToday ? "grid place-items-center h-5 w-5 rounded-full bg-primary text-primary-foreground" : ""}`}>{d}</span>
                {info.count > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} />
                )}
              </div>
              <div className="leading-none">
                {info.total > 0 ? (
                  <>
                    <span className={`block text-[10px] sm:text-xs font-mono-num font-semibold ${amtTone[status]}`}>{formatCompact(info.total)}</span>
                    <span className="hidden sm:block text-[9px] text-muted-foreground">{info.count} trx</span>
                  </>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-border">
        {["safe", "warning", "danger", "empty"].map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </div>
        ))}
      </div>
    </Card>
  );
};
