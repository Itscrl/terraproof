"""Local SQLite repository; no private farm records are collected by the MVP."""

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


class Store:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS comparisons (
                id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL,
                result TEXT NOT NULL)""")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def save(self, result: dict) -> dict:
        record = {
            "id": str(uuid4()),
            "title": result["request"]["title"],
            "created_at": datetime.now(UTC).isoformat(),
        }
        with self.connect() as db:
            db.execute(
                "INSERT INTO comparisons VALUES (?, ?, ?, ?)",
                (*record.values(), json.dumps(result, allow_nan=False)),
            )
        return record

    def list(self) -> list[dict]:
        with self.connect() as db:
            return [
                dict(row)
                for row in db.execute(
                    "SELECT id, title, created_at FROM comparisons "
                    "ORDER BY created_at DESC LIMIT 100"
                )
            ]

    def get(self, record_id: str) -> dict | None:
        with self.connect() as db:
            row = db.execute("SELECT * FROM comparisons WHERE id = ?", (record_id,)).fetchone()
        return {**dict(row), "result": json.loads(row["result"])} if row else None

    def delete(self, record_id: str) -> bool:
        with self.connect() as db:
            return db.execute("DELETE FROM comparisons WHERE id = ?", (record_id,)).rowcount > 0
