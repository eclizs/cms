import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { formatRupiah, formatDateLong } from "@/lib/format";

export const TrashDialog = ({ open, onOpenChange, trash, onRestore, onPurge }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto" data-testid="trash-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Riwayat Transaksi Terhapus</DialogTitle>
          <DialogDescription>Transaksi yang dihapus disimpan di sini dan otomatis dihapus permanen setelah 7 hari.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3 -mr-3">
          <div className="space-y-2.5">
            {trash.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Tidak ada transaksi terhapus.</p>
            )}
            {trash.map((t) => (
              <div key={t.id} data-testid={`trash-tx-${t.id}`} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.supplier_name}</p>
                    <p className="text-xs text-muted-foreground font-mono-num truncate">{t.bank} · {t.account_number}</p>
                  </div>
                  <span className="font-mono-num font-bold text-sm shrink-0">{formatRupiah(t.amount)}</span>
                </div>
                {t.note && <p className="text-xs text-muted-foreground truncate mt-1">{t.note}</p>}
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-[11px] text-muted-foreground">{formatDateLong(t.date)}</span>
                  <span className="text-[11px] flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    {t.days_left > 0 ? `Dihapus permanen dalam ${t.days_left} hari` : "Akan dihapus hari ini"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <Button size="sm" variant="outline" className="rounded-full gap-1 flex-1" data-testid={`restore-tx-${t.id}`} onClick={() => onRestore(t.id)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" data-testid={`purge-tx-${t.id}`} onClick={() => onPurge(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus permanen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
