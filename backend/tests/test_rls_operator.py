"""RLS checks for operator surfaces (Phase B.1) — requires local Supabase Postgres + migrations."""

from __future__ import annotations

import json
import os
import uuid

import pytest

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None

DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")


def _connect():
    if psycopg is None:
        return None
    try:
        return psycopg.connect(DSN, connect_timeout=2)
    except psycopg.Error:
        return None


@pytest.fixture(scope="module")
def conn():
    c = _connect()
    if c is None:
        pytest.skip("Postgres not reachable (set DATABASE_URL or start supabase start)")
    yield c
    c.close()


def _set_jwt(cur: psycopg.Cursor, claims: dict) -> None:
    cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps(claims),))
    cur.execute("set role authenticated")


def _reset_role(cur: psycopg.Cursor) -> None:
    cur.execute("reset role")


def _insert_ut_official(cur: psycopg.Cursor) -> tuple[str, str]:
    cur.execute("select id from public.jurisdictions where slug = 'ut' limit 1")
    row = cur.fetchone()
    assert row is not None
    jurisdiction_id = str(row[0])
    official_id = str(uuid.uuid4())
    cur.execute(
        """
        insert into public.officials
          (id, full_name, slug, jurisdiction_id, office_type, is_current)
        values (%s, 'RLS Test Judge', %s, %s, 'state_supreme_justice', true)
        """,
        (official_id, f"rls-test-{official_id[:8]}", jurisdiction_id),
    )
    return official_id, jurisdiction_id


