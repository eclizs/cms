"""Backend tests for AlokasiTransfer."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://banking-journal.preview.emergentagent.com').rstrip('/')  # noqa
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

        # After soft-delete tx should not appear in GET /transactions
        listed = session.get(f"{API}/transactions").json()
        assert not any(t["id"] == tid for t in listed)


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


# ---------- Sender Accounts ----------
class TestSenderAccounts:
    def test_list_seeded(self, session):
        r = session.get(f"{API}/sender-accounts")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        for s in data:
            assert "_id" not in s
            assert "id" in s and "name" in s and "account_number" in s

    def test_crud_and_denorm_sync(self, session):
        r = session.post(f"{API}/sender-accounts", json={"name": "TEST_Sender", "account_number": "12345"})
        assert r.status_code == 200
        sid = r.json()["id"]

        # create supplier + tx using this sender
        sr = session.post(f"{API}/suppliers", json={"name": "TEST_SupSnd", "bank": "BCA", "account_number": "1"})
        sup_id = sr.json()["id"]
        d = date.today().isoformat()
        rt = session.post(f"{API}/transactions", json={"supplier_id": sup_id, "sender_id": sid, "amount": 5000, "date": d})
        assert rt.status_code == 200
        tx = rt.json()
        assert tx["sender_id"] == sid
        assert tx["sender_name"] == "TEST_Sender"
        assert tx["sender_account"] == "12345"
        tid = tx["id"]

        # Update sender - denormalized fields should sync
        session.put(f"{API}/sender-accounts/{sid}", json={"name": "TEST_Sender2", "account_number": "67890"})
        txs = session.get(f"{API}/transactions").json()
        t2 = next(t for t in txs if t["id"] == tid)
        assert t2["sender_name"] == "TEST_Sender2"
        assert t2["sender_account"] == "67890"

        # Invalid sender_id on new tx -> 404
        rbad = session.post(f"{API}/transactions", json={"supplier_id": sup_id, "sender_id": "nonexistent", "amount": 1, "date": d})
        assert rbad.status_code == 404
        assert "Rekening pengirim" in rbad.json().get("detail", "")

        # Cleanup
        session.delete(f"{API}/transactions/{tid}")
        session.delete(f"{API}/sender-accounts/{sid}")
        session.delete(f"{API}/suppliers/{sup_id}")


# ---------- Alias feature ----------
class TestSupplierAlias:
    def test_seeded_suppliers_have_aliases(self, session):
        r = session.get(f"{API}/suppliers")
        assert r.status_code == 200
        suppliers = r.json()
        aliases = {s.get("alias") for s in suppliers}
        for expected in ["PT.AAM", "BBB NEW", "TK NEW", "GULA NEW", "MINYAK", "BDN"]:
            assert expected in aliases, f"Missing alias {expected} in {aliases}"

    def test_create_supplier_with_alias(self, session):
        payload = {"name": "TEST_Alias_Sup", "alias": "TEST_ALIAS", "bank": "BCA", "account_number": "77777", "contact": "x"}
        r = session.post(f"{API}/suppliers", json=payload)
        assert r.status_code == 200
        sup = r.json()
        assert sup["alias"] == "TEST_ALIAS"
        sid = sup["id"]

        # Persistence check
        r = session.get(f"{API}/suppliers")
        found = next(s for s in r.json() if s["id"] == sid)
        assert found["alias"] == "TEST_ALIAS"

        # Update alias
        upd = {"name": "TEST_Alias_Sup", "alias": "TEST_ALIAS_2", "bank": "BCA", "account_number": "77777", "contact": "x"}
        r = session.put(f"{API}/suppliers/{sid}", json=upd)
        assert r.status_code == 200
        assert r.json()["alias"] == "TEST_ALIAS_2"

        session.delete(f"{API}/suppliers/{sid}")


# ---------- Bug regression: existing supplier + sender submission works ----------
class TestSupplierNotFoundBugRegression:
    def test_existing_supplier_and_sender_submit_200(self, session):
        suppliers = session.get(f"{API}/suppliers").json()
        senders = session.get(f"{API}/sender-accounts").json()
        assert suppliers and senders
        sup = suppliers[0]
        snd = senders[0]
        d = date.today().isoformat()
        r = session.post(f"{API}/transactions", json={
            "supplier_id": sup["id"], "sender_id": snd["id"], "amount": 1_000_000, "date": d, "note": "TEST_regress"
        })
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["supplier_name"] == sup["name"]
        assert tx["sender_name"] == snd["name"]
        session.delete(f"{API}/transactions/{tx['id']}")

    def test_inline_created_sender_then_submit(self, session):
        # Emulate inline sender-add flow: POST sender then POST transaction with returned id
        suppliers = session.get(f"{API}/suppliers").json()
        sup = suppliers[0]
        sr = session.post(f"{API}/sender-accounts", json={"name": "TEST_Inline_Sender", "account_number": "5551234"})
        assert sr.status_code == 200
        new_sid = sr.json()["id"]

        d = date.today().isoformat()
        r = session.post(f"{API}/transactions", json={
            "supplier_id": sup["id"], "sender_id": new_sid, "amount": 500_000, "date": d, "note": "TEST_inline"
        })
        assert r.status_code == 200, r.text
        tid = r.json()["id"]

        session.delete(f"{API}/transactions/{tid}")
        session.delete(f"{API}/sender-accounts/{new_sid}")



# ---------- Seed / Fresh-DB simulation ----------
class TestSeedReseed:
    def test_force_reseed_yields_exactly_70_suppliers_and_2_senders(self, session):
        r = session.post(f"{API}/seed", params={"force": "true"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("seeded") is True
        assert body.get("suppliers") == 70

        sups = session.get(f"{API}/suppliers").json()
        assert len(sups) == 70, f"expected 70 got {len(sups)}"
        senders = session.get(f"{API}/sender-accounts").json()
        assert len(senders) == 2, f"expected 2 senders got {len(senders)}"

        # No leftover sample suppliers
        names = [s["name"] for s in sups]
        for junk in ["Supplier A", "Supplier B", "Supplier C", "Supplier D"]:
            assert not any(junk in n for n in names), f"leftover sample {junk} present"

        # Data integrity: expected names + aliases
        by_name_alias = {(s["name"], s.get("alias", "")) for s in sups}
        assert ("ANUGRAH ARGON MEDICA PT", "PT.AAM") in by_name_alias
        assert ("BERKAT BUDI BERSAMA", "BBB NEW") in by_name_alias
        # SUNGAI BUDI variants
        sungai = [s for s in sups if s["name"].startswith("SUNGAI BUDI")]
        assert len(sungai) >= 5
        sungai_aliases = {s.get("alias", "") for s in sungai}
        for a in ["TK NEW", "GULA NEW", "MINYAK"]:
            assert a in sungai_aliases, f"missing {a} in SUNGAI aliases"
        # 4 BDN aliased suppliers
        bdn = [s for s in sups if s.get("alias") == "BDN"]
        assert len(bdn) == 4, f"expected 4 BDN, got {len(bdn)}"

    def test_idempotent_seed_no_duplicates(self, session):
        # Call seed (no force) twice, then force twice — count should remain 70 with unique account_numbers
        session.post(f"{API}/seed")
        session.post(f"{API}/seed")
        session.post(f"{API}/seed", params={"force": "true"})
        session.post(f"{API}/seed", params={"force": "true"})
        sups = session.get(f"{API}/suppliers").json()
        assert len(sups) == 70
        accs = [s["account_number"] for s in sups]
        assert len(accs) == len(set(accs)), "duplicate account_numbers found"
        senders = session.get(f"{API}/sender-accounts").json()
        assert len(senders) == 2
