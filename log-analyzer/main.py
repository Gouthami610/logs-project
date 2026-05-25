import argparse
import sys
import os
import json
from pathlib import Path
from parser import LogParser, MalformedLineError
from analyzer import LogAnalyzer
from utils import color_text

def write_invalid_lines_log(malformed_records: list, output_path: str = "invalid_lines.log"):
    """Writes accumulated malformed lines to invalid_lines.log."""
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            for line_num, raw_line, error in malformed_records:
                # Write in a structured readable error diagnostic format
                f.write(f"Line {line_num} | Error: {error} | Content: {raw_line}\n")
    except Exception as e:
        print(f"Error writing to {output_path}: {e}", file=sys.stderr)

def print_terminal_report(stats: dict, use_color: bool = True):
    """Prints a highly polished, professional, colorized ASCII terminal report."""
    
    divider = color_text("=" * 65, "OKBLUE", use_color)
    sub_divider = color_text("-" * 65, "OKCYAN", use_color)
    
    print("\n" + divider)
    print(color_text(" PRODUCTION LOG ANALYZER - METRICS REPORT", "HEADER", use_color) + color_text(" (STRICTLY SECURE)", "BOLD", use_color))
    print(divider)
    
    # 1. Processing Volume Summary
    print(color_text("[1] PARSING SUMMARY", "BOLD", use_color))
    print(f"  ● Total Lines Read:         {stats['total_lines_processed']}")
    print(f"  ● Valid Entries Parsed:     {color_text(str(stats['valid_entries_count']), 'OKGREEN', use_color)}")
    print(f"  ● Malformed Entries:        {color_text(str(stats['malformed_entries_count']), 'FAIL', use_color)} ({stats['percentage_malformed_of_non_blank']}%)")
    print(f"  ● Blank Lines Skipped:      {stats['blank_lines_count']}")
    
    if stats['is_filtered']:
        print(color_text(f"  ● Filtered Valid Count:     {stats['filtered_valid_entries']} (Active Filters Applied)", "WARNING", use_color))
        
    print(sub_divider)

    # 2. Key Health Indicators
    print(color_text("[2] HEALTH & PERFORMANCE METRICS", "BOLD", use_color))
    
    # Select color based on error rate severity
    err_rate = stats['error_rate_percentage']
    err_color = "OKGREEN" if err_rate < 3.0 else ("WARNING" if err_rate < 10.0 else "FAIL")
    print(f"  ● Application Error Rate:   {color_text(f'{err_rate}%', err_color, use_color)}")
    
    # Methods distribution
    methods_str = ", ".join([f"{item['method']} ({item['count']})" for item in stats['method_distribution']])
    print(f"  ● HTTP Methods Observed:    {methods_str}")
    
    print(sub_divider)

    # 3. Top Endpoints
    print(color_text("[3] TOP 10 ACTIVE ENDPOINTS", "BOLD", use_color))
    if not stats['top_endpoints']:
        print("  (No endpoints captured matching filters)")
    else:
        print(f"  {'Rank':<5} | {'Endpoint Path':<35} | {'Request Count':<12}")
        print("  " + "-" * 56)
        for idx, item in enumerate(stats['top_endpoints'], start=1):
            print(f"  #{idx:<4} | {item['path']:<35} | {item['count']:<12}")
            
    print(sub_divider)

    # 4. Slowest Endpoints (SLA Offenders)
    print(color_text("[4] TOP 10 SLOWEST ENDPOINTS (SLA OFFENDERS)", "BOLD", use_color))
    if not stats['slowest_endpoints']:
        print("  (No latencies captured matching filters)")
    else:
        print(f"  {'Rank':<5} | {'Endpoint Path':<35} | {'Avg Latency':<12} | {'Requests':<8}")
        print("  " + "-" * 65)
        for idx, item in enumerate(stats['slowest_endpoints'], start=1):
            avg_str = f"{item['avg_response_time_ms']} ms"
            latency_color = "FAIL" if item['avg_response_time_ms'] > 500 else ("WARNING" if item['avg_response_time_ms'] > 200 else "OKGREEN")
            latency_str_colored = color_text(f"{avg_str:<12}", latency_color, use_color)
            print(f"  #{idx:<4} | {item['path']:<35} | {latency_str_colored} | {item['request_count']:<8}")

    print(sub_divider)

    # 5. Top IP Addresses
    print(color_text("[5] TOP 10 LOGGED IP ADDRESSES", "BOLD", use_color))
    if not stats['top_ips']:
        print("  (No client activity recorded)")
    else:
        print(f"  {'Rank':<5} | {'IP Address':<30} | {'Hits':<10}")
        print("  " + "-" * 49)
        for idx, item in enumerate(stats['top_ips'], start=1):
            print(f"  #{idx:<4} | {item['ip']:<30} | {item['count']:<10}")

    print(sub_divider)

    # 6. Status code distribution
    print(color_text("[6] HTTP STATUS CODE DISTRIBUTION", "BOLD", use_color))
    status_parts = []
    for code, count in stats['status_distribution'].items():
        # Assign colors to status ranges
        if code.startswith('2'):
            part_col = "OKGREEN"
        elif code.startswith('3'):
            part_col = "OKCYAN"
        elif code.startswith('4'):
            part_col = "WARNING"
        elif code.startswith('5') or code == "Missing":
            part_col = "FAIL"
        else:
            part_col = "ENDC"
            
        status_parts.append(f"{color_text(code, part_col, use_color)}: {count}")
    print("  " + "  |  ".join(status_parts))
    
    print(divider)
    print(color_text("Report compiled successfully and exported invalid lines to 'invalid_lines.log'.", "OKGREEN", use_color))
    print(divider + "\n")

