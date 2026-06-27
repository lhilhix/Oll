import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get credentials from request headers or fallback to environment variables
function getOllamaCredentials(req: express.Request) {
  let host = (req.headers["x-ollama-host"] as string) || process.env.OLLAMA_HOST || "http://localhost:11434";
  let token = (req.headers["x-ollama-token"] as string) || process.env.OLLAMA_API_KEY || "";

  host = host.trim();
  if (host.endsWith("/")) {
    host = host.slice(0, -1);
  }
  if (!host.startsWith("http://") && !host.startsWith("https://")) {
    host = `http://${host}`;
  }

  return { host, token };
}

// Helper to create appropriate headers for the Ollama API
function getRequestHeaders(token: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    if (token.startsWith("Basic ") || token.startsWith("Bearer ")) {
      headers["Authorization"] = token;
    } else {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

// 1. Get default server configuration (non-sensitive check)
app.get("/api/ollama/config", (req, res) => {
  res.json({
    hasDefaultHost: !!process.env.OLLAMA_HOST,
    defaultHost: process.env.OLLAMA_HOST || "",
    hasDefaultToken: !!process.env.OLLAMA_API_KEY,
  });
});

// 2. Test Connection
app.post("/api/ollama/test", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);
  console.log(`[Ollama Proxy] Testing connection to: ${host}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

    // We fetch tags/models to see if endpoint is active and working
    const response = await fetch(`${host}/api/tags`, {
      method: "GET",
      headers: getRequestHeaders(token),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        message: "Successfully connected to Ollama!",
        modelsCount: data.models?.length || 0,
      });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({
        success: false,
        message: `Ollama returned error status ${response.status}`,
        details: errorText,
      });
    }
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Connection test failed:", error);
    res.status(500).json({
      success: false,
      message: error.name === "AbortError" ? "Connection timed out after 8s" : error.message || "Failed to reach remote server",
    });
  }
});

// 3. Proxy list models
app.post("/api/ollama/models", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);

  try {
    const response = await fetch(`${host}/api/tags`, {
      method: "GET",
      headers: getRequestHeaders(token),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || "Failed to get models" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Models fetch failed:", error);
    res.status(500).json({ error: error.message || "Internal server error connecting to Ollama" });
  }
});

// 4. Proxy model info
app.post("/api/ollama/show", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Model name is required" });
  }

  try {
    const response = await fetch(`${host}/api/show`, {
      method: "POST",
      headers: getRequestHeaders(token),
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || "Failed to get model info" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Show info failed:", error);
    res.status(500).json({ error: error.message || "Internal server error connecting to Ollama" });
  }
});

// 5. Proxy chat completion (supports streams!)
app.post("/api/ollama/chat", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);
  const body = req.body;

  try {
    const response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: getRequestHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || "Failed to call Ollama chat" });
    }

    // Check if the stream option is enabled
    if (body.stream !== false && response.body) {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // @ts-ignore
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Chat completion failed:", error);
    res.status(500).json({ error: error.message || "Internal server error connecting to Ollama" });
  }
});

// 6. Proxy generate completion (supports streams!)
app.post("/api/ollama/generate", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);
  const body = req.body;

  try {
    const response = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: getRequestHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || "Failed to call Ollama generate" });
    }

    // Check if stream is enabled
    if (body.stream !== false && response.body) {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // @ts-ignore
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Generation failed:", error);
    res.status(500).json({ error: error.message || "Internal server error connecting to Ollama" });
  }
});

// 7. Proxy pull model (supports streaming download status updates!)
app.post("/api/ollama/pull", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);
  const body = req.body;

  try {
    const response = await fetch(`${host}/api/pull`, {
      method: "POST",
      headers: getRequestHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || "Failed to pull model" });
    }

    if (body.stream !== false && response.body) {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // @ts-ignore
      for await (const chunk of response.body) {
        res.write(chunk);
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Pull failed:", error);
    res.status(500).json({ error: error.message || "Internal server error connecting to Ollama" });
  }
});

// 8. Proxy delete model
app.post("/api/ollama/delete", async (req, res) => {
  const { host, token } = getOllamaCredentials(req);
  const body = req.body;

  try {
    const response = await fetch(`${host}/api/delete`, {
      method: "DELETE",
      headers: getRequestHeaders(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || "Failed to delete model" });
    }

    res.json({ success: true, message: "Model deleted successfully" });
  } catch (error: any) {
    console.error("[Ollama Proxy Error] Delete model failed:", error);
    res.status(500).json({ error: error.message || "Internal server error connecting to Ollama" });
  }
});


// Boot Vite Dev Server or serve built assets
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
