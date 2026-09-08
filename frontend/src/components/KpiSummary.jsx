import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { Wallet, CalendarDays, TrendingUp, Gauge } from "lucide-react";

const Kpi = ({ icon: Icon, label, value, sub, tone, testid }) => (
  <Card data-testid={testid} className="p-5 border-border/80 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-2 text-xl sm:text-2xl font-bold font-mono-num tracking-tight truncate">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${tone}`}>
        <Icon className="h-4.5 w-4.5 h-5 w-5" />
      </div>
    </div>
  </Card>
);

export const KpiSummary = ({ transactions, dailyLimit, monthLabel }) => {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const days = new Set(transactions.map((t) => t.date)).size;
  const busiest = transactions.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.amount;
    return acc;
  }, {});
  const busiestAmt = Object.values(busiest).reduce((m, v) => Math.max(m, v), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi testid="kpi-total-bulan" icon={Wallet} label={`Total Transfer ${monthLabel}`} value={formatRupiah(total)}
        sub={`${transactions.length} transaksi`} tone="bg-primary/10 text-primary" />
      <Kpi testid="kpi-hari-aktif" icon={CalendarDays} label="Hari dengan Transaksi" value={`${days} hari`}
        sub="di bulan ini" tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
      <Kpi testid="kpi-hari-tersibuk" icon={TrendingUp} label="Nominal Hari Tersibuk" value={formatRupiah(busiestAmt)}
        sub={busiestAmt > dailyLimit ? "Melebihi limit!" : "dalam 1 hari"} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      <Kpi testid="kpi-limit" icon={Gauge} label="Limit Harian" value={formatRupiah(dailyLimit)}
        sub="acuan pembagian beban" tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
    </div>
  );
};
