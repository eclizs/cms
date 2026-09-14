import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Plus, Landmark, Gauge, Mic } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export const Header = ({ dailyLimit, onNewTransaction, onVoiceTransaction, onEditLimit, theme, onToggleTheme }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-sm">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-lg tracking-tight truncate">AlokasiTransfer</span>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-semibold">PRO</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">Penjadwal & pencatat transfer supplier</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="edit-limit-badge"
            onClick={onEditLimit}
            className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/60 hover:shadow-sm transition-colors"
            title="Klik untuk ubah limit harian"
          >
            <Gauge className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Limit/hari:</span>
            <span className="font-mono-num font-semibold">{formatRupiah(dailyLimit)}</span>
          </button>

          <Button
            data-testid="theme-toggle-button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            data-testid="voice-transaction-button"
            variant="outline"
            size="icon"
            className="rounded-full border-primary/40 text-primary hover:bg-primary/10"
            onClick={onVoiceTransaction}
            title="Transaksi via suara"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <Button
            data-testid="add-transaction-button"
            onClick={onNewTransaction}
            className="rounded-full font-semibold gap-1.5 hover:-translate-y-0.5 transition-transform"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Catat Transfer</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
