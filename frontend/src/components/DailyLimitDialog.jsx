import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah, terbilang } from "@/lib/format";

const PRESETS = [200_000_000, 300_000_000, 500_000_000, 1_000_000_000];

export const DailyLimitDialog = ({ open, onOpenChange, currentLimit, onSave }) => {
  const [value, setValue] = useState(currentLimit);

  useEffect(() => { if (open) setValue(currentLimit); }, [open, currentLimit]);

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    setValue(digits ? parseInt(digits, 10) : 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Atur Limit Harian</DialogTitle>
          <DialogDescription>Batas nominal transfer maksimal yang nyaman dalam satu hari. Kalender akan mewarnai ulang otomatis.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label htmlFor="limit">Nominal Limit (Rp)</Label>
            <Input
              id="limit"
              data-testid="daily-limit-input"
              inputMode="numeric"
              className="mt-1.5 font-mono-num text-lg"
              value={value ? value.toLocaleString("id-ID") : ""}
              onChange={handleChange}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1.5 italic">{terbilang(value)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                data-testid={`limit-preset-${p}`}
                onClick={() => setValue(p)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${value === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
              >
                {formatRupiah(p)}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button data-testid="save-limit-button" className="rounded-full font-semibold" onClick={() => onSave(value)} disabled={!value}>Simpan Limit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
