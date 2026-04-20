from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any


def compute_dedupe_key(
    *,
    full_name: str,
    office_sought: str,
    district: str,
    jurisdiction: str,
    party: str | None,
) -> str:
    parts = "|".join(
        [
            full_name.strip().lower(),
            office_sought.strip().lower(),
            district.strip().lower(),
            jurisdiction.strip().lower(),
            (party or "").strip().lower(),
        ]
    )
    return hashlib.sha256(parts.encode("utf-8")).hexdigest()


_DISTRICT_NUM = re.compile(r"District\s+(\d+)", re.IGNORECASE)


@dataclass
class NormalizedCandidate:
    full_name: str
    office_sought: str
    party: str | None
    incumbency: str = ""
    district: str = ""
    jurisdiction: str = "UT"
    provenance: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def district_for_race(self) -> str:
        return self.district or self._district_from_office(self.office_sought)

    @property
    def dedupe_key(self) -> str:
        dist = self.district_for_race
        return compute_dedupe_key(
            full_name=self.full_name,
            office_sought=self.office_sought,
            district=dist,
            jurisdiction=self.jurisdiction,
            party=self.party,
        )

    @staticmethod
    def _district_from_office(office: str) -> str:
        m = _DISTRICT_NUM.search(office)
        return m.group(1) if m else ""
