// Render cold start fix — pings backend every 10 minutes
const BACKEND_URL = "https://ai-data-copilot-rxa8.onrender.com";

export function startKeepAlive() {
  // Pehle turant ping karo
  ping();
  // Phir har 10 minute pe
  setInterval(ping, 10 * 60 * 1000);
}

async function ping() {
  try {
    await fetch(`${BACKEND_URL}/health`);
    console.log("Backend alive ✅", new Date().toLocaleTimeString());
  } catch (e) {
    console.log("Backend ping failed ❌");
  }
}
