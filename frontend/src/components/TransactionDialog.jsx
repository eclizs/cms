import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatRupiah, formatCompact, terbilang, getDayStatus } from "@/lib/format";

export const TransactionDialog = ({ open, onOpenChange, suppliers, editing, dailyTotals, dailyLimit, recommendations, defaultDate, onSubmit, onManageSuppliers }) => {
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState(0);
  const [txDate, setTxDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSupplierId(editing.supplier_id);
      setAmount(editing.amount);
      setTxDate(editing.date);
      setNote(editing.note || "");
    } else {
      setSupplierId(suppliers[0]?.id || "");
      setAmount(0);
      setTxDate(defaultDate || "");
      setNote("");
    }
  }, [open, editing, defaultDate, suppliers]);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const existingTotal = (dailyTotals[txDate]?.total || 0) - (editing && editing.date === txDate ? editing.amount : 0);
  const projected = existingTotal + (amount || 0);
  const status = getDayStatus(projected, dailyLimit);
  const over = projected > dailyLimit;

  const canSubmit = supplierId && amount > 0 && txDate;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ supplier_id: supplierId, amount, date: txDate, note });
  };

  const suggestions = recommendations?.suggestions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? "Ubah Transaksi" : "Catat Transfer Baru"}</DialogTitle>
          <DialogDescription>Isi detail transfer ke supplier. Sistem menghitung beban tanggal terhadap limit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <div className="flex items-center justify-between">
              <Label>Supplier</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1" onClick={onManageSuppliers} data-testid="manage-suppliers-button">
                <UserPlus className="h-3.5 w-3.5" /> Kelola Supplier
              </Button>
            </div>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="mt-1.5" data-testid="supplier-select-dropdown">
                <SelectValue placeholder="Pilih supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} data-testid={`supplier-option-${s.id}`}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {supplier && (
              <p className="text-xs text-muted-foreground mt-1.5 font-mono-num">{supplier.bank} · {supplier.account_number}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Nominal Transfer (Rp)</Label>
            <Input
              id="amount"
              data-testid="transaction-amount-input"
              inputMode="numeric"
              className="mt-1.5 font-mono-num text-lg"
              value={amount ? amount.toLocaleString("id-ID") : ""}
              onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setAmount(d ? parseInt(d, 10) : 0); }}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1.5 italic">{terbilang(amount)}</p>
          </div>

          <div>
            <Label htmlFor="date">Tanggal Transfer</Label>
            <Input id="date" data-testid="transaction-date-picker" type="date" className="mt-1.5" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-muted-foreground self-center">Saran sepi:</span>
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s.date}
                    data-testid={`inline-suggestion-${s.date}`}
                    onClick={() => setTxDate(s.date)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${txDate === s.date ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
                  >
                    {new Date(s.date + "T00:00:00").getDate()}/{new Date(s.date + "T00:00:00").getMonth() + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {txDate && amount > 0 && (
            <div data-testid="load-preview" className={`rounded-xl border p-3 text-sm ${over ? "border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900" : "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900"}`}>
              <div className="flex items-center gap-2 font-semibold">
                {over ? <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                <span className={over ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}>
                  {over ? "Melebihi limit harian" : "Masih dalam batas limit"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Beban tanggal ini menjadi <span className="font-mono-num font-semibold text-foreground">{formatCompact(projected)}</span> dari limit <span className="font-mono-num">{formatCompact(dailyLimit)}</span>
                {over && ". Pertimbangkan pindah ke tanggal lain."}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="note">Catatan / Keperluan</Label>
            <Textarea id="note" data-testid="transaction-note-input" className="mt-1.5 resize-none" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Invoice #1029 Bahan Baku" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button data-testid="submit-transaction-button" className="rounded-full font-semibold" onClick={submit} disabled={!canSubmit}>
            {editing ? "Simpan Perubahan" : "Simpan Transaksi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
