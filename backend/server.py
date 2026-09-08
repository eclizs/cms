from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated
from bson import ObjectId
import uuid
from datetime import datetime, timezone, date, timedelta

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
    bank: str
    account_number: str
    contact: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SupplierCreate(BaseModel):
    name: str
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
    amount: int  # rupiah
    date: str  # YYYY-MM-DD
    note: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TransactionCreate(BaseModel):
    supplier_id: str
    amount: int
    date: str
    note: Optional[str] = ""


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


# ---------- Suppliers ----------
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


# ---------- Transactions ----------
@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions():
    docs = await db.transactions.find({}, {"_id": 0}).sort("date", 1).to_list(5000)
    return docs


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(payload: TransactionCreate):
    supplier = await db.suppliers.find_one({"id": payload.supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier tidak ditemukan")
    tx = Transaction(
        supplier_id=supplier["id"],
        supplier_name=supplier["name"],
        bank=supplier["bank"],
        account_number=supplier["account_number"],
        amount=payload.amount,
        date=payload.date,
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
    update = {
        "supplier_id": supplier["id"],
        "supplier_name": supplier["name"],
        "bank": supplier["bank"],
        "account_number": supplier["account_number"],
        "amount": payload.amount,
        "date": payload.date,
        "note": payload.note or "",
    }
    await db.transactions.update_one({"id": tx_id}, {"$set": update})
    existing.update(update)
    return existing


@api_router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
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
    txs = await db.transactions.find({}, {"_id": 0}).to_list(5000)
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


# ---------- Seed ----------
@api_router.post("/seed")
async def seed(force: bool = False):
    if force:
        await db.suppliers.delete_many({})
        await db.transactions.delete_many({})
    existing = await db.suppliers.count_documents({})
    if existing > 0 and not force:
        return {"seeded": False, "message": "Data sudah ada"}

    suppliers_data = [
        {"name": "PT Sumber Baja Makmur (Supplier A)", "bank": "BCA", "account_number": "1234567890", "contact": "Andi - 0812xxxx"},
        {"name": "CV Karya Logam (Supplier B)", "bank": "Mandiri", "account_number": "1440099887766", "contact": "Budi - 0813xxxx"},
        {"name": "PT Mitra Kimia Nusantara (Supplier C)", "bank": "BRI", "account_number": "002201998877", "contact": "Citra - 0821xxxx"},
        {"name": "UD Prima Plastik (Supplier D)", "bank": "BNI", "account_number": "0998877665", "contact": "Dewi - 0856xxxx"},
    ]
    suppliers = []
    for s in suppliers_data:
        obj = Supplier(**s)
        suppliers.append(obj)
        await db.suppliers.insert_one(obj.model_dump())

    today = date.today()
    d8 = today.replace(day=8) if today.day <= 8 else today + timedelta(days=1)
    d9 = d8 + timedelta(days=1)
    tx_data = [
        (suppliers[0], 100_000_000, d8, "Invoice #1029 Bahan Baku Baja"),
        (suppliers[1], 150_000_000, d8, "DP Order Logam Batch 3"),
        (suppliers[2], 120_000_000, d9, "Pelunasan Kimia Industri"),
    ]
    for sup, amt, d, note in tx_data:
        tx = Transaction(
            supplier_id=sup.id, supplier_name=sup.name, bank=sup.bank,
            account_number=sup.account_number, amount=amt, date=d.isoformat(), note=note,
        )
        await db.transactions.insert_one(tx.model_dump())

    return {"seeded": True}


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
    if await db.suppliers.count_documents({}) == 0:
        await seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
