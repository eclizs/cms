export const formatRupiah = (value) => {
  if (value === null || value === undefined || value === "") return "Rp 0";
  const n = Number(value);
  return "Rp " + n.toLocaleString("id-ID");
};

export const formatCompact = (value) => {
  const n = Number(value) || 0;
  if (n === 0) return "-";
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return "Rp " + (Number.isInteger(v) ? v : v.toFixed(1)) + "M";
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return "Rp " + (Number.isInteger(v) ? v : v.toFixed(1)) + "jt";
  }
  if (n >= 1_000) return "Rp " + Math.round(n / 1_000) + "rb";
  return "Rp " + n;
};

const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

const toWords = (n) => {
  n = Math.floor(n);
  if (n < 12) return satuan[n];
  if (n < 20) return toWords(n - 10) + " belas";
  if (n < 100) return toWords(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + toWords(n % 10) : "");
  if (n < 200) return "seratus" + (n % 100 ? " " + toWords(n % 100) : "");
  if (n < 1000) return toWords(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + toWords(n % 100) : "");
  if (n < 2000) return "seribu" + (n % 1000 ? " " + toWords(n % 1000) : "");
  if (n < 1_000_000) return toWords(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + toWords(n % 1000) : "");
  if (n < 1_000_000_000) return toWords(Math.floor(n / 1_000_000)) + " juta" + (n % 1_000_000 ? " " + toWords(n % 1_000_000) : "");
  return toWords(Math.floor(n / 1_000_000_000)) + " miliar" + (n % 1_000_000_000 ? " " + toWords(n % 1_000_000_000) : "");
};

export const terbilang = (n) => {
  n = Number(n) || 0;
  if (n === 0) return "Nol rupiah";
  const words = toWords(n).trim().replace(/\s+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1) + " rupiah";
};

export const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const formatDateLong = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d.getDay()];
  return `${dayName}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

export const getDayStatus = (total, limit) => {
  if (!total || total === 0) return "empty";
  const ratio = total / limit;
  if (ratio < 0.5) return "safe";
  if (ratio <= 0.9) return "warning";
  return "danger";
};

export const STATUS_META = {
  empty: { label: "Belum ada transaksi", dot: "bg-slate-300 dark:bg-slate-600" },
  safe: { label: "Aman", dot: "bg-emerald-500" },
  warning: { label: "Mendekati limit", dot: "bg-amber-500" },
  danger: { label: "Melebihi / hampir limit", dot: "bg-red-500" },
};

export const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