def main():
    parser = argparse.ArgumentParser(
        description="Production-Quality Malformed-Tolerant Log Analyzer",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("log_path", help="Relative or absolute path to the target server log file")
    parser.add_argument("-s", "--status", type=int, help="Filter analytics by HTTP status code (e.g. 200, 404, 500)")
    parser.add_argument("-e", "--endpoint", help="Filter analytics by endpoint substring (e.g. '/api/users')")
    parser.add_argument("--no-color", action="store_true", help="Disable terminal colorization in output")
    parser.add_argument("--output-json", action="store_true", help="Output raw JSON results for machine piping")
    parser.add_argument("--invalid-output", default="invalid_lines.log", help="Path to write malformed lines report")

    args = parser.parse_args()

    log_path = Path(args.log_path)
    if not log_path.exists():
        if args.output_json:
            print(json.dumps({"error": f"File not found: {args.log_path}"}))
        else:
            print(color_text(f"Error: Log file not found at '{args.log_path}'", "FAIL"), file=sys.stderr)
        sys.exit(1)

    analyzer = LogAnalyzer()

    # Read the file line-by-line memory-efficiently
    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            for line_idx, raw_line in enumerate(f, start=1):
                analyzer.increment_total()
                try:
                    entry = LogParser.parse_line(raw_line)
                    if entry is None:
                        analyzer.increment_blank()
                    else:
                        analyzer.add_valid_entry(entry)
                except MalformedLineError as mle:
                    analyzer.add_malformed_line(line_idx, raw_line.rstrip('\r\n'), str(mle))
                except Exception as e:
                    # Catch-all guard to guarantee THE TOOL NEVER CRASHES ON ANY UNANTICIPATED error
                    analyzer.add_malformed_line(
                        line_idx, 
                        raw_line.rstrip('\r\n'), 
                        f"Unexpected Parse Exception: {str(e)}"
                    )
    except Exception as e:
        if args.output_json:
            print(json.dumps({"error": f"Failed reading log file: {str(e)}"}))
        else:
            print(color_text(f"Severe IO Fatal Error: {str(e)}", "FAIL"), file=sys.stderr)
        sys.exit(1)

    # Always write malformed lines to invalid_lines.log
    write_invalid_lines_log(analyzer.malformed_lines, args.invalid_output)

    # Perform calculations and retrieve analytics
    stats = analyzer.run_analytics(status_filter=args.status, endpoint_filter=args.endpoint)

    if args.output_json:
        # Include summary of invalid entries for frontend graphing
        stats["invalid_samples"] = [
            {"line": item[0], "content": item[1], "error": item[2]}
            for item in analyzer.malformed_lines[:150]  # Cap samples for reasonable payload sizes
        ]
        print(json.dumps(stats, indent=2))
    else:
        print_terminal_report(stats, use_color=(not args.no-color))

if __name__ == "__main__":
    main()