@pytest.mark.parametrize(
    "role",
    ["viewer", "operator", "admin"],
)
def test_dossier_claims_authenticated_sees_published_writer_only(conn, role: str) -> None:
    with conn.cursor() as cur:
        official_id, _ = _insert_ut_official(cur)
    conn.commit()
    visible_id = str(uuid.uuid4())
    hidden_retrieval = str(uuid.uuid4())
    hidden_unpublished = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.dossier_claims
              (id, official_id, claim_text, category, pipeline_stage, published)
            values
              (%s, %s, 'Published writer claim', 'Test', 'writer_sonar', true),
              (%s, %s, 'Internal retrieval', 'Test', 'retrieval_sonar', false),
              (%s, %s, 'Draft writer not pub', 'Test', 'writer_sonar', false)
            """,
            (visible_id, official_id, hidden_retrieval, official_id, hidden_unpublished, official_id),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": f"user_{role}", "role": role, "org_id": "org_1"})
            cur.execute("select id from public.dossier_claims where id = %s", (visible_id,))
            assert cur.fetchone() is not None
            cur.execute("select id from public.dossier_claims where id = %s", (hidden_retrieval,))
            assert cur.fetchone() is None
            cur.execute("select id from public.dossier_claims where id = %s", (hidden_unpublished,))
            assert cur.fetchone() is None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.dossier_claims where id in (%s,%s,%s)", (visible_id, hidden_retrieval, hidden_unpublished))
            cur.execute("delete from public.officials where id = %s", (official_id,))
            conn.commit()


def test_entity_edges_proposed_hidden_from_authenticated(conn) -> None:
    e1, e2 = str(uuid.uuid4()), str(uuid.uuid4())
    edge_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.entities (id, type, canonical_name)
            values (%s, 'person', 'Edge A'), (%s, 'person', 'Edge B')
            """,
            (e1, e2),
        )
        cur.execute(
            """
            insert into public.entity_edges
              (id, source_entity_id, target_entity_id, relation, status)
            values (%s, %s, %s, 'test_edge', 'proposed')
            """,
            (edge_id, e1, e2),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_op", "role": "operator", "org_id": "org_1"})
            cur.execute("select id from public.entity_edges where id = %s", (edge_id,))
            assert cur.fetchone() is None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.entity_edges where id = %s", (edge_id,))
            cur.execute("delete from public.entities where id in (%s,%s)", (e1, e2))
            conn.commit()


def test_opinions_published_gate(conn) -> None:
    pub_id, draft_id = str(uuid.uuid4()), str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.opinions (id, slug, title, published)
            values (%s, %s, 'Pub opinion', true), (%s, %s, 'Draft opinion', false)
            """,
            (pub_id, f"op-pub-{pub_id[:8]}", draft_id, f"op-draft-{draft_id[:8]}"),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_v", "role": "viewer", "org_id": "org_1"})
            cur.execute("select id from public.opinions where id = %s", (pub_id,))
            assert cur.fetchone() is not None
            cur.execute("select id from public.opinions where id = %s", (draft_id,))
            assert cur.fetchone() is None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.opinions where id in (%s,%s)", (pub_id, draft_id))
            conn.commit()


def test_bills_published_gate(conn) -> None:
    pub_id, draft_id = str(uuid.uuid4()), str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.bills (id, bill_number, title, published)
            values (%s, 'HB-RLS-1', 'Pub bill', true), (%s, 'HB-RLS-2', 'Draft bill', false)
            """,
            (pub_id, draft_id),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_v", "role": "viewer", "org_id": "org_1"})
            cur.execute("select id from public.bills where id = %s", (pub_id,))
            assert cur.fetchone() is not None
            cur.execute("select id from public.bills where id = %s", (draft_id,))
            assert cur.fetchone() is None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.bills where id in (%s,%s)", (pub_id, draft_id))
            conn.commit()


def test_media_coverage_published_gate(conn) -> None:
    pub_id, draft_id = str(uuid.uuid4()), str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.media_coverage (id, headline, published)
            values (%s, 'Pub story', true), (%s, 'Draft story', false)
            """,
            (pub_id, draft_id),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_v", "role": "viewer", "org_id": "org_1"})
            cur.execute("select id from public.media_coverage where id = %s", (pub_id,))
            assert cur.fetchone() is not None
            cur.execute("select id from public.media_coverage where id = %s", (draft_id,))
            assert cur.fetchone() is None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.media_coverage where id in (%s,%s)", (pub_id, draft_id))
            conn.commit()


def test_jurisdictions_still_readable_authenticated(conn) -> None:
    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_j", "role": "viewer", "org_id": "org_1"})
            cur.execute("select count(*) from public.jurisdictions where slug = 'ut'")
            assert cur.fetchone()[0] >= 1
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)


def test_anon_reads_entity_linked_to_active_official(conn) -> None:
    """Phase B.7: operator graph labels — entities tied to non-deleted officials are visible to anon."""
    entity_id = str(uuid.uuid4())
    official_id, jurisdiction_id = str(uuid.uuid4()), None
    with conn.cursor() as cur:
        cur.execute("select id from public.jurisdictions where slug = 'ut' limit 1")
        row = cur.fetchone()
        assert row is not None
        jurisdiction_id = str(row[0])
        cur.execute(
            """
            insert into public.entities (id, type, canonical_name)
            values (%s, 'person', 'RLS Graph Entity')
            """,
            (entity_id,),
        )
        cur.execute(
            """
            insert into public.officials
              (id, full_name, slug, jurisdiction_id, office_type, is_current, entity_id)
            values (%s, 'RLS Graph Judge', %s, %s, 'state_supreme_justice', true, %s)
            """,
            (official_id, f"rls-graph-{official_id[:8]}", jurisdiction_id, entity_id),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            cur.execute("set role anon")
            cur.execute("select canonical_name from public.entities where id = %s", (entity_id,))
            got = cur.fetchone()
            assert got is not None
            assert got[0] == "RLS Graph Entity"
    finally:
        with conn.cursor() as cur:
            cur.execute("reset role")
            cur.execute("delete from public.officials where id = %s", (official_id,))
            cur.execute("delete from public.entities where id = %s", (entity_id,))
            conn.commit()
