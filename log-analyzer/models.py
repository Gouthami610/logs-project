from datetime import datetime
from typing import Optional, Dict, Any

class LogEntry:
    def __init__(
        self,
        timestamp: datetime,
        ip: str,
        method: str,
        path: str,
        status: Optional[int],
        response_time_ms: float,
        raw_line: str
    ):
        self.timestamp = timestamp
        self.ip = ip
        self.method = method
        self.path = path
        self.status = status
        self.response_time_ms = response_time_ms
        self.raw_line = raw_line

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat() + "Z" if not self.timestamp.tzinfo else self.timestamp.isoformat(),
            "ip": self.ip,
            "method": self.method,
            "path": self.path,
            "status": self.status,
            "response_time_ms": round(self.response_time_ms, 2),
            "raw_line": self.raw_line
        }

    def __repr__(self) -> str:
        return f"<LogEntry {self.method} {self.path} {self.status} {self.response_time_ms}ms>"
