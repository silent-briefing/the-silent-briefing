"""Transactional audit helper — requires local Supabase Postgres."""

from __future__ import annotations

import os
import uuid

import pytest

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None

from briefing.services.audit.log import insert_audit_row

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
        pytest.skip("Postgres not reachable")
    yield c
    c.close()


def test_insert_audit_row_rolls_back_with_transaction(conn) -> None:
    """If the transaction aborts after audit insert, no row persists."""
    marker = str(uuid.uuid4())
    try:
        with conn.transaction():
            with conn.cursor() as cur:
                insert_audit_row(
                    cur,
                    actor_user_id="u_test",
                    actor_role="admin",
                    org_id="org_x",
                    action="test.rollback",
                    target_type="smoke",
                    target_id=marker,
                    before={},
                    after={"ok": True},
                )
            raise RuntimeError("force abort")
    except RuntimeError:
        pass

    with conn.cursor() as cur:
        cur.execute(
            "select id from public.admin_audit_log where target_id = %s",
            (marker,),
        )
        assert cur.fetchone() is None


def test_insert_audit_row_commits(conn) -> None:
    marker = str(uuid.uuid4())
    with conn.cursor() as cur:
        insert_audit_row(
            cur,
            actor_user_id="u_test",
            actor_role="admin",
            org_id="org_x",
            action="test.commit",
            target_type="smoke",
            target_id=marker,
            before={},
            after={},
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            cur.execute(
                "select action from public.admin_audit_log where target_id = %s",
                (marker,),
            )
            row = cur.fetchone()
            assert row is not None
            assert row[0] == "test.commit"
    finally:
        with conn.cursor() as cur:
            cur.execute("delete from public.admin_audit_log where target_id = %s", (marker,))
            conn.commit()
