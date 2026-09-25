import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Pencil, Trash2, Plus, X, Building2, Search, AlertTriangle, FileSpreadsheet, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const BANKS = ["BCA", "Mandiri", "BRI", "BNI", "CIMB Niaga", "Danamon", "Permata", "BSI", "Lainnya"];
const EMPTY = { name: "", alias: "", bank: "BCA", account_number: "", contact: "" };

const downloadBlob = (res, fallback) => {
  const match = /filename="?([^"]+)"?/.exec(res.headers["content-disposition"] || "");
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = match ? match[1] : fallback;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const SupplierManager = ({ open, onOpenChange, suppliers, onCreate, onUpdate, onDelete, onImported }) => {
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [confirmDup, setConfirmDup] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const fileRef = useRef(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      const res = await api.exportSuppliers();
      downloadBlob(res, "supplier.xlsx");
      toast.success(`Daftar supplier diunduh (${res.headers["x-row-count"] ?? suppliers.length} supplier)`);
    } catch (e) {
      toast.error("Gagal mengunduh daftar supplier");
    } finally { setBusy(""); }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("import");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.importSuppliersExcel(fd);
      toast.success(`Import selesai: ${res.inserted} ditambahkan, ${res.skipped} duplikat dilewati${res.invalid ? `, ${res.invalid} baris tidak valid` : ""}`);
      onImported?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal mengimpor file Excel");
    } finally { setBusy(""); }
  };

  const reset = () => { setForm(EMPTY); setEditId(null); setConfirmDup(false); };

  const dupName = !editId && form.name.trim()
    ? suppliers.filter((s) => s.name.trim().toLowerCase() === form.name.trim().toLowerCase())
    : [];
  const dupAcc = !editId && form.account_number.trim()
    ? suppliers.filter((s) => (s.account_number || "").trim() === form.account_number.trim())
    : [];
  const hasDup = dupName.length > 0 || dupAcc.length > 0;

  const setName = (name) => { setForm({ ...form, name }); setConfirmDup(false); };
  const setAccount = (account_number) => { setForm({ ...form, account_number }); setConfirmDup(false); };

  const submit = () => {
    if (!form.name || !form.account_number) return;
    if (editId) { onUpdate(editId, form); reset(); return; }
    if (hasDup && !confirmDup) { setConfirmDup(true); return; }
    onCreate(form);
    reset();
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setConfirmDup(false);
    setForm({ name: s.name, alias: s.alias || "", bank: s.bank, account_number: s.account_number, contact: s.contact || "" });
  };

  const q = search.trim().toLowerCase();
  const filtered = suppliers.filter((s) =>
    !q || s.name.toLowerCase().includes(q) || (s.alias || "").toLowerCase().includes(q) || (s.account_number || "").includes(q)
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { reset(); setSearch(""); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Kelola Supplier</DialogTitle>
          <DialogDescription>Tambah, ubah, atau hapus data supplier beserta rekening bank.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <Button
            variant="outline" size="sm"
            className="rounded-full text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            data-testid="supplier-export-btn" onClick={handleExport} disabled={busy !== "" || suppliers.length === 0}
          >
            {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Export Excel
          </Button>
          <Button
            variant="outline" size="sm" className="rounded-full text-xs gap-1.5"
            data-testid="supplier-import-btn" onClick={() => fileRef.current?.click()} disabled={busy !== ""}
          >
            {busy === "import" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Import Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={handleImportFile} data-testid="supplier-import-input" />
          <p className="text-[11px] text-muted-foreground basis-full sm:basis-auto sm:ml-1">
            Format import: kolom <span className="font-semibold">Nama Supplier</span>, Alias, Bank, <span className="font-semibold">No. Rekening</span>, Kontak (sama dengan hasil export).
          </p>
        </div>

        <div className="grid sm:grid-cols-5 gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nama Supplier</Label>
            <Input data-testid="supplier-name-input" className="mt-1" value={form.name} onChange={(e) => setName(e.target.value)} placeholder="PT / CV / Nama" />
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
            <Input data-testid="supplier-account-input" className="mt-1 font-mono-num" value={form.account_number} onChange={(e) => setAccount(e.target.value.replace(/[^\d]/g, ""))} placeholder="0123456789" />
          </div>
          <div className="flex items-end">
            <Button data-testid="save-supplier-button" className={`w-full rounded-full font-semibold gap-1 ${confirmDup && hasDup ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`} onClick={submit} disabled={!form.name || !form.account_number}>
              {editId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editId ? "Update" : confirmDup && hasDup ? "Tetap Tambah" : "Tambah"}
            </Button>
          </div>

          {confirmDup && hasDup && (
            <div data-testid="supplier-duplicate-warning" className="sm:col-span-5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {dupAcc.length > 0 && (
                  <p data-testid="dup-account-msg"><span className="font-semibold">Nomor rekening sudah dipakai!</span> Rekening {form.account_number} sudah terdaftar untuk: {dupAcc.map((d) => `${d.name} (${d.bank})`).join(", ")}.</p>
                )}
                {dupName.length > 0 && (
                  <p data-testid="dup-name-msg"><span className="font-semibold">Nama supplier sudah terdaftar!</span> Ada {dupName.length} data untuk "{form.name.trim()}": {dupName.map((d) => `${d.bank} · ${d.account_number}`).join(", ")}.</p>
                )}
                <p>Klik <span className="font-semibold">"Tetap Tambah"</span> bila memang ingin menambahkan lagi.</p>
              </div>
            </div>
          )}

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

        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="supplier-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari supplier: nama, alias, atau nomor rekening..."
            className="pl-9 pr-9 rounded-full"
          />
          {search && (
            <button data-testid="supplier-search-clear" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">{filtered.length} dari {suppliers.length} supplier</p>

        <div className="space-y-2 min-w-0">
          {suppliers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada supplier.</p>}
          {suppliers.length > 0 && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="supplier-search-empty">Tidak ada supplier yang cocok dengan "{search}".</p>
          )}
          {filtered.map((s) => (
            <div key={s.id} data-testid={`supplier-row-${s.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  {s.alias && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0 max-w-[40%] truncate">{s.alias}</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono-num truncate">{s.bank} · {s.account_number}{s.contact ? ` · ${s.contact}` : ""}</p>
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
