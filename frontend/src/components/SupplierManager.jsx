import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Pencil, Trash2, Plus, X, Building2 } from "lucide-react";

const BANKS = ["BCA", "Mandiri", "BRI", "BNI", "CIMB Niaga", "Danamon", "Permata", "BSI", "Lainnya"];
const EMPTY = { name: "", alias: "", bank: "BCA", account_number: "", contact: "" };

export const SupplierManager = ({ open, onOpenChange, suppliers, onCreate, onUpdate, onDelete }) => {
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const reset = () => { setForm(EMPTY); setEditId(null); };

  const submit = () => {
    if (!form.name || !form.account_number) return;
    if (editId) onUpdate(editId, form);
    else onCreate(form);
    reset();
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setForm({ name: s.name, alias: s.alias || "", bank: s.bank, account_number: s.account_number, contact: s.contact || "" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Kelola Supplier</DialogTitle>
          <DialogDescription>Tambah, ubah, atau hapus data supplier beserta rekening bank.</DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-5 gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nama Supplier</Label>
            <Input data-testid="supplier-name-input" className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PT / CV / Nama" />
          </div>
          <div>
            <Label className="text-xs">Bank</Label>
            <Select value={form.bank} onValueChange={(v) => setForm({ ...form, bank: v })}>
              <SelectTrigger className="mt-1" data-testid="supplier-bank-select"><SelectValue /></SelectTrigger>
              <SelectContent>{BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">No. Rekening</Label>
            <Input data-testid="supplier-account-input" className="mt-1 font-mono-num" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/[^\d]/g, "") })} placeholder="0123456789" />
          </div>
          <div className="flex items-end">
            <Button data-testid="save-supplier-button" className="w-full rounded-full font-semibold gap-1" onClick={submit} disabled={!form.name || !form.account_number}>
              {editId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editId ? "Update" : "Tambah"}
            </Button>
          </div>
          <div className="sm:col-span-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-full sm:flex-1">
              <Label className="text-xs">Beneficiary Alias</Label>
              <Input data-testid="supplier-alias-input" className="mt-1" value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="Nama singkat untuk pencarian (mis. Baja Makmur)" />
            </div>
            <div className="w-full sm:flex-1">
              <Label className="text-xs">Kontak / Sales (opsional)</Label>
              <Input data-testid="supplier-contact-input" className="mt-1" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Nama & no. HP" />
            </div>
            {editId && (
              <Button variant="ghost" size="sm" className="mt-1 sm:mt-5 gap-1 text-muted-foreground shrink-0" onClick={reset}><X className="h-4 w-4" /> Batal edit</Button>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-1">
          {suppliers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada supplier.</p>}
          {suppliers.map((s) => (
            <div key={s.id} data-testid={`supplier-row-${s.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  {s.alias && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">{s.alias}</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono-num">{s.bank} · {s.account_number}{s.contact ? ` · ${s.contact}` : ""}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`edit-supplier-${s.id}`} onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" data-testid={`delete-supplier-${s.id}`} onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
