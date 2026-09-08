import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Pencil, Trash2, Trash } from "lucide-react";
import { formatRupiah, formatDateLong } from "@/lib/format";

export const TransactionHistory = ({ transactions, onEdit, onDelete, onOpenTrash, trashCount = 0 }) => {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });

  return (
    <Card className="p-5 sm:p-6 border-border/80" data-testid="transaction-history-panel">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <History className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-lg font-bold tracking-tight">Riwayat Transaksi</h3>
        </div>
        <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs relative" data-testid="open-trash-button" onClick={onOpenTrash}>
          <Trash className="h-3.5 w-3.5" /> Sampah
          {trashCount > 0 && (
            <span className="ml-0.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{trashCount}</span>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{sorted.length} transaksi tercatat</p>

      <div className="h-[420px] overflow-y-auto pr-1">
        <div className="space-y-2.5">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada transaksi.</p>
          )}
          {sorted.map((t) => (
            <div
              key={t.id}
              data-testid={`history-tx-${t.id}`}
              className="group rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
                  <p className="text-xs text-muted-foreground font-mono-num truncate">{t.bank} · {t.account_number}</p>
                </div>
                <span className="font-mono-num font-bold text-sm shrink-0">{formatRupiah(t.amount)}</span>
              </div>
              {t.note && <p className="text-xs text-muted-foreground truncate mt-1">{t.note}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">{formatDateLong(t.date)}</span>
                <div className="flex opacity-70 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`history-edit-${t.id}`} onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" data-testid={`history-delete-${t.id}`} onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
