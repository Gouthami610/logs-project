import datetime
import re
from typing import Optional

ANSI_COLORS = {
    "HEADER": "\033[95m",
    "OKBLUE": "\033[94m",
    "OKCYAN": "\033[96m",
    "OKGREEN": "\033[92m",
    "WARNING": "\033[93m",
    "FAIL": "\033[91m",
    "ENDC": "\033[0m",
    "BOLD": "\033[1m",
    "UNDERLINE": "\033[4m"
}

def color_text(text: str, color_name: str, enabled: bool = True) -> str:
    """Wraps text in ANSI escape colors if enabled."""
    if not enabled or color_name not in ANSI_COLORS:
        return text
    return f"{ANSI_COLORS[color_name]}{text}{ANSI_COLORS['ENDC']}"

def parse_timestamp(ts_str: str) -> datetime.datetime:
    """Parses various timestamp strings into datetime objects normalized to UTC."""
    ts_str = ts_str.strip()
    
    # 1. Check for pure Unix Epoch seconds (e.g. 1710512581 or 1710512581.123)
    if re.match(r'^\d+(\.\d+)?$', ts_str):
        try:
            return datetime.datetime.fromtimestamp(float(ts_str), datetime.timezone.utc)
        except Exception as e:
            raise ValueError(f"Invalid epoch timestamp float: {ts_str}") from e

    # Replace 'Z' with empty space for standard strptime parsing but mark tz as UTC
    is_utc = ts_str.endswith('Z')
    clean_str = ts_str[:-1] if is_utc else ts_str

    # Supporting multiple standard formats:
    # A) ISO 8601: 2024-03-15T14:23:01 / 2024-03-15T14:23:01.456
    # B) Alternate Separated: 2024/03/15 14:23:01
    # C) Word Month format: 15-Mar-2024 14:23:01
    # D) Space Separated: 2024-03-15 14:23:01
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y/%m/%d %H:%M:%S",
        "%d-%b-%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d/%b/%Y:%H:%M:%S", # Common Apache log date (often timezone follows, but we extract chunk)
    ]

    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(clean_str, fmt)
            return dt.replace(tzinfo=datetime.timezone.utc)
        except ValueError:
            continue

    raise ValueError(f"Unsupported timestamp format: '{ts_str}'")

def parse_response_time(rt_str: str) -> float:
    """Parses response time string formats (142ms, 0.142s, 142) and returns value in milliseconds."""
    rt_str = rt_str.strip().lower()
    if not rt_str:
        raise ValueError("Empty response time string")
        
    try:
        if rt_str.endswith('ms'):
            return float(rt_str[:-2])
        elif rt_str.endswith('s'):
            return float(rt_str[:-1]) * 1000.0
        else:
            # If no unit, assume milliseconds as fallback matching standard formats
            return float(rt_str)
    except ValueError as e:
        raise ValueError(f"Could not parse response time representing '{rt_str}'") from e
