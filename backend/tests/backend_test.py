"""Backend tests for AlokasiTransfer."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://banking-journal.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Suppliers ----------
class TestSuppliers:
    def test_list_seeded(self, session):
        r = session.get(f"{API}/suppliers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        for s in data:
            assert "_id" not in s
            assert "id" in s and "name" in s and "bank" in s

    def test_create_update_delete_flow(self, session):
        # Create
        payload = {"name": "TEST_Supplier_X", "bank": "BCA", "account_number": "9999", "contact": "test"}
        r = session.post(f"{API}/suppliers", json=payload)
        assert r.status_code == 200
        sup = r.json()
        sid = sup["id"]
        assert sup["name"] == "TEST_Supplier_X"

        # Verify GET
        r = session.get(f"{API}/suppliers")
        assert any(s["id"] == sid for s in r.json())

        # Update
        upd = {"name": "TEST_Supplier_X2", "bank": "Mandiri", "account_number": "8888", "contact": "test2"}
        r = session.put(f"{API}/suppliers/{sid}", json=upd)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Supplier_X2"

        # Delete (no txs)
        r = session.delete(f"{API}/suppliers/{sid}")
        assert r.status_code == 200

        # Confirm gone
        r = session.get(f"{API}/suppliers")
        assert not any(s["id"] == sid for s in r.json())

    def test_delete_blocked_when_transactions_exist(self, session):
        # Create supplier and tx
        r = session.post(f"{API}/suppliers", json={"name": "TEST_Blocked", "bank": "BCA", "account_number": "1"})
        sid = r.json()["id"]
        d = date.today().isoformat()
        rt = session.post(f"{API}/transactions", json={"supplier_id": sid, "amount": 1000, "date": d, "note": "t"})
        assert rt.status_code == 200
        tid = rt.json()["id"]

        # Attempt delete - should fail
        rd = session.delete(f"{API}/suppliers/{sid}")
        assert rd.status_code == 400

        # Cleanup
        session.delete(f"{API}/transactions/{tid}")
        session.delete(f"{API}/suppliers/{sid}")

    def test_update_syncs_denormalized_on_transactions(self, session):
        r = session.post(f"{API}/suppliers", json={"name": "TEST_Sync", "bank": "BCA", "account_number": "111"})
        sid = r.json()["id"]
        rt = session.post(f"{API}/transactions", json={"supplier_id": sid, "amount": 500, "date": date.today().isoformat()})
        tid = rt.json()["id"]

        session.put(f"{API}/suppliers/{sid}", json={"name": "TEST_Sync_New", "bank": "BNI", "account_number": "222"})

        txs = session.get(f"{API}/transactions").json()
        tx = next(t for t in txs if t["id"] == tid)
        assert tx["supplier_name"] == "TEST_Sync_New"
        assert tx["bank"] == "BNI"
        assert tx["account_number"] == "222"

        session.delete(f"{API}/transactions/{tid}")
        session.delete(f"{API}/suppliers/{sid}")


# ---------- Transactions ----------
class TestTransactions:
    def test_list(self, session):
        r = session.get(f"{API}/transactions")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for t in data:
            assert "_id" not in t

    def test_create_with_invalid_supplier(self, session):
        r = session.post(f"{API}/transactions", json={"supplier_id": "nonexistent", "amount": 100, "date": "2026-09-08"})
        assert r.status_code == 404

    def test_full_crud(self, session):
        suppliers = session.get(f"{API}/suppliers").json()
        assert len(suppliers) > 0
        sid = suppliers[0]["id"]

        d = date.today().isoformat()
        r = session.post(f"{API}/transactions", json={"supplier_id": sid, "amount": 12345, "date": d, "note": "TEST_note"})
        assert r.status_code == 200
        tx = r.json()
        tid = tx["id"]
        assert tx["amount"] == 12345
        assert tx["supplier_name"] == suppliers[0]["name"]

        # Update
        r = session.put(f"{API}/transactions/{tid}", json={"supplier_id": sid, "amount": 99999, "date": d, "note": "TEST_upd"})
        assert r.status_code == 200
        assert r.json()["amount"] == 99999

        # Delete
        r = session.delete(f"{API}/transactions/{tid}")
        assert r.status_code == 200

        r = session.put(f"{API}/transactions/{tid}", json={"supplier_id": sid, "amount": 1, "date": d})
        assert r.status_code == 404


# ---------- Settings ----------
class TestSettings:
    def test_get_and_update(self, session):
        r = session.get(f"{API}/settings")
        assert r.status_code == 200
        original = r.json()["daily_limit"]
        assert isinstance(original, int)

        new_limit = 750_000_000
        r = session.put(f"{API}/settings", json={"daily_limit": new_limit})
        assert r.status_code == 200
        assert r.json()["daily_limit"] == new_limit

        r = session.get(f"{API}/settings")
        assert r.json()["daily_limit"] == new_limit

        # restore
        session.put(f"{API}/settings", json={"daily_limit": original})


# ---------- Recommendations ----------
class TestRecommendations:
    def test_recommendations_structure(self, session):
        r = session.get(f"{API}/recommendations")
        assert r.status_code == 200
        data = r.json()
        assert "limit" in data
        assert "suggestions" in data
        assert len(data["suggestions"]) <= 5
        limit = data["limit"]
        prev_total = -1
        for s in data["suggestions"]:
            assert s["total"] < limit
            assert s["remaining"] == max(limit - s["total"], 0)
            assert s["total"] >= prev_total
            prev_total = s["total"]
