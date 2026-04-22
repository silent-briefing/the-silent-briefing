from __future__ import annotations

from unittest.mock import MagicMock

from briefing.config import Settings
from briefing.services.alerts.dispatcher import AlertDispatcher, dossier_href


def test_dossier_href_judicial_vs_legislative() -> None:
    assert dossier_href("state_supreme_justice", "j-hagen") == "/judicial/j-hagen"
    assert dossier_href("state_senator", "sen-smith") == "/officials/sen-smith"


def test_try_from_settings_requires_org_and_supabase() -> None:
    assert AlertDispatcher.try_from_settings(Settings()) is None
    assert (
        AlertDispatcher.try_from_settings(
            Settings(
                alerts_default_org_id="org_x",
                supabase_url="",
                supabase_service_role_key="k",
            )
        )
        is None
    )


def test_notify_retrieval_pass_inserts_with_href() -> None:
    client = MagicMock()
    alerts_table = MagicMock()
    alerts_table.insert.return_value.execute.return_value = MagicMock()

    def table_side(name: str) -> MagicMock:
        if name == "officials":
            t = MagicMock()
            t.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[{"slug": "j1", "office_type": "state_supreme_justice"}]
            )
            return t
        if name == "alerts":
            return alerts_table
        return MagicMock()

    client.table.side_effect = table_side

    d = AlertDispatcher(client, "org_1")
    d.notify_retrieval_pass("oid-1", n_stages=2)

    client.table.assert_any_call("officials")
    client.table.assert_any_call("alerts")
    alerts_table.insert.assert_called_once()
    call_kw = alerts_table.insert.call_args[0][0]
    assert call_kw["org_id"] == "org_1"
    assert call_kw["kind"] == "retrieval_complete"
    assert call_kw["payload"]["href"] == "/judicial/j1"
