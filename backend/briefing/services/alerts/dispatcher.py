"""Insert org-scoped alerts from workers (service role). v1: single default org from settings."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from briefing.config import Settings

_JUDICIAL_OFFICE_TYPES = frozenset(
    {
        "state_supreme_justice",
        "state_appellate_judge",
        "state_district_judge",
    }
)


def dossier_href(office_type: str, slug: str) -> str:
    if office_type in _JUDICIAL_OFFICE_TYPES:
        return f"/judicial/{slug}"
    return f"/officials/{slug}"


class AlertDispatcher:
    def __init__(self, client: Any, org_id: str) -> None:
        self._c = client
        self._org = org_id

    @classmethod
    def try_from_settings(cls, settings: Settings) -> AlertDispatcher | None:
        org = (settings.alerts_default_org_id or "").strip()
        if not org or not settings.supabase_url or not settings.supabase_service_role_key:
            return None
        from supabase import create_client

        return cls(
            create_client(settings.supabase_url, settings.supabase_service_role_key),
            org,
        )

    def _official_slug_href(self, official_id: str) -> str | None:
        res = (
            self._c.table("officials")
            .select("slug,office_type")
            .eq("id", official_id)
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        if not res.data:
            return None
        row = res.data[0]
        slug = row.get("slug")
        ot = row.get("office_type")
        if not slug or not ot:
            return None
        return dossier_href(str(ot), str(slug))

    def insert_alert(
        self,
        *,
        kind: str,
        target_type: str,
        target_id: str,
        payload: dict[str, Any],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self._c.table("alerts").insert(
            {
                "org_id": self._org,
                "kind": kind,
                "target_type": target_type,
                "target_id": target_id,
                "payload": payload,
                "delivered_at": now,
            }
        ).execute()

    def notify_retrieval_pass(self, official_id: str, *, n_stages: int) -> None:
        href = self._official_slug_href(official_id)
        payload: dict[str, Any] = {
            "title": "Retrieval pass complete",
            "body": f"{n_stages} research stage(s) were written to the dossier.",
        }
        if href:
            payload["href"] = href
        self.insert_alert(
            kind="retrieval_complete",
            target_type="official",
            target_id=official_id,
            payload=payload,
        )

    def notify_dossier_draft(self, official_id: str) -> None:
        href = self._official_slug_href(official_id)
        payload: dict[str, Any] = {
            "title": "Dossier draft updated",
            "body": "A new writer-stage draft is available for review.",
        }
        if href:
            payload["href"] = href
        self.insert_alert(
            kind="dossier_draft",
            target_type="official",
            target_id=official_id,
            payload=payload,
        )

    def notify_adversarial_review(self, official_id: str, *, groundedness: float) -> None:
        href = self._official_slug_href(official_id)
        payload: dict[str, Any] = {
            "title": "Adversarial review required",
            "body": f"Groundedness {groundedness:.2f} — human review requested.",
        }
        if href:
            payload["href"] = href
        self.insert_alert(
            kind="adversarial_review",
            target_type="official",
            target_id=official_id,
            payload=payload,
        )
