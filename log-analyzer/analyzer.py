import collections
from typing import List, Dict, Any, Optional
from models import LogEntry

class LogAnalyzer:
    def __init__(self):
        self.total_lines: int = 0
        self.valid_entries: List[LogEntry] = []
        self.malformed_lines: List[tuple] = []  # List of tuple (line_num, raw_line, error_msg)
        self.blank_lines: int = 0

    def add_valid_entry(self, entry: LogEntry):
        """Adds a successfully parsed entry for analysis."""
        self.valid_entries.append(entry)

    def add_malformed_line(self, line_num: int, raw_line: str, error_msg: str):
        """Pairs malformed log lines with their error logs."""
        self.malformed_lines.append((line_num, raw_line, error_msg))

    def increment_blank(self):
        """Increments index for empty blank lines."""
        self.blank_lines += 1

    def increment_total(self):
        """Increments physical line count."""
        self.total_lines += 1

    def run_analytics(
        self, 
        status_filter: Optional[int] = None, 
        endpoint_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes aggregates and summaries from the collected records.
        Supports filtering by status code and endpoint.
        """
        # Filter entries if filters are applied
        filtered_entries = self.valid_entries
        
        if status_filter is not None:
            filtered_entries = [e for e in filtered_entries if e.status == status_filter]
            
        if endpoint_filter is not None:
            # Simple substring match or exact match (substring is nicer for paths like /api/users/1)
            filtered_entries = [e for e in filtered_entries if endpoint_filter.lower() in e.path.lower()]

        total_processed_logs = len(filtered_entries)
        
        # 1. Top IP addresses
        ip_counter = collections.Counter(e.ip for e in filtered_entries)
        top_ips = ip_counter.most_common(10)

        # 2. Top Endpoints
        endpoint_counter = collections.Counter(e.path for e in filtered_entries)
        top_endpoints = endpoint_counter.most_common(10)

        # 3. Status Code distribution
        status_counter = collections.Counter(e.status for e in filtered_entries)
        # Sort status distribution by status code (with None/missing handled safely)
        status_dist = dict(sorted(status_counter.items(), key=lambda x: (x[0] is None, x[0] or 0)))

        # 4. HTTP Method distribution
        method_counter = collections.Counter(e.method for e in filtered_entries)
        top_methods = method_counter.most_common()

        # 5. Slowest endpoints by average response time
        endpoint_latencies = collections.defaultdict(list)
        for e in filtered_entries:
            endpoint_latencies[e.path].append(e.response_time_ms)

        slowest_endpoints = []
        for path, latencies in endpoint_latencies.items():
            avg_lat = sum(latencies) / len(latencies)
            slowest_endpoints.append({
                "path": path,
                "avg_response_time_ms": round(avg_lat, 2),
                "request_count": len(latencies)
            })
        slowest_endpoints.sort(key=lambda x: x["avg_response_time_ms"], reverse=True)
        top_slowest = slowest_endpoints[:10]

        # 6. Error rate calculation
        # Errors defined as status >= 400 or missing status code (None)
        errors_count = sum(1 for e in filtered_entries if e.status is None or e.status >= 400)
        error_rate_pct = round((errors_count / total_processed_logs * 100), 2) if total_processed_logs > 0 else 0.0

        # Calculate general malformed percentage against total lines parsed
        # excluding blank lines from dividing base to keep stats meaningful (or including, let's include)
        malformed_count = len(self.malformed_lines)
        comparison_total = self.total_lines - self.blank_lines
        pct_malformed = round((malformed_count / comparison_total * 100), 2) if comparison_total > 0 else 0.0

        return {
            "total_lines_processed": self.total_lines,
            "valid_entries_count": len(self.valid_entries),
            "filtered_valid_entries": total_processed_logs,
            "malformed_entries_count": malformed_count,
            "blank_lines_count": self.blank_lines,
            "percentage_malformed_of_non_blank": pct_malformed,
            "top_endpoints": [{"path": k, "count": v} for k, v in top_endpoints],
            "top_ips": [{"ip": k, "count": v} for k, v in top_ips],
            "status_distribution": {str(k if k is not None else "Missing"): v for k, v in status_dist.items()},
            "slowest_endpoints": top_slowest,
            "error_rate_percentage": error_rate_pct,
            "method_distribution": [{"method": k, "count": v} for k, v in top_methods],
            "is_filtered": status_filter is not None or endpoint_filter is not None
        }
