import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { formatRupiah, formatCompact, formatDateLong } from "@/lib/format";

export const SmartRecommendations = ({ recommendations, onPick }) => {
  const suggestions = recommendations?.suggestions || [];
  return (
    <Card className="p-5 sm:p-6 border-border/80 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="font-heading text-lg font-bold tracking-tight">Rekomendasi Tanggal</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Tanggal terdekat dengan beban transfer paling sedikit</p>

      <div className="space-y-2.5">
        {suggestions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Semua tanggal terdekat sudah penuh. Naikkan limit harian.</p>
        )}
        {suggestions.map((s, i) => (
          <div
            key={s.date}
            data-testid={`smart-date-suggestion-${i}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/50 hover:shadow-sm transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{formatDateLong(s.date)}</span>
                {i === 0 && <span className="text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5">Terbaik</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Terpakai <span className="font-mono-num">{formatRupiah(s.total)}</span> · Sisa kuota <span className="font-mono-num text-emerald-600 dark:text-emerald-400">{formatRupiah(s.remaining)}</span>
              </p>
            </div>
            <Button
              data-testid={`pick-suggestion-${i}`}
              size="sm"
              variant="ghost"
              className="rounded-full shrink-0 text-primary hover:bg-primary/10 gap-1"
              onClick={() => onPick(s.date)}
            >
              Pilih <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
