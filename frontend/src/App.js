import { useEffect, useState, useMemo, useCallback } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { toISODate, MONTH_NAMES } from "@/lib/format";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "@/components/Header";
import { KpiSummary } from "@/components/KpiSummary";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { DailyLimitDialog } from "@/components/DailyLimitDialog";
import { TransactionDialog } from "@/components/TransactionDialog";
import { SupplierManager } from "@/components/SupplierManager";
import { DayDetailDialog } from "@/components/DayDetailDialog";

function App() {
  const { theme, toggle } = useTheme();
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dailyLimit, setDailyLimit] = useState(500_000_000);
  const [recommendations, setRecommendations] = useState({ suggestions: [] });
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const [txOpen, setTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [txDefaultDate, setTxDefaultDate] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, t, set, rec] = await Promise.all([
      api.getSuppliers(), api.getTransactions(), api.getSettings(), api.getRecommendations(),
    ]);
    setSuppliers(s);
    setTransactions(t);
    setDailyLimit(set.daily_limit);
    setRecommendations(rec);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshDerived = useCallback(async () => {
    const [t, rec] = await Promise.all([api.getTransactions(), api.getRecommendations()]);
    setTransactions(t);
    setRecommendations(rec);
  }, []);

  const dailyTotals = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      if (!map[t.date]) map[t.date] = { total: 0, count: 0 };
      map[t.date].total += t.amount;
      map[t.date].count += 1;
    }
    return map;
  }, [transactions]);

  const monthTransactions = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth();
    return transactions.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [transactions, month]);

  const openNewTransaction = (date = "") => {
    setEditingTx(null);
    setTxDefaultDate(date);
    setDayDetailOpen(false);
    setTxOpen(true);
  };

  const selectDay = (iso) => {
    setSelectedDate(iso);
    setDayDetailOpen(true);
  };

  const handleSubmitTx = async (data) => {
    try {
      if (editingTx) {
        await api.updateTransaction(editingTx.id, data);
        toast.success("Transaksi diperbarui");
      } else {
        await api.createTransaction(data);
        toast.success("Transfer berhasil dicatat");
      }
      setTxOpen(false);
      setSelectedDate(data.date);
      // jump calendar to that month
      const d = new Date(data.date + "T00:00:00");
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      await refreshDerived();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan transaksi");
    }
  };

  const handleDeleteTx = async (id) => {
    try {
      await api.deleteTransaction(id);
      toast.success("Transaksi dihapus");
      await refreshDerived();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  const handleSaveLimit = async (value) => {
    try {
      const res = await api.updateSettings({ daily_limit: value });
      setDailyLimit(res.daily_limit);
      setLimitOpen(false);
      toast.success("Limit harian diperbarui");
      const rec = await api.getRecommendations();
      setRecommendations(rec);
    } catch (e) {
      toast.error("Gagal menyimpan limit");
    }
  };

  const handleCreateSupplier = async (data) => {
    try { await api.createSupplier(data); setSuppliers(await api.getSuppliers()); toast.success("Supplier ditambahkan"); }
    catch (e) { toast.error("Gagal menambah supplier"); }
  };
  const handleUpdateSupplier = async (id, data) => {
    try { await api.updateSupplier(id, data); setSuppliers(await api.getSuppliers()); await refreshDerived(); toast.success("Supplier diperbarui"); }
    catch (e) { toast.error("Gagal memperbarui supplier"); }
  };
  const handleDeleteSupplier = async (id) => {
    try { await api.deleteSupplier(id); setSuppliers(await api.getSuppliers()); toast.success("Supplier dihapus"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal menghapus supplier"); }
  };

  const pickSuggestion = (date) => {
    openNewTransaction(date);
  };

  return (
    <div className="App min-h-screen bg-background bg-grid">
      <Header
        dailyLimit={dailyLimit}
        theme={theme}
        onToggleTheme={toggle}
        onNewTransaction={() => openNewTransaction("")}
        onEditLimit={() => setLimitOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">Dashboard Alokasi Transfer</h1>
        </div>

        <KpiSummary transactions={monthTransactions} dailyLimit={dailyLimit} monthLabel={MONTH_NAMES[month.getMonth()]} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <CalendarHeatmap
              month={month}
              dailyTotals={dailyTotals}
              dailyLimit={dailyLimit}
              selectedDate={selectedDate}
              onSelectDay={selectDay}
              onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              onToday={() => { const t = new Date(); setMonth(new Date(t.getFullYear(), t.getMonth(), 1)); selectDay(toISODate(t)); }}
            />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <SmartRecommendations recommendations={recommendations} onPick={pickSuggestion} />
          </div>
        </div>
      </main>

      <DayDetailDialog
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
        date={selectedDate}
        transactions={transactions}
        dailyLimit={dailyLimit}
        onAdd={openNewTransaction}
        onEdit={(t) => { setEditingTx(t); setTxDefaultDate(""); setDayDetailOpen(false); setTxOpen(true); }}
        onDelete={handleDeleteTx}
      />

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        suppliers={suppliers}
        editing={editingTx}
        dailyTotals={dailyTotals}
        dailyLimit={dailyLimit}
        recommendations={recommendations}
        defaultDate={txDefaultDate}
        onSubmit={handleSubmitTx}
        onManageSuppliers={() => setSupplierOpen(true)}
      />
      <DailyLimitDialog open={limitOpen} onOpenChange={setLimitOpen} currentLimit={dailyLimit} onSave={handleSaveLimit} />
      <SupplierManager
        open={supplierOpen}
        onOpenChange={setSupplierOpen}
        suppliers={suppliers}
        onCreate={handleCreateSupplier}
        onUpdate={handleUpdateSupplier}
        onDelete={handleDeleteSupplier}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
