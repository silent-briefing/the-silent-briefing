from __future__ import annotations

from briefing.api.deps_auth import effective_app_role_from_payload


def test_effective_role_public_metadata_wins_operator_vs_org() -> None:
    assert (
        effective_app_role_from_payload(
            {
                "public_metadata": {"role": "operator"},
                "org_role": "org:admin",
            }
        )
        == "admin"
    )


def test_effective_role_org_admin_alone() -> None:
    assert effective_app_role_from_payload({"org_role": "org:admin"}) == "admin"
    assert effective_app_role_from_payload({"org_role": "admin"}) == "admin"


def test_effective_role_nested_o_rol() -> None:
    assert effective_app_role_from_payload({"o": {"rol": "admin"}}) == "admin"


def test_effective_role_ignores_invalid_metadata_strings() -> None:
    assert effective_app_role_from_payload({"public_metadata": {"role": "superuser"}}) is None
    assert (
        effective_app_role_from_payload(
            {"public_metadata": {"role": "superuser"}, "org_role": "org:admin"}
        )
        == "admin"
    )


def test_effective_role_member_org_not_elevated() -> None:
    assert effective_app_role_from_payload({"org_role": "org:member"}) is None
