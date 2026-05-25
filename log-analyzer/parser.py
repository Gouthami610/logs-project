import json
import re
from typing import Optional, Tuple
from models import LogEntry
from utils import parse_timestamp, parse_response_time

class MalformedLineError(Exception):
    """Raised when a log line is malformed and cannot be normalized."""
    pass

class LogParser:
    # 1. Regex to check if a line is likely JSON
    JSON_PATTERN = re.compile(r'^\s*\{.*\}\s*$')

    # 2. Text patterns capturing alternating timestamps and spaces
    TEXT_PATTERNS = [
        # Pattern for 2-token timestamps (e.g. '2024/03/15 14:23:01' or '15-Mar-2024 14:23:01')
        re.compile(
            r'^(?P<timestamp>\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}|\d{2}-[A-Za-z]{3}-\d{4}\s+\d{2}:\d{2}:\d{2})\s+'
            r'(?P<ip>\S+)\s+'
            r'(?P<method>[A-Z]+)\s+'
            r'(?P<path>\S+)\s+'
            r'(?P<status>\d{3}|-)\s+'
            r'(?P<response_time>\S+)'
            r'(?:\s+(?P<trailing>.*))?$'
        ),
        
        # Pattern for 1-token timestamps (e.g. '2024-03-15T14:23:01Z' or '1710512581')
        re.compile(
            r'^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?|\d{10}(?:\.\d+)?)\s+'
            r'(?P<ip>\S+)\s+'
            r'(?P<method>[A-Z]+)\s+'
            r'(?P<path>\S+)\s+'
            r'(?P<status>\d{3}|-)\s+'
            r'(?P<response_time>\S+)'
            r'(?:\s+(?P<trailing>.*))?$'
        )
    ]

    @classmethod
    def parse_line(cls, raw_line: str) -> Optional[LogEntry]:
        """
        Parses a single log line (JSON or Text format), normalizes it, and returns a LogEntry object.
        Returns None for blank/empty lines.
        Raises MalformedLineError if parsing fails.
        """
        stripped = raw_line.strip()
        if not stripped:
            return None # Skip blank lines silently

        # Try JSON parsing if it looks like JSON
        if cls.JSON_PATTERN.match(stripped):
            try:
                data = json.loads(stripped)
                return cls._normalize_json(data, raw_line)
            except Exception as e:
                raise MalformedLineError(f"Failed to parse JSON line: {str(e)}") from e

        # Try Text regex pattern parsing
        for pattern in cls.TEXT_PATTERNS:
            match = pattern.match(stripped)
            if match:
                try:
                    return cls._normalize_match(match.groupdict(), raw_line)
                except Exception as e:
                    raise MalformedLineError(f"Normalization failed: {str(e)}") from e

        # If we reach here, it failed all patterns
        raise MalformedLineError("Does not match any recognized text patterns or JSON schemas")

    @classmethod
    def _normalize_json(cls, data: dict, raw_line: str) -> LogEntry:
        """Helper to extract and normalize fields from JSON dict."""
        try:
            raw_ts = data.get("timestamp") or data.get("time")
            raw_ip = data.get("ip") or data.get("ip_address") or "0.0.0.0"
            raw_method = data.get("method") or "_"
            raw_path = data.get("path") or data.get("url") or "/"
            raw_status = data.get("status")
            raw_rt = data.get("response_time") or data.get("latency") or "0"

            if not raw_ts:
                raise ValueError("Missing 'timestamp' in JSON log payload")

            # Validate core strings
            raw_method = str(raw_method).upper()
            raw_ip = str(raw_ip)
            raw_path = str(raw_path)

            # Parse types through helper utilities
            ts = parse_timestamp(str(raw_ts))
            rt_ms = parse_response_time(str(raw_rt))

            # Status code (can be missing, None, or string/number)
            status: Optional[int] = None
            if raw_status is not None:
                status_str = str(raw_status).strip()
                if status_str != "-":
                    status = int(status_str)

            return LogEntry(
                timestamp=ts,
                ip=raw_ip,
                method=raw_method,
                path=raw_path,
                status=status,
                response_time_ms=rt_ms,
                raw_line=raw_line
            )
        except Exception as e:
            raise MalformedLineError(f"JSON normalization failed: {str(e)}") from e

    @classmethod
    def _normalize_match(cls, group_dict: dict, raw_line: str) -> LogEntry:
        """Helper to extract and normalize fields from matched regex named groups."""
        try:
            ts = parse_timestamp(group_dict["timestamp"])
            rt_ms = parse_response_time(group_dict["response_time"])
            
            status_str = group_dict["status"].strip()
            status: Optional[int] = None
            if status_str != "-":
                status = int(status_str)

            return LogEntry(
                timestamp=ts,
                ip=group_dict["ip"],
                method=group_dict["method"].upper(),
                path=group_dict["path"],
                status=status,
                response_time_ms=rt_ms,
                raw_line=raw_line
            )
        except Exception as e:
            raise MalformedLineError(f"Field parsing failed: {str(e)}") from e
