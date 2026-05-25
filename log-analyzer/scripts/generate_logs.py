import random
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json

def generate_sample_logs(output_filepath: str = "logs/generated.log", total_lines: int = 1500):
    """
    Generates high-fidelity simulated logs, with 5-10% malformed lines,
    randomized IPs, multiple timestamps, response times, and standard/JSON fields.
    """
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    endpoints = [
        "/api/users", "/api/users/profile", "/api/auth/login", 
        "/api/auth/register", "/api/products", "/api/products/search",
        "/api/products/details", "/api/checkout/cart", "/api/checkout/pay",
        "/api/orders/history", "/static/css/main.css", "/index.html",
        "/api/healthz", "/api/v2/metrics", "/api/analytics/dashboard"
    ]
    
    methods_by_endpoint = {
        "/api/users": ["GET", "POST"],
        "/api/users/profile": ["GET", "PUT"],
        "/api/auth/login": ["POST"],
        "/api/auth/register": ["POST"],
        "/api/products": ["GET"],
        "/api/products/search": ["GET"],
        "/api/products/details": ["GET"],
        "/api/checkout/cart": ["GET", "POST", "DELETE"],
        "/api/checkout/pay": ["POST"],
        "/api/orders/history": ["GET"],
        "/static/css/main.css": ["GET"],
        "/index.html": ["GET"],
        "/api/healthz": ["GET"],
        "/api/v2/metrics": ["GET"],
        "/api/analytics/dashboard": ["GET"]
    }

    ips = [
        "192.168.1.42", "192.168.1.101", "10.0.0.15", "10.0.0.24",
        "172.16.89.4", "8.8.8.8", "1.1.1.1", "104.244.42.1", "185.190.140.23",
        "203.0.113.195", "198.51.100.22", "64.233.160.100", "94.130.4.12",
        "216.58.214.14", "13.224.29.81", "34.120.177.20"
    ]

    statuses = [200, 200, 200, 200, 200, 201, 204, 301, 304, 400, 401, 403, 404, 500, 503]
    user_agents = [
        '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
        '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"',
        '"Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)"',
        '"curl/7.81.0"',
        '"PostmanRuntime/7.32.2"',
        '"Googlebot/2.1 (+http://www.google.com/bot.html)"'
    ]

    base_time = datetime(2026, 5, 24, 12, 0, 0, tzinfo=timezone.utc)

    # Count of components we'll write
    lines_written = 0
    malformed_count = 0

    with open(out_path, "w", encoding="utf-8") as f:
        for i in range(total_lines):
            # Advance time sequentially to simulate logging history
            log_time = base_time + timedelta(seconds=i * random.uniform(0.5, 5.0))
            
            # Determine line quality (5-10% malformed)
            is_malformed = random.random() < 0.08  # ~8% malformed
            is_blank = (not is_malformed) and (random.random() < 0.02)  # ~2% blank lines
            
            if is_blank:
                f.write("\n")
                continue

            if is_malformed:
                # Let's generate a variety of malformed or corrupt logs
                malformed_type = random.choice([
                    "text_garbage", 
                    "stack_trace_portion", 
                    "bad_date_format", 
                    "corrupt_json_structure", 
                    "invalid_missing_fields"
                ])
                
                if malformed_type == "text_garbage":
                    f.write(random.choice([
                        "CRITICAL FAILURE: segfault at 0000000000000008 ip 00007ffff789c020",
                        "ERROR: Connection timed out to redis secondary node",
                        "Database connection pool size exhausted.",
                        "systemd[1]: Started Web Application Server daemon.",
                        "WARN: low memory warning triggered on node-4b"
                    ]) + "\n")
                elif malformed_type == "stack_trace_portion":
                    f.write(random.choice([
                        "    at org.postgresql.core.v3.QueryExecutorImpl.execute(QueryExecutorImpl.java:312)",
                        "    at com.example.web.UserController.getUserProfile(UserController.java:45)",
                        "Traceback (most recent call last):",
                        "  File \"/app/main.py\", line 152, in run_service"
                    ]) + "\n")
                elif malformed_type == "bad_date_format":
                    # Formats that fail parsed ranges or letters
                    f.write(f"2026-15-42T29:99:99Z {random.choice(ips)} GET /api/users 200 120ms\n")
                elif malformed_type == "corrupt_json_structure":
                    # Broken brackets or missing commas
                    f.write('{"timestamp":"2026-05-25T16:00:00Z", "ip":"8.8.8.8" "method":"GET", path:"/api/broken"\n')
                else:
                    # Missing fields that parser marks as required
                    f.write(f"2026-05-25T16:00:00Z {random.choice(ips)} GET 200 120ms\n") # Missing path

                malformed_count += 1
                lines_written += 1
                continue

            # Generate valid lines (variety of timestamps and response time formats)
            ip = random.choice(ips)
            endpoint = random.choice(endpoints)
            method = random.choice(methods_by_endpoint[endpoint])
            status = random.choice(statuses)
            
            # Response time (ms)
            rt = round(random.uniform(5.5, 1200.0), 2)
            
            # Missing status codes (represented as "-" with 5% chance)
            status_field = "-" if random.random() < 0.05 else str(status)

            # Response time format representation (ms, s, or plain number)
            rt_format = random.choice(["ms", "s", "plain"])
            if rt_format == "ms":
                rt_str = f"{rt}ms"
            elif rt_format == "s":
                rt_str = f"{round(rt / 1000.0, 4)}s"
            else:
                rt_str = f"{round(rt, 1)}"

            # Select log format: 1. standard text ISO, 2. Text alternative TS, 3. JSON, 4. Text with trailing, 5. Unix Epoch
            log_format = random.choice(["standard_iso", "alternate_ts_slash", "alternate_ts_word", "unix_epoch", "json", "trailing_fields"])
            
            if log_format == "standard_iso":
                ts_str = log_time.strftime("%Y-%m-%dT%H:%M:%SZ")
                f.write(f"{ts_str} {ip} {method} {endpoint} {status_field} {rt_str}\n")
            
            elif log_format == "alternate_ts_slash":
                ts_str = log_time.strftime("%Y/%m/%d %H:%M:%S")
                f.write(f"{ts_str} {ip} {method} {endpoint} {status_field} {rt_str}\n")
                
            elif log_format == "alternate_ts_word":
                # e.g. 15-Mar-2024 14:23:01
                ts_str = log_time.strftime("%d-%b-%Y %H:%M:%S")
                f.write(f"{ts_str} {ip} {method} {endpoint} {status_field} {rt_str}\n")
                
            elif log_format == "unix_epoch":
                ts_str = f"{int(log_time.timestamp())}"
                f.write(f"{ts_str} {ip} {method} {endpoint} {status_field} {rt_str}\n")
                
            elif log_format == "json":
                # Format response time representation inside json
                json_rt = f"{rt}ms" if random.random() < 0.5 else f"{rt}"
                json_obj = {
                    "timestamp": log_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "ip": ip,
                    "method": method,
                    "path": endpoint,
                    "status": None if status_field == "-" else int(status_field),
                    "response_time": json_rt
                }
                f.write(json.dumps(json_obj) + "\n")
                
            elif log_format == "trailing_fields":
                ts_str = log_time.strftime("%Y-%m-%dT%H:%M:%SZ")
                agent = random.choice(user_agents)
                f.write(f"{ts_str} {ip} {method} {endpoint} {status_field} {rt_str} {agent}\n")

            lines_written += 1

    print(f"File successfully outputted to {output_filepath}")
    print(f"Total lines written: {lines_written}")
    print(f"Malformed records written: {malformed_count} ({round(malformed_count / lines_written * 100, 2)}%)")

if __name__ == "__main__":
    import sys
    count = 1500
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            pass
    generate_sample_logs(total_lines=count)
