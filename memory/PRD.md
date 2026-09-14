# AlokasiTransfer — PRD

## Original Problem Statement
Aplikasi untuk mencatat transaksi perbankan (transfer ke supplier dengan nominal Rupiah dan tanggal). Tujuan: membantu pengguna memilih tanggal yang bebannya masih sedikit agar tidak ada nominal transfer terlalu banyak menumpuk di satu tanggal.

## User Choices
- Kalender dengan indikator total nominal per hari (hijau/kuning/merah) + saran otomatis tanggal tersepi
- Limit harian yang bisa diubah sendiri oleh pengguna
- Kelola daftar supplier (nama, bank, rekening), dipilih saat input transaksi
- Tanpa login (single user)
- Cukup tampilan di aplikasi (tanpa ekspor)

## Architecture
- Backend: FastAPI + MongoDB (motor). Routes prefixed `/api`. Auto-seed on startup.
- Frontend: React (CRA + craco), Tailwind + shadcn/ui, sonner toasts, lucide icons.
- Currency: IDR integers. Dates: `YYYY-MM-DD`. Calendar Monday-first.

## Core Requirements (static)
- Suppliers CRUD (denormalized name/bank/account onto transactions; delete blocked if txs exist)
- Transactions CRUD
- Settings: configurable daily_limit
- Recommendations: upcoming dates sorted by lowest total, only under limit, with remaining quota
- Calendar heatmap colored by load vs limit (green <50%, amber 50-90%, red >90%)

## Implemented (2026-09-08)
- AI Voice Transaction: Whisper STT + GPT-5.4 parsing (Emergent Universal Key). Guided steps supplier->sender->amount->date->time->ask note->summary. Endpoint POST /api/voice/interpret.
- Dashboard: KPI summary, calendar heatmap, smart recommendations, day-detail panel
- Transaction dialog with rupiah formatting, terbilang, live load-preview vs limit, inline date suggestions
- Daily limit dialog with presets + terbilang
- Supplier manager (add/edit/delete)
- Dark/light theme toggle
- Tested: backend 9/9 pytest pass; frontend flows verified 100%; mobile responsive (no overflow)

## Backlog / Next
- P1: CSV/Excel export
- P1: Monthly analytics chart (recharts) of load distribution
- P2: Recurring/scheduled transfers
- P2: Multi-account / bank balance tracking
