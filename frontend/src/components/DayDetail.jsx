import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { formatRupiah, formatCompact, formatDateLong, getDayStatus, STATUS_META } from "@/lib/format";

export const DayDetail = ({ date, transactions, dailyLimit, onAdd, onEdit, onDelete }) => {
  if (!date) {
    return (
      <Card className="p-6 border-border/80 h-full flex flex-col items-center justify-center text-center min-h-[220px]">
        <CalendarClock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Klik tanggal di kalender untuk melihat rincian transaksi hari itu.</p>
      </Card>
    );
  }

  const dayTx = transactions.filter((t) => t.date === date);
  const total = dayTx.reduce((s, t) => s + t.amount, 0);
  const status = getDayStatus(total, dailyLimit);
  const pct = Math.min((total / dailyLimit) * 100, 100);

  return (
    <Card className="p-5 sm:p-6 border-border/80" data-testid="day-detail-panel">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading text-lg font-bold tracking-tight">{formatDateLong(date)}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{dayTx.length} transaksi</p>
        </div>
        <Button size="sm" className="rounded-full gap-1 font-semibold shrink-0" data-testid="day-detail-add-button" onClick={() => onAdd(date)}>
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      <div className="rounded-xl bg-muted/40 p-3 mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Total hari ini</span>
          <span className="font-mono-num font-bold">{formatRupiah(total)}</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />{STATUS_META[status].label}
          </span>
          <span className="text-muted-foreground font-mono-num">Sisa {formatCompact(Math.max(dailyLimit - total, 0))}</span>
        </div>
      </div>

      <div className="space-y-2">
        {dayTx.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada transfer di tanggal ini.</p>}
        {dayTx.map((t) => (
          <div key={t.id} data-testid={`day-tx-${t.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
              <p className="text-xs text-muted-foreground truncate font-mono-num">{t.bank} · {t.account_number}</p>
              {t.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.note}</p>}
            </div>
            <span className="font-mono-num font-semibold text-sm shrink-0">{formatRupiah(t.amount)}</span>
            <div className="flex shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-tx-${t.id}`} onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" data-testid={`delete-tx-${t.id}`} onClick={() => onDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
