import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Wallet } from "lucide-react";

export const SenderManager = ({ open, onOpenChange, senders, onCreate, onDelete }) => {
  const [name, setName] = useState("");
  const [acc, setAcc] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const submit = async () => {
    if (!name || !acc) return;
    await onCreate({ name, account_number: acc });
    setName("");
    setAcc("");
  };

  const confirmTarget = senders.find((s) => s.id === confirmId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto" data-testid="sender-manager-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Kelola Rekening Pengirim</DialogTitle>
          <DialogDescription>Tambah atau hapus rekening pengirim. Menyimpan nama dan nomor rekening.</DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-5 gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">Nama Rekening</Label>
            <Input data-testid="sender-mgr-name-input" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Rekening Operasional BCA" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Nomor Rekening</Label>
            <Input data-testid="sender-mgr-account-input" className="mt-1 font-mono-num" value={acc} onChange={(e) => setAcc(e.target.value.replace(/[^\d]/g, ""))} placeholder="0123456789" />
          </div>
          <div className="flex items-end">
            <Button data-testid="sender-mgr-save-button" className="w-full rounded-full font-semibold gap-1" onClick={submit} disabled={!name || !acc}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </div>
        </div>

        <div className="space-y-2 mt-1">
          {senders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada rekening pengirim.</p>}
          {senders.map((s) => (
            <div key={s.id} data-testid={`sender-row-${s.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground font-mono-num">No. Rek: {s.account_number}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" data-testid={`delete-sender-${s.id}`} onClick={() => setConfirmId(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <AlertDialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus rekening pengirim?</AlertDialogTitle>
              <AlertDialogDescription>
                Rekening "{confirmTarget?.name}" akan dihapus. Transaksi lama yang memakai rekening ini tetap menyimpan datanya.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-delete-sender">Batal</AlertDialogCancel>
              <AlertDialogAction data-testid="confirm-delete-sender" className="bg-red-600 hover:bg-red-700" onClick={() => { onDelete(confirmId); setConfirmId(null); }}>Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
