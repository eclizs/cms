import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatRupiah, formatCompact, formatDateLong, getDayStatus, STATUS_META } from "@/lib/format";

export const DayDetailDialog = ({ open, onOpenChange, date, transactions, dailyLimit, onAdd, onEdit, onDelete }) => {
  const dayTx = date ? transactions.filter((t) => t.date === date) : [];
  const total = dayTx.reduce((s, t) => s + t.amount, 0);
  const status = getDayStatus(total, dailyLimit);
  const pct = Math.min((total / dailyLimit) * 100, 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto" data-testid="day-detail-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{date ? formatDateLong(date) : ""}</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Total hari ini · {dayTx.length} transaksi</span>
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
          {dayTx.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada transfer di tanggal ini.</p>}
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

        <Button className="w-full rounded-full gap-1 font-semibold mt-1" data-testid="day-detail-add-button" onClick={() => onAdd(date)}>
          <Plus className="h-4 w-4" /> Tambah Transfer di Tanggal Ini
        </Button>
      </DialogContent>
    </Dialog>
  );
};
