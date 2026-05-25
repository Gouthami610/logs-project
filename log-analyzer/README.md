# 🚀 PRODUCTION-QUALITY LOG ANALYZER

A robust, fault-tolerant log parsing and analysis tool written in pure Python. It utilizes standard libraries to digest extremely varied log topologies (JSON, standard text, Unix epoch, alternate timestamps, custom brackets) and gracefully handles malformed data.

Designed to assist on-call engineers inside real production containers during critical system audits.

---

## 🌟 Key Features

-   **🛡️ Ironclad Defensive Parsing:** Synthesizes and normalizes logs into a standard structured model. If a line is malformed or corrupt, it is skipped, counted, and recorded—**never crashing the master process**.
-   **📈 Rich Analytics Output:** Computes status code counts, active endpoints, application error rates, top IPs, and **identifies slowest endpoints (SLA offenders)**.
-   **🧹 Multi-Format Support:** Correctly digests ISO timestamps, Unix epoch timestamps, human-readable date strings, trailing browser user-agents, and modern JSON logs.
-   **📁 Invalid Line Isolation:** Automatically logs each malformed log line to `invalid_lines.log` with detailed line numbers and specific validation error logs to aid debugging.
-   **⚡ Memory Efficient:** Iterates line-by-line using Python lazy generators, maintaining an **O(1) memory footprint** regardless of the size of the target system log file.
-   **🎨 Polish & Control:** Colorized ANSI terminal outputs with status-specific formatting plus support for **substring endpoint and exact HTTP status code filters**.

---

## 🏗️ Architecture Design & Flow

```
Raw Log Stream (text/JSON) ──► LogParser.parse_line() ──► [Normalizer]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                  [Valid Entry]                [Malformed Line]
                         │                             │
                LogAnalyzer State              invalid_lines.log
                         │
                         ▼
             CLI Printable Metrics Report / JSON Pipe API
```

1. **`models.py`**: Defines the uniform, internal Python `LogEntry` entity representation.
2. **`parser.py`**: Controls regex patterns and JSON deserializers to dynamically handle and validate incoming data.
3. **`analyzer.py`**: Collects entries, keeps track of parsed aggregates, computes statistics, calculates error rates, and ranks sluggish request response times.
4. **`utils.py`**: Provides low-level string-to-type parsing for complex timestamps, custom response metrics (converting `s` to `ms` units), and color definitions.
5. **`main.py`**: Implements the user-facing CLI command interface, file reader loops, status filter switches, and output renderers.

---

## 🚀 Setup & Execution

### 1. Requirements
Ensure you have **Python 3.8+** installed. No extra `pip install` commands are needed!

### 2. Generate Simulated Log Data
Run the mock log builder script to generate a rich sample of production data inside `logs/generated.log` containing mixed formats and standard errors:
```bash
python3 scripts/generate_logs.py
```

### 3. Run Analysis
To process files and generate the terminal dashboard report:
```bash
python3 main.py logs/generated.log
```

---

## 🛠️ Advanced Filter Flags

- **Filter by 500 error logs:**
  ```bash
  python3 main.py logs/generated.log -s 500
  ```
- **Filter by checkout API and measure response times:**
  ```bash
  python3 main.py logs/generated.log -e "/api/checkout"
  ```
- **Export clean JSON stats for programmatic scripting (like charts/web dashboards):**
  ```bash
  python3 main.py logs/generated.log --output-json
  ```
- **Disable color schemes for pure text logs:**
  ```bash
  python3 main.py logs/generated.log --no-color
  ```

---

## 📊 Sample Terminal Output

```text
=================================================================
 PRODUCTION LOG ANALYZER - METRICS REPORT (STRICTLY SECURE)
=================================================================
[1] PARSING SUMMARY
  ● Total Lines Read:         1500
  ● Valid Entries Parsed:     1380
  ● Malformed Entries:        120 (8.0%)
  ● Blank Lines Skipped:      32

-----------------------------------------------------------------
[2] HEALTH & PERFORMANCE METRICS
  ● Application Error Rate:   5.4%
  ● HTTP Methods Observed:    GET (865), POST (412), PUT (63), DELETE (40)

-----------------------------------------------------------------
[3] TOP 10 ACTIVE ENDPOINTS
  Rank  | Endpoint Path                       | Request Count
  --------------------------------------------------------
  #1    | /api/users                          | 242
  #2    | /api/products/search                | 194
  #3    | /api/auth/login                     | 183
  ...

-----------------------------------------------------------------
[4] TOP 10 SLOWEST ENDPOINTS (SLA OFFENDERS)
  Rank  | Endpoint Path                       | Avg Latency  | Requests
  -----------------------------------------------------------------
  #1    | /api/checkout/pay                   | 891.4 ms     | 64
  #2    | /api/users/profile                  | 420.1 ms     | 42
  ...

=================================================================
Report compiled successfully and exported invalid lines to 'invalid_lines.log'.
=================================================================
```
