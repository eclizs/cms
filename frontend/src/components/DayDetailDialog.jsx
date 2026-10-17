import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { formatRupiah, formatCompact, formatDateLong, getDayStatus, STATUS_META } from "@/lib/format";

export const DayDetailDialog = ({ open, onOpenChange, date, transactions, dailyLimit, onAdd, onEdit, onDelete }) => {
  const [senderFilter, setSenderFilter] = useState("all");
  useEffect(() => { setSenderFilter("all"); }, [date, open]);

  const dayTx = useMemo(() => (date ? transactions.filter((t) => t.date === date) : []), [transactions, date]);
  const total = dayTx.reduce((s, t) => s + t.amount, 0);
  const status = getDayStatus(total, dailyLimit);
  const pct = Math.min((total / dailyLimit) * 100, 100);

  const senderOptions = useMemo(() => {
    const map = {};
    for (const t of dayTx) {
      const key = t.sender_id || (t.sender_name ? `name:${t.sender_name}` : "none");
      if (!map[key]) map[key] = { key, label: t.sender_name || "Tanpa pengirim", count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += t.amount;
    }
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  }, [dayTx]);

  const senderKey = (t) => t.sender_id || (t.sender_name ? `name:${t.sender_name}` : "none");
  const visibleTx = senderFilter === "all" ? dayTx : dayTx.filter((t) => senderKey(t) === senderFilter);
  const visibleTotal = visibleTx.reduce((s, t) => s + t.amount, 0);
  const activeSender = senderOptions.find((s) => s.key === senderFilter);

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

        {senderOptions.length > 0 && (
          <div data-testid="day-sender-filter">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1"><Wallet className="h-3 w-3" /> Filter rekening pengirim</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                data-testid="day-sender-filter-all"
                onClick={() => setSenderFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${senderFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 text-muted-foreground"}`}
              >
                Semua ({dayTx.length})
              </button>
              {senderOptions.map((s) => (
                <button
                  key={s.key}
                  data-testid={`day-sender-filter-${s.key}`}
                  onClick={() => setSenderFilter(s.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors max-w-full truncate ${senderFilter === s.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 text-muted-foreground"}`}
                >
                  {s.label} ({s.count})
                </button>
              ))}
            </div>
            {activeSender && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs" data-testid="day-sender-subtotal">
                <span className="text-muted-foreground truncate">Subtotal dari <span className="font-semibold text-foreground">{activeSender.label}</span> · {activeSender.count} transaksi</span>
                <span className="font-mono-num font-bold shrink-0">{formatRupiah(visibleTotal)}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {dayTx.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada transfer di tanggal ini.</p>}
          {dayTx.length > 0 && visibleTx.length === 0 && <p className="text-sm text-muted-foreground text-center py-6" data-testid="day-sender-empty">Tidak ada transfer dari pengirim ini.</p>}
          {visibleTx.map((t) => (
            <div key={t.id} data-testid={`day-tx-${t.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
                <p className="text-xs text-muted-foreground truncate font-mono-num">{t.bank} · {t.account_number}</p>
                {t.sender_name && <p className="text-xs text-muted-foreground truncate">Dari: {t.sender_name} · <span className="font-mono-num">{t.sender_account}</span></p>}
                {t.transfer_time && <p className="text-xs text-muted-foreground">Jam transfer: <span className="font-mono-num">{t.transfer_time}</span></p>}
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
