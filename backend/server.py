from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json as _json
import tempfile
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated
from bson import ObjectId
import uuid
from datetime import datetime, timezone, date, timedelta
from seed_data import SEED_SUPPLIERS, SEED_SENDERS
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(str)]


# ---------- Models ----------
class Supplier(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    alias: Optional[str] = ""
    bank: str
    account_number: str
    contact: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SupplierCreate(BaseModel):
    name: str
    alias: Optional[str] = ""
    bank: str
    account_number: str
    contact: Optional[str] = ""


class Transaction(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    supplier_name: str
    bank: str
    account_number: str
    sender_id: Optional[str] = None
    sender_name: Optional[str] = ""
    sender_account: Optional[str] = ""
    amount: int  # rupiah
    date: str  # YYYY-MM-DD
    transfer_time: Optional[str] = ""  # HH:MM
    note: Optional[str] = ""
    deleted_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TransactionCreate(BaseModel):
    supplier_id: str
    sender_id: Optional[str] = None
    amount: int
    date: str
    transfer_time: Optional[str] = ""
    note: Optional[str] = ""


class SenderAccount(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    account_number: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SenderAccountCreate(BaseModel):
    name: str
    account_number: str


class Settings(BaseModel):
    daily_limit: int = 500_000_000


class SettingsUpdate(BaseModel):
    daily_limit: int


# ---------- Helpers ----------
async def get_settings_doc():
    doc = await db.settings.find_one({"key": "global"})
    if not doc:
        default = {"key": "global", "daily_limit": 500_000_000}
        await db.settings.insert_one(default)
        return default
    return doc


# ---------- Sender Accounts ----------
@api_router.get("/sender-accounts", response_model=List[SenderAccount])
async def list_sender_accounts():
    docs = await db.sender_accounts.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/sender-accounts", response_model=SenderAccount)
async def create_sender_account(payload: SenderAccountCreate):
    acc = SenderAccount(**payload.model_dump())
    await db.sender_accounts.insert_one(acc.model_dump())
    return acc


@api_router.put("/sender-accounts/{sender_id}", response_model=SenderAccount)
async def update_sender_account(sender_id: str, payload: SenderAccountCreate):
    existing = await db.sender_accounts.find_one({"id": sender_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Rekening pengirim tidak ditemukan")
    update = payload.model_dump()
    await db.sender_accounts.update_one({"id": sender_id}, {"$set": update})
    await db.transactions.update_many(
        {"sender_id": sender_id},
        {"$set": {"sender_name": update["name"], "sender_account": update["account_number"]}},
    )
    existing.update(update)
    return existing


@api_router.delete("/sender-accounts/{sender_id}")
async def delete_sender_account(sender_id: str):
    res = await db.sender_accounts.delete_one({"id": sender_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rekening pengirim tidak ditemukan")
    return {"ok": True}


class SupplierImport(BaseModel):
    suppliers: List[SupplierCreate]


# ---------- Suppliers ----------
@api_router.post("/suppliers/import")
async def import_suppliers(payload: SupplierImport):
    inserted, skipped = 0, 0
    for item in payload.suppliers:
        name = (item.name or "").strip()
        acc = (item.account_number or "").strip()
        if not name or not acc:
            skipped += 1
            continue
        dup = await db.suppliers.find_one({"name": name, "account_number": acc})
        if dup:
            skipped += 1
            continue
        sup = Supplier(name=name, alias=(item.alias or "").strip(), bank=(item.bank or "").strip(),
                       account_number=acc, contact=(item.contact or "").strip())
        await db.suppliers.insert_one(sup.model_dump())
        inserted += 1
    return {"inserted": inserted, "skipped": skipped}


@api_router.get("/suppliers", response_model=List[Supplier])
async def list_suppliers():
    docs = await db.suppliers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return docs


@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(payload: SupplierCreate):
    supplier = Supplier(**payload.model_dump())
    await db.suppliers.insert_one(supplier.model_dump())
    return supplier


@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, payload: SupplierCreate):
    existing = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
    update = payload.model_dump()
    await db.suppliers.update_one({"id": supplier_id}, {"$set": update})
    # sync denormalized fields on transactions
    await db.transactions.update_many(
        {"supplier_id": supplier_id},
        {"$set": {"supplier_name": update["name"], "bank": update["bank"], "account_number": update["account_number"]}},
    )
    existing.update(update)
    return existing


@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    count = await db.transactions.count_documents({"supplier_id": supplier_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Supplier memiliki {count} transaksi. Hapus transaksi terlebih dahulu.")
    res = await db.suppliers.delete_one({"id": supplier_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
    return {"ok": True}


RETENTION_DAYS = 7
MAX_AGE_MONTHS = 2


def _months_ago(d: date, n: int) -> date:
    month = d.month - n
    year = d.year
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1)


async def purge_expired_trash():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    await db.transactions.delete_many({"deleted_at": {"$ne": None, "$lt": cutoff}})
    # permanently remove transactions whose transfer date is older than 2 months
    old_cutoff = _months_ago(date.today(), MAX_AGE_MONTHS).isoformat()
    await db.transactions.delete_many({"date": {"$lt": old_cutoff}})


# ---------- Transactions ----------
@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions():
    await purge_expired_trash()
    docs = await db.transactions.find({"deleted_at": None}, {"_id": 0}).sort("date", 1).to_list(5000)
    return docs


@api_router.get("/transactions/trash")
async def list_trash():
    await purge_expired_trash()
    docs = await db.transactions.find({"deleted_at": {"$ne": None}}, {"_id": 0}).sort("deleted_at", -1).to_list(5000)
    result = []
    for d in docs:
        try:
            deleted = datetime.fromisoformat(d["deleted_at"])
            purge_at = deleted + timedelta(days=RETENTION_DAYS)
            remaining = (purge_at - datetime.now(timezone.utc)).total_seconds()
            days_left = max(int(-(-remaining // 86400)), 0)  # ceil
        except Exception:
            days_left = RETENTION_DAYS
        result.append({**d, "days_left": days_left})
    return result


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(payload: TransactionCreate):
    supplier = await db.suppliers.find_one({"id": payload.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
    sender = None
    if payload.sender_id:
        sender = await db.sender_accounts.find_one({"id": payload.sender_id}, {"_id": 0})
        if not sender:
            raise HTTPException(status_code=404, detail="Rekening pengirim tidak ditemukan")
    tx = Transaction(
        supplier_id=supplier["id"],
        supplier_name=supplier["name"],
        bank=supplier["bank"],
        account_number=supplier["account_number"],
        sender_id=sender["id"] if sender else None,
        sender_name=sender["name"] if sender else "",
        sender_account=sender["account_number"] if sender else "",
        amount=payload.amount,
        date=payload.date,
        transfer_time=payload.transfer_time or "",
        note=payload.note or "",
    )
    await db.transactions.insert_one(tx.model_dump())
    return tx


@api_router.put("/transactions/{tx_id}", response_model=Transaction)
async def update_transaction(tx_id: str, payload: TransactionCreate):
    existing = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    supplier = await db.suppliers.find_one({"id": payload.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
    sender = None
    if payload.sender_id:
        sender = await db.sender_accounts.find_one({"id": payload.sender_id}, {"_id": 0})
        if not sender:
            raise HTTPException(status_code=404, detail="Rekening pengirim tidak ditemukan")
    update = {
        "supplier_id": supplier["id"],
        "supplier_name": supplier["name"],
        "bank": supplier["bank"],
        "account_number": supplier["account_number"],
        "sender_id": sender["id"] if sender else None,
        "sender_name": sender["name"] if sender else "",
        "sender_account": sender["account_number"] if sender else "",
        "amount": payload.amount,
        "date": payload.date,
        "transfer_time": payload.transfer_time or "",
        "note": payload.note or "",
    }
    await db.transactions.update_one({"id": tx_id, "deleted_at": None}, {"$set": update})
    existing.update(update)
    return existing


@api_router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    res = await db.transactions.update_one(
        {"id": tx_id, "deleted_at": None},
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return {"ok": True}


@api_router.post("/transactions/{tx_id}/restore")
async def restore_transaction(tx_id: str):
    res = await db.transactions.update_one(
        {"id": tx_id, "deleted_at": {"$ne": None}},
        {"$set": {"deleted_at": None}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan di sampah")
    return {"ok": True}


@api_router.delete("/transactions/{tx_id}/permanent")
async def permanent_delete_transaction(tx_id: str):
    res = await db.transactions.delete_one({"id": tx_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return {"ok": True}


# ---------- Settings ----------
@api_router.get("/settings", response_model=Settings)
async def get_settings():
    doc = await get_settings_doc()
    return Settings(daily_limit=doc["daily_limit"])


@api_router.put("/settings", response_model=Settings)
async def update_settings(payload: SettingsUpdate):
    await get_settings_doc()
    await db.settings.update_one({"key": "global"}, {"$set": {"daily_limit": payload.daily_limit}})
    return Settings(daily_limit=payload.daily_limit)


# ---------- Recommendations ----------
@api_router.get("/recommendations")
async def recommendations(days: int = 14):
    settings = await get_settings_doc()
    limit = settings["daily_limit"]
    today = date.today()
    txs = await db.transactions.find({"deleted_at": None}, {"_id": 0}).to_list(5000)
    totals = {}
    for t in txs:
        totals[t["date"]] = totals.get(t["date"], 0) + t["amount"]
    result = []
    for i in range(days):
        d = today + timedelta(days=i)
        key = d.isoformat()
        total = totals.get(key, 0)
        remaining = max(limit - total, 0)
        result.append({
            "date": key,
            "total": total,
            "remaining": remaining,
            "count": sum(1 for t in txs if t["date"] == key),
            "weekday": d.weekday(),
        })
    # sort by lowest total, then earliest date; only those with room left
    result_sorted = sorted([r for r in result if r["total"] < limit], key=lambda r: (r["total"], r["date"]))
    return {"limit": limit, "suggestions": result_sorted[:5]}


# ---------- Voice AI ----------
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

DAY_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]


async def _transcribe(upload: UploadFile) -> str:
    suffix = os.path.splitext(upload.filename or "audio.webm")[1] or ".webm"
    data = await upload.read()
    path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(data)
            path = tmp.name
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(path, "rb") as f:
            resp = await stt.transcribe(file=f, model="whisper-1", language="id", response_format="json")
        return (resp.text or "").strip()
    finally:
        if path and os.path.exists(path):
            os.unlink(path)


async def _llm_json(system: str, user: str) -> dict:
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()), system_message=system).with_model("openai", "gpt-5.4")
    resp = await chat.send_message(UserMessage(text=user))
    txt = resp if isinstance(resp, str) else str(resp)
    match = re.search(r"\{.*\}", txt, re.DOTALL)
    if not match:
        return {}
    try:
        return _json.loads(match.group(0))
    except Exception:
        return {}


@api_router.post("/voice/interpret")
async def voice_interpret(step: str = Form(...), audio: UploadFile = File(...), suppliers: str = Form("[]"), senders: str = Form("[]")):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI key belum dikonfigurasi")
    transcript = await _transcribe(audio)
    if not transcript:
        return {"transcript": "", "value": None, "label": "", "message": "Suara tidak terdengar, coba lagi."}

    today = date.today()
    today_str = f"{DAY_ID[today.weekday()]}, {today.isoformat()}"

    if step == "supplier":
        opts = _json.loads(suppliers)
        listing = "\n".join([f"{s['id']} | {s['name']} | alias: {s.get('alias','')}" for s in opts])
        data = await _llm_json(
            "Anda mencocokkan ucapan Bahasa Indonesia ke satu supplier dari daftar. Balas HANYA JSON.",
            f"Ucapan user: \"{transcript}\".\nDaftar supplier (id | nama | alias):\n{listing}\n\nPilih supplier paling cocok berdasarkan nama atau alias. Balas JSON: {{\"id\": \"<id atau kosong>\", \"name\": \"<nama atau kosong>\"}}. Jika tidak ada yang cocok, id kosong.",
        )
        sid = data.get("id") or None
        match = next((s for s in opts if s["id"] == sid), None)
        return {"transcript": transcript, "value": sid if match else None, "label": match["name"] if match else "", "field": "supplier_id"}

    if step == "sender":
        opts = _json.loads(senders)
        listing = "\n".join([f"{i+1}. {s['name']} | {s.get('account_number','')}" for i, s in enumerate(opts)])
        data = await _llm_json(
            "User memilih satu rekening pengirim dari daftar BERNOMOR dengan menyebut NOMOR urutannya (bisa juga menyebut namanya). Balas HANYA JSON.",
            f"Ucapan user: \"{transcript}\".\nDaftar rekening bernomor:\n{listing}\n\nJika user menyebut angka (mis. 'satu', 'dua', '1', '2'), kembalikan angka itu. Jika menyebut nama, cari nomor yang paling cocok. Balas JSON: {{\"index\": <nomor 1-based atau null>}}.",
        )
        num = data.get("index")
        try:
            num = int(num)
        except Exception:
            num = None
        match = opts[num - 1] if (num and 1 <= num <= len(opts)) else None
        return {"transcript": transcript, "value": match["id"] if match else None, "label": (f"{num}. {match['name']}" if match else ""), "field": "sender_id"}

    if step == "amount":
        data = await _llm_json(
            "Anda mengubah ucapan nominal uang Bahasa Indonesia menjadi angka rupiah (integer). Balas HANYA JSON.",
            f"Ucapan user: \"{transcript}\". Contoh: 'seratus juta' -> 100000000, 'lima puluh ribu' -> 50000, '2,5 juta' -> 2500000. Balas JSON: {{\"amount\": <integer atau null>}}.",
        )
        amt = data.get("amount")
        try:
            amt = int(amt) if amt is not None else None
        except Exception:
            amt = None
        return {"transcript": transcript, "value": amt, "label": f"Rp {amt:,.0f}".replace(",", ".") if amt else "", "field": "amount"}

    if step == "date":
        data = await _llm_json(
            f"Anda mengubah ucapan tanggal Bahasa Indonesia menjadi format YYYY-MM-DD. Hari ini {today_str}. Balas HANYA JSON.",
            f"Ucapan user: \"{transcript}\". Contoh: 'besok', 'hari ini', 'tanggal 9 september', 'lusa'. Gunakan tahun {today.year} bila tahun tidak disebut. Balas JSON: {{\"date\": \"YYYY-MM-DD\" atau null}}.",
        )
        d = data.get("date")
        if d and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(d)):
            d = None
        return {"transcript": transcript, "value": d, "label": d or "", "field": "date"}

    if step == "time":
        data = await _llm_json(
            "Anda mengubah ucapan jam Bahasa Indonesia menjadi format 24 jam HH:MM. Balas HANYA JSON.",
            f"Ucapan user: \"{transcript}\". Contoh: 'jam 2 siang' -> 14:00, 'setengah 9 pagi' -> 08:30, 'jam 7 malam' -> 19:00. Balas JSON: {{\"time\": \"HH:MM\" atau null}}.",
        )
        t = data.get("time")
        if t and not re.match(r"^\d{2}:\d{2}$", str(t)):
            t = None
        return {"transcript": transcript, "value": t, "label": t or "", "field": "transfer_time"}

    if step == "note_confirm":
        data = await _llm_json(
            "Tentukan apakah user ingin mengisi catatan. Balas HANYA JSON.",
            f"Ucapan user: \"{transcript}\". Jika user bilang tidak/tidak usah/skip -> false. Jika ya/iya/isi -> true. Balas JSON: {{\"wants_note\": true atau false}}.",
        )
        return {"transcript": transcript, "value": bool(data.get("wants_note")), "label": "Ya" if data.get("wants_note") else "Tidak", "field": "wants_note"}

    if step == "note":
        return {"transcript": transcript, "value": transcript, "label": transcript, "field": "note"}

    raise HTTPException(status_code=400, detail="Langkah tidak dikenal")


# ---------- Seed ----------
async def ensure_seed_data():
    """Idempotently make sure the real supplier directory, sender accounts and
    settings exist. Runs on every startup so a fresh (e.g. production) database
    is always populated after a deploy/republish."""
    for s in SEED_SUPPLIERS:
        exists = await db.suppliers.find_one({"name": s["name"], "account_number": s["account_number"]})
        if not exists:
            sup = Supplier(name=s["name"], alias=s.get("alias", ""), bank=s.get("bank", ""),
                           account_number=s["account_number"], contact="")
            await db.suppliers.insert_one(sup.model_dump())
    for s in SEED_SENDERS:
        exists = await db.sender_accounts.find_one({"name": s["name"]})
        if not exists:
            await db.sender_accounts.insert_one(SenderAccount(**s).model_dump())
    await get_settings_doc()


@api_router.post("/seed")
async def seed(force: bool = False):
    if force:
        await db.suppliers.delete_many({})
        await db.transactions.delete_many({})
        await db.sender_accounts.delete_many({})
    await ensure_seed_data()
    count = await db.suppliers.count_documents({})
    return {"seeded": True, "suppliers": count}


@api_router.get("/")
async def root():
    return {"message": "AlokasiTransfer API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_on_startup():
    await ensure_seed_data()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
