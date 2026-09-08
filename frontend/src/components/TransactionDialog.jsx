import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, AlertTriangle, CheckCircle2, Plus, X, Settings2, ChevronsUpDown, Check } from "lucide-react";
import { formatRupiah, formatCompact, terbilang, getDayStatus } from "@/lib/format";

export const TransactionDialog = ({ open, onOpenChange, suppliers, senders, editing, dailyTotals, dailyLimit, recommendations, defaultDate, onSubmit, onManageSuppliers, onCreateSender, onManageSenders }) => {
  const [supplierId, setSupplierId] = useState("");
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [amount, setAmount] = useState(0);
  const [txDate, setTxDate] = useState("");
  const [note, setNote] = useState("");
  const [addingSender, setAddingSender] = useState(false);
  const [newSenderName, setNewSenderName] = useState("");
  const [newSenderAcc, setNewSenderAcc] = useState("");

  useEffect(() => {
    if (!open) return;
    setAddingSender(false);
    setNewSenderName("");
    setNewSenderAcc("");
    if (editing) {
      setSupplierId(editing.supplier_id);
      setSenderId(editing.sender_id || "");
      setAmount(editing.amount);
      setTxDate(editing.date);
      setNote(editing.note || "");
    } else {
      setSupplierId(suppliers[0]?.id || "");
      setSenderId(senders[0]?.id || "");
      setAmount(0);
      setTxDate(defaultDate || "");
      setNote("");
    }
  }, [open, editing, defaultDate]);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const sender = senders.find((s) => s.id === senderId);
  const existingTotal = (dailyTotals[txDate]?.total || 0) - (editing && editing.date === txDate ? editing.amount : 0);
  const projected = existingTotal + (amount || 0);
  const status = getDayStatus(projected, dailyLimit);
  const over = projected > dailyLimit;

  const canSubmit = supplierId && senderId && amount > 0 && txDate;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ supplier_id: supplierId, sender_id: senderId, amount, date: txDate, note });
  };

  const saveNewSender = async () => {
    if (!newSenderName || !newSenderAcc) return;
    const created = await onCreateSender({ name: newSenderName, account_number: newSenderAcc });
    if (created?.id) setSenderId(created.id);
    setAddingSender(false);
    setNewSenderName("");
    setNewSenderAcc("");
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
            <Popover open={supplierPickerOpen} onOpenChange={setSupplierPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  data-testid="supplier-select-dropdown"
                  className="mt-1.5 w-full justify-between font-normal"
                >
                  <span className={`truncate ${supplier ? "" : "text-muted-foreground"}`}>
                    {supplier ? supplier.name : "Cari & pilih supplier..."}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command
                  filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
                >
                  <CommandInput placeholder="Ketik nama atau alias..." data-testid="supplier-search-input" />
                  <CommandList>
                    <CommandEmpty>Supplier tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {suppliers.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.name} ${s.alias || ""} ${s.bank} ${s.account_number}`}
                          data-testid={`supplier-option-${s.id}`}
                          onSelect={() => { setSupplierId(s.id); setSupplierPickerOpen(false); }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${supplierId === s.id ? "opacity-100" : "opacity-0"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{s.name}</span>
                              {s.alias && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">{s.alias}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono-num">{s.bank} · {s.account_number}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {supplier && (
              <p className="text-xs text-muted-foreground mt-1.5 font-mono-num">{supplier.bank} · {supplier.account_number}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Rekening Pengirim</Label>
              {!addingSender && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1" data-testid="add-sender-button" onClick={() => setAddingSender(true)}>
                    <Plus className="h-3.5 w-3.5" /> Rekening Baru
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" data-testid="manage-senders-button" onClick={onManageSenders}>
                    <Settings2 className="h-3.5 w-3.5" /> Kelola
                  </Button>
                </div>
              )}
            </div>
            {addingSender ? (
              <div className="mt-1.5 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <Input data-testid="new-sender-name-input" value={newSenderName} onChange={(e) => setNewSenderName(e.target.value)} placeholder="Nama rekening (mis. Rekening Operasional BCA)" />
                <Input data-testid="new-sender-account-input" className="font-mono-num" value={newSenderAcc} onChange={(e) => setNewSenderAcc(e.target.value.replace(/[^\d]/g, ""))} placeholder="Nomor rekening" />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-full flex-1 gap-1" data-testid="save-sender-button" onClick={saveNewSender} disabled={!newSenderName || !newSenderAcc}>
                    <Plus className="h-3.5 w-3.5" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full gap-1 text-muted-foreground" onClick={() => setAddingSender(false)}>
                    <X className="h-3.5 w-3.5" /> Batal
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Select value={senderId} onValueChange={setSenderId}>
                  <SelectTrigger className="mt-1.5" data-testid="sender-select-dropdown">
                    <SelectValue placeholder="Pilih rekening pengirim" />
                  </SelectTrigger>
                  <SelectContent>
                    {senders.map((s) => (
                      <SelectItem key={s.id} value={s.id} data-testid={`sender-option-${s.id}`}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sender && (
                  <p className="text-xs text-muted-foreground mt-1.5 font-mono-num">No. Rek: {sender.account_number}</p>
                )}
              </>
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
