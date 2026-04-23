"""Append-only admin audit trail — use `insert_audit_row` inside a DB transaction with mutations."""

from __future__ import annotations

import json
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from psycopg import Cursor

from briefing.config import Settings


def insert_audit_row(
    cur: Cursor,
    *,
    actor_user_id: str,
    actor_role: str,
    org_id: str | None,
    action: str,
    target_type: str,
    target_id: str | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    """Insert one `admin_audit_log` row using the current transaction (Postgres `Cursor`).

    RLS allows INSERT only as `service_role`; connections that bypass RLS (e.g. `postgres`
    in tests) may also insert. BFF routes should run mutations and this insert in one
    transaction when using a direct ``psycopg`` connection.
    """
    cur.execute(
        """
        INSERT INTO public.admin_audit_log
          (actor_user_id, actor_role, org_id, action, target_type, target_id, before, after)
        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
        """,
        (
            actor_user_id,
            actor_role,
            org_id,
            action,
            target_type,
            target_id,
            json.dumps(before or {}, default=str),
            json.dumps(after or {}, default=str),
        ),
    )


def write_audit_via_service_role(
    settings: Settings,
    *,
    actor_user_id: str,
    actor_role: str,
    org_id: str | None,
    action: str,
    target_type: str,
    target_id: str | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    """Fire-and-forget audit row via Supabase REST (service role). Not transactional with other REST calls."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for audit insert")
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    def _json_obj(d: dict[str, Any] | None) -> dict[str, Any]:
        raw = json.dumps(d or {}, default=str)
        return json.loads(raw)

    payload = {
        "actor_user_id": actor_user_id,
        "actor_role": actor_role,
        "org_id": org_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "before": _json_obj(before),
        "after": _json_obj(after),
    }
    client.table("admin_audit_log").insert(payload).execute()
