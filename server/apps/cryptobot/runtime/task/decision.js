import { agentTask } from "../../../app_shared/agentTask.js";

const requestDecisionTask = async (cfg) => {
  const title = "Cryptobot Autonomous Run";
  const baseUrl = cfg.base_url || "https://www.okx.com";
  const prompt = `You are an autonomous cryptocurrency trading agent operating in LIVE trading mode on OKX.

Goal: ${cfg.goal || ""}

Exchange credentials (use these exactly when signing requests):
API Endpoint: ${baseUrl}
API Key: ${cfg.api_key || ""}
API Secret: ${cfg.api_secret || ""}
Passphrase: ${cfg.passphrase || ""}

# CRITICAL EXECUTION RULES — read carefully

1. You MUST use the terminal_exec tool to fetch real market data and to place real orders. Do NOT make up prices, balances, or trade results from your training knowledge. Every fact in your final summary must come from a tool call you actually made in this run.

2. To get public market data (no auth needed), call OKX REST endpoints with curl, e.g.:
   curl -s "${baseUrl}/api/v5/market/ticker?instId=BTC-USDT"
   curl -s "${baseUrl}/api/v5/market/candles?instId=BTC-USDT&bar=1H&limit=20"

3. To call private OKX endpoints (account balance, place order, etc.), you MUST sign each request with HMAC-SHA256 of (timestamp + method + requestPath + body) using the API Secret, base64-encoded. Required headers:
     OK-ACCESS-KEY: <api_key>
     OK-ACCESS-SIGN: <base64(hmacSHA256(timestamp+method+requestPath+body, api_secret))>
     OK-ACCESS-TIMESTAMP: <ISO timestamp, e.g. 2024-01-01T00:00:00.000Z>
     OK-ACCESS-PASSPHRASE: <passphrase>
   Generate the signature in a single shell command (use python3 / openssl / node — your choice). Example with python3:
     ts=$(python3 -c "import datetime;print(datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]+'Z')")
     body=''
     sig=$(python3 -c "import hmac,hashlib,base64; print(base64.b64encode(hmac.new(b'<secret>', ('$ts'+'GET'+'/api/v5/account/balance'+'$body').encode(),hashlib.sha256).digest()).decode())")
     curl -s -H "OK-ACCESS-KEY: <key>" -H "OK-ACCESS-SIGN: $sig" -H "OK-ACCESS-TIMESTAMP: $ts" -H "OK-ACCESS-PASSPHRASE: <pass>" "${baseUrl}/api/v5/account/balance"

4. Recommended workflow each run:
   a. Fetch current prices for the instruments your goal cares about
   b. Fetch your current account balance and open positions
   c. Decide whether to enter / exit / hold based on the goal and the real numbers you just got
   d. If you decide to trade, call POST /api/v5/trade/order with proper signing and verify the response
   e. Read back the order status to confirm it was accepted

5. If a tool call fails (network error, signature error, OKX rejection), retry once with a corrected request. If it still fails, abort gracefully and report the error in your summary.

6. Output rules: plain text only (120-280 words). No JSON, no markdown, no code fences. The summary MUST mention concrete numbers from your tool calls (actual price, actual balance, actual order id). If you did not place an order this run, say so explicitly and explain why based on the real data you saw.

Begin now.`;
  const data = await agentTask({ app: "cryptobot", title, prompt });
  const summary = String(data.response || "").trim() || "This run completed, but no valid summary was returned.";
  return {
    summary: summary.slice(0, 1200),
    task_id: Number(data.id || 0)
  };
};

export { requestDecisionTask };
