from __future__ import annotations

import json
from pathlib import Path
import threading
import time
import uuid

from edux.services.path_service import get_path_service
from edux.timetable.models import TimetablePlan

# Module-level lock so CAS semantics hold across all store instances.
_cas_lock = threading.Lock()


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + f".tmp.{uuid.uuid4().hex}")
    try:
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(path)
    except BaseException:
        # Don't leave an orphaned temp file behind on write/replace failure.
        tmp.unlink(missing_ok=True)
        raise


class TimetableStore:
    def __init__(self, root: Path | None = None) -> None:
        self._root = root or (get_path_service().get_workspace_dir() / "timetable")
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, plan_id: str) -> Path:
        if "/" in plan_id or "\\" in plan_id or ".." in plan_id or ":" in plan_id:
            raise ValueError(f"Invalid plan_id: {plan_id!r}")
        return self._root / f"{plan_id}.json"

    def save(self, plan: TimetablePlan) -> None:
        with _cas_lock:
            plan.updated_at = time.time()
            plan.version += 1
            data = plan.model_dump(mode="json")
            text = json.dumps(data, ensure_ascii=False, indent=2)
            _atomic_write_text(self._path(plan.id), text)

    def load(self, plan_id: str) -> TimetablePlan | None:
        path = self._path(plan_id)
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return TimetablePlan.model_validate(data)

    def delete(self, plan_id: str) -> None:
        with _cas_lock:
            path = self._path(plan_id)
            if path.exists():
                path.unlink()

    def exists(self, plan_id: str) -> bool:
        return self._path(plan_id).exists()

    def list_all(self) -> list[str]:
        """Return all plan_ids that have a stored plan."""
        return sorted(p.stem for p in self._root.glob("*.json") if not p.name.startswith("."))


__all__ = ["TimetableStore"]
