import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const logAnalyzerCwd = path.join(process.cwd(), "log-analyzer");

  // Ensure directories exist on startup
  if (!fs.existsSync(logAnalyzerCwd)) {
    fs.mkdirSync(logAnalyzerCwd, { recursive: true });
  }

  // API 1: Generate Logs
  app.post("/api/logs/generate", async (req, res) => {
    try {
      const lines = parseInt(req.body.lines as string) || 1200;
      const safeLines = Math.min(Math.max(lines, 50), 3000);
      
      const cmd = `python3 scripts/generate_logs.py ${safeLines}`;
      const { stdout, stderr } = await execAsync(cmd, { cwd: logAnalyzerCwd });
      
      res.json({
        success: true,
        message: stdout || stderr,
        linesGenerated: safeLines
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
        details: "Is Python 3 installed on the system?"
      });
    }
  });

  // API 2: Run Analytics
  app.get("/api/logs/analytics", async (req, res) => {
    try {
      // Clean inputs to strictly prevent command injections
      const statusParam = req.query.status ? parseInt(req.query.status as string) : null;
      const endpointParam = req.query.endpoint ? String(req.query.endpoint).trim() : null;

      let cmd = "python3 main.py logs/generated.log --output-json";

      if (statusParam && !isNaN(statusParam)) {
        cmd += ` --status ${statusParam}`;
      }

      if (endpointParam) {
        // Sanitize path substring limit characters to prevent shell escape
        const sanitizedEndpoint = endpointParam.replace(/[^a-zA-Z0-9_\-\.\/]/g, "");
        if (sanitizedEndpoint) {
          cmd += ` --endpoint "${sanitizedEndpoint}"`;
        }
      }

      // Ensure the generated.log is created before running
      const logFilePath = path.join(logAnalyzerCwd, "logs", "generated.log");
      if (!fs.existsSync(logFilePath)) {
        // Run generator script automatically to bootstrap logs if missing!
        await execAsync("python3 scripts/generate_logs.py 1200", { cwd: logAnalyzerCwd });
      }

      const { stdout } = await execAsync(cmd, { cwd: logAnalyzerCwd });
      const stats = JSON.parse(stdout);
      
      res.json({
        success: true,
        analytics: stats
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
        details: "Parsing execution failed. Ensure logs/generated.log exists and contains text."
      });
    }
  });

  // API 3: Fetch Raw Log files content (tailing lines)
  app.get("/api/logs/content", (req, res) => {
    try {
      const fileType = req.query.type === "invalid" ? "invalid_lines.log" : "logs/generated.log";
      const filePath = path.join(logAnalyzerCwd, fileType);

      if (!fs.existsSync(filePath)) {
        return res.json({
          success: true,
          content: `[File empty or not yet generated. Choose 'Generate Logs' above to trigger.]`
        });
      }

      const stat = fs.statSync(filePath);
      const maxSize = 250 * 1024; // 250KB limit to avoid memory freeze
      
      // Read last portion of the file
      let content = "";
      if (stat.size > maxSize) {
        const stream = fs.createReadStream(filePath, { start: stat.size - maxSize, end: stat.size, encoding: "utf-8" });
        stream.on("data", chunk => { content += chunk; });
        stream.on("end", () => {
          // Slice first half line since it might be interrupted
          const lines = content.split("\n");
          const truncated = lines.slice(1).join("\n");
          res.json({
            success: true,
            content: `... [Truncated for preview length - showing trailing 200KB] ...\n${truncated}`,
            totalSizeKb: Math.round(stat.size / 1024)
          });
        });
        stream.on("error", (err) => {
          res.status(500).json({ success: false, error: err.message });
        });
      } else {
        content = fs.readFileSync(filePath, "utf-8");
        res.json({
          success: true,
          content: content || `[File is empty]`,
          totalSizeKb: Math.round(stat.size / 1024)
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 4: Get Code Files listing and content
  app.get("/api/files", (req, res) => {
    const targetFiles = [
      "main.py",
      "parser.py",
      "analyzer.py",
      "models.py",
      "utils.py",
      "scripts/generate_logs.py",
      "ANSWERS.md",
      "README.md"
    ];
    res.json({ success: true, files: targetFiles });
  });

  app.get("/api/files/content", (req, res) => {
    try {
      const selectedFile = String(req.query.file);
      const safeRelative = path.normalize(selectedFile).replace(/^(\.\.(\/|\\|$))+/, "");
      
      const fullPath = path.join(logAnalyzerCwd, safeRelative);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, error: "Requested file not found" });
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      res.json({
        success: true,
        content: content
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for dev / static files for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Log Analyzer Workbench running on http://localhost:${PORT}`);
  });
}

startServer();
