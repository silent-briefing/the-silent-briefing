"""RLS checks for GUI support tables — requires local Supabase Postgres + migration applied."""

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


def test_admin_audit_log_rls_viewer_cannot_read(conn) -> None:
    row_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.admin_audit_log
              (id, actor_user_id, actor_role, action, target_type)
            values (%s, 'actor', 'admin', 'test.insert', 'smoke')
            """,
            (row_id,),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_viewer", "role": "viewer", "org_id": "org_1"})
            cur.execute("select id from public.admin_audit_log where id = %s", (row_id,))
            assert cur.fetchone() is None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.admin_audit_log where id = %s", (row_id,))
            conn.commit()


def test_admin_audit_log_rls_admin_can_read(conn) -> None:
    row_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.admin_audit_log
              (id, actor_user_id, actor_role, action, target_type)
            values (%s, 'actor', 'admin', 'test.insert', 'smoke')
            """,
            (row_id,),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_admin", "role": "admin", "org_id": "org_1"})
            cur.execute("select id from public.admin_audit_log where id = %s", (row_id,))
            got = cur.fetchone()
            assert got is not None
            assert str(got[0]) == row_id
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.admin_audit_log where id = %s", (row_id,))
            conn.commit()


def test_user_saved_views_owner_select(conn) -> None:
    row_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.user_saved_views
              (id, user_id, org_id, name, kind, query)
            values (%s, 'user_a', 'org_1', 'My view', 'officials', '{}')
            """,
            (row_id,),
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_a", "role": "viewer", "org_id": "org_1"})
            cur.execute("select id from public.user_saved_views where id = %s", (row_id,))
            assert str(cur.fetchone()[0]) == row_id
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.user_saved_views where id = %s", (row_id,))
            conn.commit()


def test_settings_read_authenticated(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.settings (key, value, updated_by)
            values ('gui.test.flag', '{"on": true}'::jsonb, 'pytest')
            on conflict (key) do update set value = excluded.value
            """
        )
        conn.commit()

    try:
        with conn.cursor() as cur:
            _set_jwt(cur, {"sub": "user_x", "role": "viewer", "org_id": "org_1"})
            cur.execute("select value from public.settings where key = 'gui.test.flag'")
            row = cur.fetchone()
            assert row is not None
    finally:
        with conn.cursor() as cur:
            _reset_role(cur)
            cur.execute("delete from public.settings where key = 'gui.test.flag'")
            conn.commit()
