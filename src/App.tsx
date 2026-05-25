import { useState, useEffect, FormEvent } from "react";
import {
  Terminal,
  FileText,
  CheckCircle,
  AlertCircle,
  LineChart,
  RefreshCw,
  Search,
  FileCode,
  Sliders,
  Database,
  ArrowRight,
  Shield,
  HelpCircle,
  Clock,
  Code2,
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";
import { LogAnalytics } from "./types";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function App() {
  // State for logs
  const [analytics, setAnalytics] = useState<LogAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [logCount, setLogCount] = useState<number>(1200);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [endpointQuery, setEndpointQuery] = useState<string>("");
  const [cliCommand, setCliCommand] = useState<string>("python3 main.py logs/generated.log");
  
  // Terminal logs state
  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [activeLogFile, setActiveLogFile] = useState<"generated" | "invalid">("generated");
  const [logFileSize, setLogFileSize] = useState<number>(0);

  // Src File Explorer State
  const [selectedFile, setSelectedFile] = useState<string>("main.py");
  const [fileContent, setFileContent] = useState<string>("");
  const [fileList, setFileList] = useState<string[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "stream" | "code" | "answers">("dashboard");

  // Fetch current analytics from Express API
  const fetchAnalytics = async (endpointVal = endpointQuery, statusVal = statusFilter) => {
    setLoading(true);
    try {
      let url = "/api/logs/analytics";
      const params: string[] = [];
      const cmdParts = ["python3 main.py logs/generated.log"];
      
      if (statusVal) {
        params.push(`status=${statusVal}`);
        cmdParts.push(`-s ${statusVal}`);
      }
      if (endpointVal) {
        params.push(`endpoint=${encodeURIComponent(endpointVal)}`);
        cmdParts.push(`-e "${endpointVal}"`);
      }
      
      setCliCommand(cmdParts.join(" "));
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        console.error("Failed to load metrics:", data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generate logs on backend
  const triggerLogGeneration = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/logs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: logCount })
      });
      const data = await res.json();
      if (data.success) {
        // Trigger analytics reload
        fetchAnalytics(endpointQuery, statusFilter);
        fetchLogContent(activeLogFile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Fetch log raw view
  const fetchLogContent = async (type: "generated" | "invalid") => {
    try {
      const res = await fetch(`/api/logs/content?type=${type}`);
      const data = await res.json();
      if (data.success) {
        setTerminalOutput(data.content);
        setLogFileSize(data.totalSizeKb || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch codebase files
  const fetchFileList = async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.success) {
        setFileList(data.files);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch file content
  const fetchFileContent = async (filename: string) => {
    setLoadingFile(true);
    try {
      const res = await fetch(`/api/files/content?file=${filename}`);
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFile(false);
    }
  };

  // Initial Boot
  useEffect(() => {
    fetchAnalytics();
    fetchFileList();
    fetchLogContent("generated");
  }, []);

  // Update stream when toggled
  useEffect(() => {
    fetchLogContent(activeLogFile);
  }, [activeLogFile]);

  // Update file view when file selected
  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile);
    }
  }, [selectedFile]);

  // Handle live filters
  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchAnalytics(endpointQuery, statusFilter);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setEndpointQuery("");
    fetchAnalytics("", "");
  };

  // Recharts pie format formatter
  const renderPieData = () => {
    if (!analytics || !analytics.status_distribution) return [];
    return Object.entries(analytics.status_distribution).map(([status, count]) => ({
      name: `HTTP ${status}`,
      value: count
    }));
  };

  // Safe percentage calculation
  const getPercentageColor = (pct: number) => {
    if (pct < 3) return "text-emerald-400";
    if (pct < 10) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] font-sans antialiased selection:bg-[#38BDF8]/20 p-6 border-[12px] border-[#1E293B] flex flex-col justify-between">
      {/* Editorial Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#334155] pb-4 mb-6">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#38BDF8] mb-1">
            System Diagnostics / Log Analysis Engine v1.2.0
          </span>
          <h1 className="text-4xl font-light tracking-tight text-[#E2E8F0] uppercase">
            Production Analytics Report
          </h1>
        </div>
        <div className="flex flex-col md:items-end gap-1 mt-3 md:mt-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] text-[#94A3B8] font-mono tracking-wider">SYSTEM_STATUS:</span>
            <div className="flex items-center gap-1.5 rounded-none bg-[#1E293B] px-2.5 py-0.5 border border-[#22C55E]/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E]/75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22C55E]"></span>
              </span>
              <span className="text-[#22C55E] text-[10px] font-mono uppercase tracking-wider font-semibold">Ready / Active</span>
            </div>
            <div className="flex items-center gap-1 bg-[#1E293B] px-2.5 py-0.5 border border-[#334155] text-slate-300 font-mono text-[10px]">
              <Clock className="h-3 w-3 text-[#94A3B8]" />
              UTC: 2026-05-25
            </div>
          </div>
          <p className="text-[10px] text-[#94A3B8] font-mono mt-1 text-left md:text-right">
            SOURCE FILE: <span className="text-[#38BDF8] font-semibold">/var/logs/generated_2024_03_15.log</span>
          </p>
        </div>
      </header>

      {/* COMMAND LINE RUNNER EMULATOR / SIMULATION DECK */}
      <div className="bg-[#111827] border border-white/10 p-3 mb-6 font-mono text-xs text-[#cbd5e1]">
        <div className="mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1 w-full md:w-auto">
            <span className="text-[#38BDF8] uppercase tracking-wider font-bold text-[10px] flex items-center gap-1.5 flex-shrink-0">
              <Sliders className="h-3.5 w-3.5" /> CLI RUNNER SIM:
            </span>
            <span className="bg-[#1E293B] px-2.5 py-1 rounded-none border border-[#334155] select-all text-xs text-[#E2E8F0] tracking-wide font-mono truncate">
              {cliCommand}
            </span>
          </div>
          <span className="text-[10px] text-[#94A3B8] tracking-widest uppercase flex-shrink-0">Fault-Tolerant Engine Active</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDE: CONTROLS & PARSING TOOLS (col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          {/* LOG STREAM GENERATOR CARD */}
          <div className="bg-[#1E293B] p-6 border-t-4 border-[#38BDF8] flex flex-col justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-[#38BDF8] flex justify-between items-center">
              <span>Simulation Settings</span>
              <span className="font-mono opacity-50">SI-01</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider mb-2">Log Density (Lines)</label>
                <input
                  type="range"
                  min="100"
                  max="2500"
                  step="50"
                  value={logCount}
                  onChange={(e) => setLogCount(Number(e.target.value))}
                  className="w-full h-1 bg-[#0F1115] rounded-none appearance-none cursor-pointer accent-[#38BDF8]"
                />
                <div className="flex justify-between font-mono text-[10px] text-[#94A3B8] mt-2">
                  <span>100</span>
                  <span className="text-[#38BDF8] font-bold">{logCount} lines</span>
                  <span>2500</span>
                </div>
              </div>

              <button
                onClick={triggerLogGeneration}
                disabled={generating}
                className="w-full bg-[#38BDF8] hover:bg-[#58c6f9] disabled:bg-slate-700 disabled:text-slate-400 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0F1115] py-3 transition-colors duration-150 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                {generating ? "GENERATING TELEMETRY..." : "GENERATE FRESH LOGS"}
              </button>

              <div className="text-[11px] text-[#94A3B8] leading-relaxed bg-[#111827] p-3 border border-white/5 font-mono">
                <span className="text-[#FBBF24] font-bold">MUTATION NOTE:</span> Intentionally writes 5%–10% malformed lines, alternative timestamps, JSON chunks, and empty vectors to stress-test error isolation algorithms.
              </div>
            </div>
          </div>

          {/* LIVE FILTERS CARD */}
          <div className="bg-[#1E293B] p-6 border-t-4 border-[#38BDF8] flex flex-col justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-[#38BDF8] flex justify-between items-center">
              <span>Parser Filter Params</span>
              <span className="font-mono opacity-50">SI-02</span>
            </h3>

            <form onSubmit={handleFilterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider mb-1.5">HTTP Status Code</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-none px-3 py-2 text-[#E2E8F0] font-mono text-xs focus:outline-none focus:border-[#38BDF8] transition-colors"
                >
                  <option value="">-- ALL STATUS CODES --</option>
                  <option value="200">200 (OK)</option>
                  <option value="201">201 (Created)</option>
                  <option value="204">204 (No Content)</option>
                  <option value="301">301 (Moved Permanently)</option>
                  <option value="304">304 (Not Modified)</option>
                  <option value="400">400 (Bad Request)</option>
                  <option value="401">401 (Unauthorized)</option>
                  <option value="403">403 (Forbidden)</option>
                  <option value="404">404 (Not Found)</option>
                  <option value="500">500 (Internal Error)</option>
                  <option value="503">503 (Service Unavailable)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider mb-1.5">Endpoint URI Query</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={endpointQuery}
                    onChange={(e) => setEndpointQuery(e.target.value)}
                    placeholder="/api/v1/user"
                    className="w-full bg-[#0F1115] border border-[#334155] rounded-none pl-9 pr-3 py-2 text-[#E2E8F0] font-mono text-xs focus:outline-none focus:border-[#38BDF8] transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#38BDF8] hover:bg-[#58c6f9] text-[#0F1115] font-mono font-bold uppercase tracking-wider py-2.5 transition-colors duration-150"
                >
                  APPLY FILTER
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 bg-[#111827] border border-[#334155] hover:bg-[#111827]/80 text-[#E2E8F0] font-mono font-bold uppercase tracking-wider py-2.5 transition-colors duration-150"
                >
                  RESET
                </button>
              </div>
            </form>
          </div>

          {/* DEFENSIVE STANDARDS LIST */}
          <div className="bg-[#111827] p-5 border border-white/10">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#38BDF8] mb-3 flex items-center gap-1.5 font-bold">
              <Shield className="h-3.5 w-3.5 text-[#38BDF8]" />
              Defensive Standards
            </h4>
            <ul className="space-y-2 font-mono text-[10px] text-[#94A3B8] list-none p-0 m-0 leading-relaxed uppercase">
              <li className="flex items-center gap-2">
                <span className="text-[#22C55E] font-bold">✓</span>
                <span>O(1) Streaming Reads</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#22C55E] font-bold">✓</span>
                <span>Isolation of Dirty Entries</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#22C55E] font-bold">✓</span>
                <span>Try-Except Global Guard rails</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#22C55E] font-bold">✓</span>
                <span>No SQL/No Cloud dependencies</span>
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT SIDE: VIEWPORT TABS & PANELS (col-span-9) */}
        <div className="lg:col-span-9 space-y-6">
          {/* INTERACTIVE NAVIGATION TAB ROW */}
          <div className="flex flex-wrap border border-[#334155] bg-[#111827] p-1 gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono uppercase tracking-wider transition-all border ${
                activeTab === "dashboard"
                  ? "bg-[#38BDF8] text-[#0F1115] border-[#38BDF8] font-bold"
                  : "text-[#94A3B8] border-transparent hover:text-white hover:bg-[#1E293B]"
              }`}
            >
              <LineChart className="h-3.5 w-3.5" />
              Metrics Dashboard
            </button>

            <button
              onClick={() => setActiveTab("stream")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono uppercase tracking-wider transition-all border ${
                activeTab === "stream"
                  ? "bg-[#38BDF8] text-[#0F1115] border-[#38BDF8] font-bold"
                  : "text-[#94A3B8] border-transparent hover:text-white hover:bg-[#1E293B]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Log Stream Tailing
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono uppercase tracking-wider transition-all border ${
                activeTab === "code"
                  ? "bg-[#38BDF8] text-[#0F1115] border-[#38BDF8] font-bold"
                  : "text-[#94A3B8] border-transparent hover:text-white hover:bg-[#1E293B]"
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Python Source Explorer
            </button>

            <button
              onClick={() => setActiveTab("answers")}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono uppercase tracking-wider transition-all border ${
                activeTab === "answers"
                  ? "bg-[#38BDF8] text-[#0F1115] border-[#38BDF8] font-bold"
                  : "text-[#94A3B8] border-transparent hover:text-white hover:bg-[#1E293B]"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              ANSWERS.md
            </button>
          </div>

          {/* TAB CONTENT: 1. DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* METRICS HERO COUNTERS */}
              {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Raw lines */}
                  <div className="bg-[#1E293B] p-5 border-l-2 border-[#38BDF8] flex flex-col justify-between">
                    <p className="text-[#94A3B8] text-[11px] uppercase font-bold tracking-wider mb-2">Total Lines Read</p>
                    <p className="text-4xl font-light text-[#E2E8F0] font-mono leading-none">
                      {analytics.total_lines_processed.toLocaleString()}
                    </p>
                  </div>

                  {/* Valid lines */}
                  <div className="bg-[#1E293B] p-5 border-l-2 border-[#22C55E] flex flex-col justify-between">
                    <p className="text-[#94A3B8] text-[11px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5 text-[#22C55E]">
                      Valid Entries
                    </p>
                    <p className="text-4xl font-light text-[#22C55E] font-mono leading-none">
                      {analytics.valid_entries_count.toLocaleString()}
                    </p>
                  </div>

                  {/* Malformed lines */}
                  <div className="bg-[#1E293B] p-5 border-l-2 border-[#F87171] flex flex-col justify-between">
                    <p className="text-[#94A3B8] text-[11px] uppercase font-bold tracking-wider mb-2">
                      Malformed Lines
                    </p>
                    <div>
                      <p className="text-4xl font-light text-[#F87171] font-mono leading-none">
                        {analytics.malformed_entries_count.toLocaleString()}
                      </p>
                      <p className={`text-[10px] ${getPercentageColor(analytics.percentage_malformed_of_non_blank)} font-mono mt-1`}>
                        ({analytics.percentage_malformed_of_non_blank}% of lines)
                      </p>
                    </div>
                  </div>

                  {/* Error rate */}
                  <div className="bg-[#1E293B] p-5 border-l-2 border-[#FBBF24] flex flex-col justify-between">
                    <p className="text-[#94A3B8] text-[11px] uppercase font-bold tracking-wider mb-2">Error Rate (HTTP)</p>
                    <div>
                      <p className="text-4xl font-light font-mono leading-none text-[#FBBF24]">
                        {analytics.error_rate_percentage}%
                      </p>
                      <p className="text-[10px] text-[#94A3B8] font-mono mt-1">Non-2xx Status Files</p>
                    </div>
                  </div>
                </div>
              )}

              {/* GRAPHICAL CHARTS CARDS */}
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CHART A: Slowest endpoints (Latencies) */}
                  <div className="bg-[#1E293B] p-6 border-t-2 border-[#38BDF8]">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-[#38BDF8] flex justify-between items-center">
                      <span>Slowest Response Times (Avg)</span>
                      <span className="font-mono opacity-50">01</span>
                    </h4>
                    <div className="h-64 mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={analytics.slowest_endpoints}
                          margin={{ left: 20, right: 10, top: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                          <XAxis type="number" stroke="#94A3B8" unit="ms" className="font-mono text-[10px]" />
                          <YAxis type="category" dataKey="path" stroke="#94A3B8" width={80} className="font-mono text-[9px]" />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#111827", borderColor: "#334155", color: "#E2E8F0" }}
                            itemStyle={{ color: "#38BDF8" }}
                          />
                          <Bar dataKey="avg_response_time_ms" fill="#38bdf8" radius={[0, 2, 2, 0]}>
                            {analytics.slowest_endpoints.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.avg_response_time_ms > 400 ? "#F87171" : "#38BDF8"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART B: Status Distribution */}
                  <div className="bg-[#1E293B] p-6 border-t-2 border-[#38BDF8] flex flex-col justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-[#38BDF8] flex justify-between items-center">
                      <span>Status Distribution</span>
                      <span className="font-mono opacity-50">02</span>
                    </h4>
                    <div className="h-44 mt-4 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={renderPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {renderPieData().map((entry, index) => {
                              let colVal = COLORS[index % COLORS.length];
                              if (entry.name.includes("2")) colVal = "#22C55E";
                              else if (entry.name.includes("3")) colVal = "#38BDF8";
                              else if (entry.name.includes("4")) colVal = "#FBBF24";
                              else if (entry.name.includes("5") || entry.name.toLowerCase().includes("miss")) colVal = "#F87171";
                              return <Cell key={`cell-${index}`} fill={colVal} />;
                            })}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "#111827", borderColor: "#334155", color: "#E2E8F0" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[11px] font-mono text-[#94A3B8] select-none mt-4 border-t border-white/5 pt-4">
                      {renderPieData().map((entry, index) => {
                        let dotCol = "bg-blue-500";
                        if (entry.name.includes("2")) dotCol = "bg-[#22C55E]";
                        else if (entry.name.includes("3")) dotCol = "bg-[#38BDF8]";
                        else if (entry.name.includes("4")) dotCol = "bg-[#FBBF24]";
                        else if (entry.name.includes("5") || entry.name.toLowerCase().includes("miss")) dotCol = "bg-[#F87171]";
                        return (
                          <span key={entry.name} className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${dotCol}`}></span>
                            <span>{entry.name}: {entry.value}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VISITOR DATA GRID SUMMARIES */}
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Active Endpoints */}
                  <div className="bg-[#1E293B] p-6 border-t-2 border-[#38BDF8]">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-[#38BDF8] flex justify-between items-center">
                      <span>Top Endpoints by Volume</span>
                      <span className="font-mono opacity-50">03</span>
                    </h2>
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#334155] text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5">Rank</th>
                            <th className="py-2.5">URI Path</th>
                            <th className="py-2.5 text-right">Hit Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {analytics.top_endpoints.slice(0, 5).map((ep, idx) => (
                            <tr key={ep.path} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 w-12 text-[#94A3B8]">0{idx + 1}</td>
                              <td className="py-2.5 text-[#E2E8F0] truncate max-w-xs">{ep.path}</td>
                              <td className="py-2.5 text-right text-[#38BDF8] font-bold">{ep.count.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top IP visitors */}
                  <div className="bg-[#1E293B] p-6 border-t-2 border-[#38BDF8]">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-[#38BDF8] flex justify-between items-center">
                      <span>Client Load Distribution</span>
                      <span className="font-mono opacity-50">04</span>
                    </h2>
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#334155] text-[#94A3B8] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5">Rank</th>
                            <th className="py-2.5">IP Address</th>
                            <th className="py-2.5 text-right">Hits Record</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {analytics.top_ips.slice(0, 5).map((ipItem, idx) => (
                            <tr key={ipItem.ip} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 w-12 text-[#94A3B8]">0{idx + 1}</td>
                              <td className="py-2.5 text-[#E2E8F0]">{ipItem.ip}</td>
                              <td className="py-2.5 text-right text-[#38BDF8] font-bold">{ipItem.count.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ANOMALY LOG VIEW FROM THEME */}
              {analytics && analytics.invalid_samples && analytics.invalid_samples.length > 0 && (
                <div className="bg-[#111827] p-6 border border-white/10">
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-rose-400 flex justify-between items-center">
                    <span>Anomaly Log (Last {Math.min(5, analytics.invalid_samples.length)})</span>
                    <span className="font-mono opacity-50 text-[10px]">DIAGNOSTIC_ERR</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mb-4 font-mono uppercase tracking-wider">
                    The parser streams malformed inputs safely to <code className="bg-[#1E293B] text-[#F87171] px-1 py-0.5 border border-white/5 font-mono text-[11px]">invalid_lines.log</code> preserving throughput.
                  </p>
                  <div className="font-mono space-y-3">
                    {analytics.invalid_samples.slice(0, 5).map((item) => (
                      <div key={item.line} className="p-3 border-l-2 border-[#F87171] bg-[#F87171]/5 text-xs">
                        <div className="flex flex-col sm:flex-row justify-between gap-1 pb-1.5 mb-1.5 border-b border-white/5 text-[#F87171]">
                          <span>LINE_NUM: {item.line}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-[#F87171]/20 px-1.5 py-0.5">
                            {item.error}
                          </span>
                        </div>
                        <p className="truncate text-[#E2E8F0]">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: 2. LOG STREAM VIEWER */}
          {activeTab === "stream" && (
            <div className="bg-[#1E293B] p-6 border-t-2 border-[#38BDF8]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8]">
                    Log Terminal Diagnostics
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1 font-mono uppercase tracking-wider">
                    Real-time tail viewer of active file outputs inside dynamic server
                  </p>
                </div>

                {/* Selector */}
                <div className="flex bg-[#0F1115] p-1 border border-[#334155] font-mono text-[11px]">
                  <button
                    onClick={() => setActiveLogFile("generated")}
                    className={`px-4 py-1.5 transition-all text-xs uppercase tracking-wider font-bold ${
                      activeLogFile === "generated"
                        ? "bg-[#38BDF8] text-[#0F1115]"
                        : "text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    generated.log
                  </button>
                  <button
                    onClick={() => setActiveLogFile("invalid")}
                    className={`px-4 py-1.5 transition-all text-xs uppercase tracking-wider font-bold ${
                      activeLogFile === "invalid"
                        ? "bg-[#F87171] text-[#0F1115]"
                        : "text-[#94A3B8] hover:text-[#F87171]"
                    }`}
                  >
                    invalid_lines.log
                  </button>
                </div>
              </div>

              {/* Terminal emulator frame */}
              <div className="border border-[#334155] bg-[#0F1115]">
                <div className="bg-[#111827] px-4 py-3 flex items-center justify-between border-b border-[#334155] text-xs select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]"></span>
                    <span className="ml-2 font-mono text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wider">
                      stdout --tail 200 {activeLogFile === "generated" ? "logs/generated.log" : "invalid_lines.log"}
                    </span>
                  </div>
                  <span className="text-[#94A3B8] text-[11px] font-mono">WEIGHT: {logFileSize} KB</span>
                </div>

                <div className="p-4 font-mono text-xs text-[#22C55E] overflow-y-auto max-h-[500px] whitespace-pre-wrap leading-relaxed select-text bg-[#0F1115] min-h-[300px]">
                  {terminalOutput ? terminalOutput : "NO TELEMETRY RECORDED IN CURRENT SESSION"}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 3. CODE EXPLORER */}
          {activeTab === "code" && (
            <div className="grid grid-cols-1 md:grid-cols-4 border border-[#334155] bg-[#111827]">
              {/* File Sidebar */}
              <div className="md:col-span-1 p-4 font-mono text-xs border-r border-[#334155] bg-[#111827]">
                <div className="text-[#94A3B8] font-bold px-2 mb-4 tracking-widest uppercase text-[10px]">
                  Files Structure
                </div>
                <div className="space-y-1.5">
                  {fileList.map((filename) => (
                    <button
                      key={filename}
                      onClick={() => setSelectedFile(filename)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all font-mono text-[11px] ${
                        selectedFile === filename
                          ? "bg-[#38BDF8] text-[#0F1115] font-bold"
                          : "text-[#cbd5e1] hover:bg-[#1E293B] hover:text-white"
                      }`}
                    >
                      {filename.endsWith(".md") ? (
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <FileCode className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{filename}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Viewer */}
              <div className="md:col-span-3 p-6 flex flex-col bg-[#1E293B]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#334155]">
                  <div>
                    <h3 className="text-sm font-bold text-[#E2E8F0] font-mono">{selectedFile}</h3>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
                      PATH: <code className="text-[#38BDF8]">/log-analyzer/{selectedFile}</code>
                    </p>
                  </div>
                  <span className="text-[10px] bg-[#111827] text-[#38BDF8] font-mono px-2 py-0.5 border border-[#334155] uppercase font-bold tracking-wider">
                    MODULE
                  </span>
                </div>

                {loadingFile ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-[#cbd5e1] text-xs font-mono">
                    <RefreshCw className="h-5 w-5 animate-spin mb-2 text-[#38BDF8]" />
                    BUFFERING SOURCE FILE...
                  </div>
                ) : (
                  <div className="border border-[#334155] bg-[#0F1115] overflow-hidden">
                    <div className="p-4 text-xs font-mono text-[#E2E8F0] overflow-x-auto whitespace-pre leading-relaxed max-h-[600px] select-text">
                      {fileContent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 4. ANSWERS */}
          {activeTab === "answers" && (
            <div className="bg-[#1E293B] p-6 border-t-2 border-[#38BDF8] text-[#cbd5e1] max-h-[700px] overflow-y-auto">
              <div className="mb-6 flex items-center gap-2 pb-4 border-b border-[#334155]">
                <HelpCircle className="h-6 w-6 text-[#22C55E]" />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8]">
                    Walkthrough Questionnaire
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1 font-mono uppercase tracking-wider">
                    System analysis architecture responses formulated by diagnostic developers
                  </p>
                </div>
              </div>

              {/* Question blocks */}
              <div className="space-y-6">
                <div className="bg-[#111827] p-5 border border-white/5">
                  <h3 className="text-[#38BDF8] font-bold mb-3 flex justify-between items-center font-mono text-[11px] uppercase tracking-wider">
                    <span>Q1: HOW TO ROLL OUT ON NEW SERVERS?</span>
                    <span className="text-[10px] text-emerald-400">01</span>
                  </h3>
                  <p className="mb-3 text-[#cbd5e1] text-xs leading-relaxed font-sans">
                    Ensure Python 3.8+ compatibility. Run these direct prompt sequence buffers to isolate and parse raw logs:
                  </p>
                  <pre className="bg-[#0F1115] border border-[#334155] text-[#38BDF8] p-3.5 font-mono text-xs overflow-x-auto whitespace-pre rounded-none">
{`# 1. Access codebase directory
cd log-analyzer

# 2. Command telemetry writes
python3 scripts/generate_logs.py --count 1200

# 3. Direct metrics extraction
python3 main.py logs/generated.log`}
                  </pre>
                </div>

                <div className="bg-[#111827] p-5 border border-white/5">
                  <h3 className="text-[#38BDF8] font-bold mb-3 flex justify-between items-center font-[#38BDF8] font-mono text-[11px] uppercase tracking-wider">
                    <span>Q2: PYTHON VS Worse Alternatives</span>
                    <span className="text-[10px] text-emerald-400">02</span>
                  </h3>
                  <p className="text-xs leading-relaxed font-sans text-[#cbd5e1]">
                    <strong>Python</strong> provides high-speed, natively integrated regex parsing via C-based bindings and is built into 99% of Unix runtime instances without requiring bulky package trees.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed font-sans text-[#cbd5e1]">
                    <strong>TypeScript / Node.js alternative</strong>: Demands complex dev setups, memory-intensive runtime abstractions, and massive dependency structures (`node_modules`) just to iterate simple file streams.
                  </p>
                </div>

                <div className="bg-[#111827] p-5 border border-white/5">
                  <h3 className="text-[#38BDF8] font-bold mb-3 flex justify-between items-center font-mono text-[11px] uppercase tracking-wider">
                    <span>Q3: KEY EDGE CASES IDENTIFIED</span>
                    <span className="text-[10px] text-emerald-400">03</span>
                  </h3>
                  <p className="text-xs leading-relaxed font-sans text-[#cbd5e1]">
                    <strong>Out-of-bound blank spacing logs:</strong> Splitting parameters fails. We engineered a robust regular expression match scheme that normalizes multiple spacing delimiters dynamically.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed font-sans text-[#cbd5e1]">
                    <strong>JSON embedded responses:</strong> Isolated completely using robust string delimiters to prevent crashes.
                  </p>
                </div>

                <div className="bg-[#111827] p-5 border border-white/5">
                  <h3 className="text-[#38BDF8] font-bold mb-3 flex justify-between items-center font-mono text-[11px] uppercase tracking-wider">
                    <span>Q4: DEFENSIVE SCALE STRATEGY (GAP SUMMARY)</span>
                    <span className="text-[10px] text-emerald-400">04</span>
                  </h3>
                  <p className="text-xs leading-relaxed font-sans text-[#cbd5e1]">
                    <strong>Bottleneck:</strong> Iterating line-by-line single-threaded bound speeds can cause throughput lags in massive multi-GB logs.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed font-sans text-[#cbd5e1]">
                    <strong>Prescribed Scaling:</strong> Deploy multi-chunk stream buffers utilizing <code className="bg-[#0F1115] text-[#38BDF8] px-1 text-xs px-1 font-mono">multiprocessing.Pool</code> chunks to scan segments in parallel cores concurrently.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Editorial Monochrome Footer */}
      <footer className="mt-12 pt-4 border-t border-[#334155] flex flex-col sm:flex-row justify-between items-center text-[#94A3B8] font-mono text-[10px] uppercase tracking-widest gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center sm:justify-start">
          <span>PROCESSOR: HOST_X86_64</span>
          <span>UPTIME: 2.5s (FAST_IO)</span>
          <span>THREAD-SAFE: TRUE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
          <span>ALL PARSER DIAGNOSTICS NOMINAL</span>
        </div>
      </footer>
    </div>
  );
}
