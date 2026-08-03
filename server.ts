/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import path from "path";
import fs from "fs";
import cron from "node-cron";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  seedDatabaseIfEmpty,
  registerUserProfile,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getSubscriptionItems,
  subscribeToItem,
  distributeReferralBonus,
  getUserSubscriptions,
  getUserTransactions,
  claimDailyReward,
  requestCashout,
  getReferreeStatsList,
  getChatMessages,
  sendChatMessage,
  fetchSystemDashboardStats,
  getUserNotifications,
  processDeposit,
  saveTransaction,
  getTransaction,
  completeSuccessfulDeposit,
  completeSuccessfulWithdrawal,
  completeSuccessfulGpuActivation,
  completeFailedTransaction,
  autoCollectUserYields,
  flushDatabase,
  adminGetAllUsers,
  adminOverridePassword,
  adminGetAllTransactions,
  adminUpdateTransactionStatus,
  adminSaveCatalogItem,
  adminDeleteCatalogItem,
  adminDeleteAllCatalogItems,
  adminCreateGiftCode,
  adminGetGiftCodes,
  adminDeleteGiftCode,
  redeemGiftCode,
  dailyCheckin,
  adminGetCatalogItems,
  claimVipTask,
  adminUpdateUserLockStatus,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminGetAnnouncements,
  adminDeleteAnnouncement,
  adminGetChatConversations,
  getSiteConfig,
  updateSiteConfig
} from "./src/server/db";

// Ensure .env is loaded robustly in production iisnode and custom hosting environments (like SmarterASP)
const envFiles = [".env", "env.txt", "env", ".env.local"];
const searchPaths: string[] = [];

// 1. Process CWD paths
envFiles.forEach(f => searchPaths.push(path.resolve(process.cwd(), f)));

// 2. Relative to __dirname
if (typeof __dirname !== "undefined") {
  envFiles.forEach(f => {
    searchPaths.push(path.resolve(__dirname, f));
    searchPaths.push(path.resolve(__dirname, "..", f));
    searchPaths.push(path.resolve(__dirname, "../..", f));
  });

  // 3. Traversing up parent folders (up to 5 levels)
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    envFiles.forEach(f => {
      const p = path.resolve(currentDir, f);
      if (!searchPaths.includes(p)) {
        searchPaths.push(p);
      }
    });
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
}

let loadedEnv = false;
let appliedEnvPath = "";

for (const p of searchPaths) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      console.log(`[Env Loader] Found and loaded environment variables from: ${p}`);
      appliedEnvPath = p;
      loadedEnv = true;
      break;
    }
  } catch (err) {
    console.warn(`[Env Loader] Error checking path ${p}:`, err);
  }
}

if (!loadedEnv) {
  console.warn(`[Env Loader] WARNING: No environment configuration file found in any searched locations: ${JSON.stringify(searchPaths.slice(0, 10))}...`);
}

const app = express();
const PORT = 3000;
let databaseReady = false;
const processStartedAt = Date.now();
const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL?.replace(/\/$/, "") || "https://zulupay.org";
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 12_000);

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Middleware
app.use(express.json({ limit: "15mb" })); // allow larger payload for base64 chat screenshot uploads!

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "referral-mining-server", uptimeSeconds: Math.floor(process.uptime()) });
});

app.get("/readyz", (_req, res) => {
  if (!databaseReady) return res.status(503).json({ ok: false, ready: false, message: "Database initialization is still in progress." });
  res.json({ ok: true, ready: true });
});

const PHONE_PATTERN = /^\d{9,10}$/;
const MAX_PASSWORD_LENGTH = 128;

function normalizePhone(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "").trim() : "";
}

function errorResponse(error: unknown, fallback: string, defaultStatus = 500) {
  const err = error as any;
  const status = Number.isInteger(err?.statusCode) ? err.statusCode : defaultStatus;
  return {
    status,
    body: { error: err?.message || fallback }
  };
}

const ADMIN_SESSION_COOKIE = "referral_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

function getCookieValue(req: express.Request, name: string): string | null {
  const cookies = String(req.headers.cookie || "").split(";");
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : null;
}

function adminSessionSecret(config: any): string {
  return process.env.ADMIN_SESSION_SECRET || config.adminPass || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "";
}

function signAdminSession(phone: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ phone, exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function validAdminSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Admin API calls are same-origin and use this HttpOnly cookie. This closes the
// previous gap where every admin data/mutation endpoint was publicly callable.
app.use("/api/admin", async (req, res, next) => {
  if (req.path === "/login" || req.path === "/access/activate") return next();
  try {
    const token = getCookieValue(req, ADMIN_SESSION_COOKIE) || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return res.status(401).json({ error: "Admin sign-in is required." });
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const config = await getSiteConfig();
    const secret = adminSessionSecret(config);
    if (!secret || session.phone !== config.adminPhone || Number(session.exp) < Math.floor(Date.now() / 1000) || !validAdminSignature(payload, signature, secret)) {
      return res.status(401).json({ error: "Admin session expired. Please sign in again." });
    }
    next();
  } catch (error) {
    console.error("[Admin Auth] session validation failed:", error);
    res.status(401).json({ error: "Admin sign-in is required." });
  }
});

// Initialize Gemini SDK with telemetry header
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("[Gemini AI] Initialized for help assistant.");
  } else {
    console.warn("GEMINI_API_KEY is not defined in environment variables.");
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI", e);
}

// ================= AUTH ENDPOINTS =================

// Registration
app.post("/api/auth/register", async (req, res) => {
  const { phone, password, confirmPassword, inviteCode } = req.body;
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone || typeof password !== "string") {
    return res.status(400).json({ error: "Phone number and password are required." });
  }

  if (!PHONE_PATTERN.test(normalizedPhone)) {
    return res.status(400).json({ error: "Phone number must contain 9 or 10 digits." });
  }

  if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  if (inviteCode !== undefined && (typeof inviteCode !== "string" || inviteCode.trim().length > 32)) {
    return res.status(400).json({ error: "The referral code is invalid." });
  }

  try {
    const { success, profile } = await registerUserProfile({
      phone: normalizedPhone,
      passwordHash: password, // Store password safely for live demo validation
      referredByCode: inviteCode ? inviteCode.trim() : ""
    });
    res.json({ success, profile });
  } catch (error: any) {
    console.error("Register Error:", error);
    const response = errorResponse(error, "Registration could not be completed.", 400);
    res.status(response.status).json(response.body);
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  const normalizedPhone = normalizePhone(phone);
  
  if (!normalizedPhone || typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "Enter your phone number and password." });
  }

  if (!PHONE_PATTERN.test(normalizedPhone)) {
    return res.status(400).json({ error: "Phone number must contain 9 or 10 digits." });
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: "Password is too long." });
  }

  try {
    const profile = await loginUser(normalizedPhone, password);
    if (!profile) {
      return res.status(401).json({ success: false, error: "Phone number or password is incorrect." });
    }
    res.json({ success: true, profile });
  } catch (error: any) {
    console.error("Login Error:", error);
    const response = errorResponse(error, "We could not sign you in right now. Please try again.", 500);
    res.status(response.status).json(response.body);
  }
});

// Update Profile
app.post("/api/auth/profile", async (req, res) => {
  const { phone, username, operator, customPhone, usdtAddress, newPassword } = req.body;

  if (!phone || !username || !operator || !customPhone) {
    return res.status(400).json({ error: "Missing updated profile parameters." });
  }

  try {
    const profile = await updateUserProfile(
      phone.trim(),
      username.trim(),
      operator,
      customPhone.trim(),
      newPassword,
      usdtAddress
    );
    res.json({ success: true, profile });
  } catch (error: any) {
    console.error("Profile Edit Error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Fetch Profile details
app.get("/api/profile/:phone", async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.phone);
    res.json(profile);
  } catch (error: any) {
    console.error("Profile Fetch Error:", error);
    res.status(404).json({ error: error.message });
  }
});

// ================= ITEMS & SUBSCRIPTIONS ENDPOINTS =================

// Get catalog subscription items
app.get("/api/items", async (req, res) => {
  try {
    const items = await getSubscriptionItems();
    res.json(items);
  } catch (error: any) {
    console.error("Get items error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user active subscriptions nodes
app.get("/api/subscriptions/:phone", async (req, res) => {
  try {
    const list = await getUserSubscriptions(req.params.phone);
    res.json(list);
  } catch (error: any) {
    console.error("Get subs error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Activate / purchase subscription item
app.post("/api/items/subscribe", async (req, res) => {
  const { phone, itemId } = req.body;

  if (!phone || !itemId) {
    return res.status(400).json({ error: "Missing subscription values phone and itemId." });
  }

  try {
    const subNode = await subscribeToItem(phone, itemId);
    
    // Distribute referral rewards immediately on secondary async thread!
    distributeReferralBonus(phone, subNode.itemId)
      .catch((err) => console.error("Referral triggers exception:", err));

    res.json({ success: true, subscription: subNode });
  } catch (error: any) {
    console.error("Subscription purchase error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Claim accumulated mining points
app.post("/api/subscriptions/claim", async (req, res) => {
  const { subId, phone } = req.body;

  if (!subId || !phone) {
    return res.status(400).json({ error: "Missing subId and user phone metadata parameters." });
  }

  try {
    const result = await claimDailyReward(subId, phone);
    res.json(result);
  } catch (error: any) {
    console.error("Claim reward error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Cashout Point conversion
app.post("/api/profile/withdraw", async (req, res) => {
  const { phone, points } = req.body;
  const numPoints = parseInt(points);

  if (!phone || isNaN(numPoints) || numPoints <= 0) {
    return res.status(400).json({ error: "Specify a valid non-zero points amount for withdrawal." });
  }

  try {
    const result = await requestCashout(phone, numPoints);
    res.json(result);
  } catch (error: any) {
    console.error("Cashout request error:", error);
    res.status(400).json({ error: error.message });
  }
});

// VIP Tasks Claiming Endpoint
app.post("/api/profile/vip-tasks/claim", async (req, res) => {
  const { phone, taskId } = req.body;

  if (!phone || !taskId) {
    return res.status(400).json({ error: "Missing required parameters phone and taskId." });
  }

  try {
    const result = await claimVipTask(phone, taskId);
    res.json(result);
  } catch (error: any) {
    console.error("Claim VIP task error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Helper to authenticate with ZuluPay API
async function getZuluPayToken(): Promise<string> {
  const publicKey = process.env.PAYMENT_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error(`ZuluPay environment configuration is missing (PAYMENT_PUBLIC_KEY). Env loaded path: "${appliedEnvPath || "None"}". Checked paths: [${searchPaths.slice(0, 10).join(", ")}]. Loaded env keys: ${Object.keys(process.env).filter(k => k.includes("PAYMENT") || k.includes("PORT") || k.includes("APP")).join(", ")}`);
  }

  const response = await fetchWithTimeout(`${PAYMENT_GATEWAY_URL}/api/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": publicKey
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZuluPay API token auth failure (${response.status}): ${text}`);
  }

  const rawText = await response.text();
  let token = rawText.trim();
  try {
    const json = JSON.parse(rawText);
    token = json.token || json.access_token || json.data?.token || json.data || token;
  } catch (e) {
    // raw string
  }

  if (typeof token === "string" && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  return token;
}

// 1. ZULUPAY DEPOSIT / COLLECTION
app.post("/api/payment/deposit", async (req, res) => {
  const { phone, amount, operator, depositPhone, type, itemId } = req.body;
  const depAmt = parseInt(amount);

  if (!phone || isNaN(depAmt) || depAmt < 500 || !operator || !depositPhone) {
    return res.status(400).json({ error: "Missing parameters. Amount must be at least 500 UGX." });
  }

  try {
    const zKey = process.env.PAYMENT_SECRET_KEY;
    if (!zKey) {
      throw new Error(`ZuluPay configuration secret key is missing (PAYMENT_SECRET_KEY). Env loaded path: "${appliedEnvPath || "None"}". Checked paths: [${searchPaths.slice(0, 10).join(", ")}]. Loaded env keys: ${Object.keys(process.env).filter(k => k.includes("PAYMENT") || k.includes("PORT") || k.includes("APP")).join(", ")}`);
    }

    const token = await getZuluPayToken();
    const trans_id = "ZP-" + type.toUpperCase().slice(0, 3) + "-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const webhookUrl = process.env.PAYMENT_WEBHOOK_URL || `${req.protocol}://${req.get("host")}/api/payment/webhook`;

    const depositRes = await fetchWithTimeout(`${PAYMENT_GATEWAY_URL}/api/deposit`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "secret_key": zKey,
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: depAmt,
        phone: depositPhone,
        trans_id,
        callback_url: webhookUrl,
        webhook_url: webhookUrl
      })
    });

    const bodyText = await depositRes.text();
    let depResult: any = {};
    try {
      depResult = JSON.parse(bodyText);
    } catch (e) {
      console.warn("ZuluPay deposit returned non-JSON:", bodyText);
    }

    if (!depositRes.ok) {
      return res.status(400).json({ 
        error: depResult.message || depResult.error || `Gateway returned error code: ${depositRes.status}` 
      });
    }

    // Save pending transaction record in Firestore
    await saveTransaction(trans_id, phone, depAmt, type, depositPhone, operator, itemId);

    res.json({
      success: true,
      trans_id,
      status: "PENDING",
      zuluResponse: depResult
    });

  } catch (error: any) {
    console.error("Zulupay collection error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 1.5 MANUAL/OFFLINE DEPOSIT SUBMISSION
app.post("/api/manual/deposit", async (req, res) => {
  const { phone, amount, operator, senderPhone, transId, itemId } = req.body;
  const depAmt = parseInt(amount);

  if (!phone || isNaN(depAmt) || depAmt < 500 || !operator || !senderPhone || !transId) {
    return res.status(400).json({ error: "Please fill in all manual deposit fields. Amount must be at least 500 UGX." });
  }

  try {
    const existingTx = await getTransaction(transId);
    if (existingTx) {
      return res.status(400).json({ error: "This transaction reference / ID has already been submitted." });
    }

    // Create a manual transaction record in firestore
    await saveTransaction(transId, phone, depAmt, itemId ? "gpu" : "deposit", senderPhone, operator, itemId, "manual");

    res.json({
      success: true,
      trans_id: transId,
      status: "PENDING",
      message: "Proof of payment submitted successfully! Verification is now pending admin approval."
    });
  } catch (error: any) {
    console.error("Manual deposit submission error:", error);
    res.status(550).json({ error: error.message });
  }
});

// 2. ZULUPAY TRANSACTION STATUS CHECK & PROVISIONING
app.post("/api/payment/status", async (req, res) => {
  const { trans_id } = req.body;

  if (!trans_id) {
    return res.status(400).json({ error: "trans_id parameter is required." });
  }

  try {
    const tx = await getTransaction(trans_id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction record was not found." });
    }

    if (tx.status === "SUCCESSFUL" || tx.status === "FAILED" || tx.mode === "manual") {
      // Create user response
      return res.json({ success: true, status: tx.status, transaction: tx });
    }

    const token = await getZuluPayToken();
    const zKey = process.env.PAYMENT_SECRET_KEY;

    const queryRes = await fetchWithTimeout(`${PAYMENT_GATEWAY_URL}/api/transaction`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "secret_key": zKey || "",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        type: (tx.type === "withdrawal" || tx.type === "withdraw") ? "withdraw" : "deposit",
        trans_id
      })
    });

    const bodyText = await queryRes.text();
    let zuluTx: any = {};
    try {
      zuluTx = JSON.parse(bodyText);
    } catch (e) {
      console.warn("Zulupay query response parsing error:", bodyText);
    }

    const status = zuluTx.status || zuluTx.data?.status || "PENDING";

    if (status === "SUCCESSFUL") {
      if (tx.type === "deposit") {
        const updatedProfile = await completeSuccessfulDeposit(
          tx.userId,
          tx.amount,
          tx.phone,
          tx.operator,
          trans_id
        );
        return res.json({
          success: true,
          status: "SUCCESSFUL",
          profile: updatedProfile
        });
      } else if (tx.type === "withdrawal" || tx.type === "withdraw") {
        const updatedProfile = await completeSuccessfulWithdrawal(trans_id);
        return res.json({
          success: true,
          status: "SUCCESSFUL",
          profile: updatedProfile
        });
      } else {
        const subNode = await completeSuccessfulGpuActivation(
          tx.userId,
          tx.itemId,
          trans_id,
          tx.phone,
          tx.operator,
          tx.amount
        );

        return res.json({
          success: true,
          status: "SUCCESSFUL",
          subscription: subNode
        });
      }
    } else if (status === "FAILED") {
      await completeFailedTransaction(trans_id);
      return res.json({
        success: true,
        status: "FAILED"
      });
    }

    res.json({
      success: true,
      status: "PENDING"
    });

  } catch (error: any) {
    console.error("ZuluPay status check error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. ZULUPAY WITHDRAW / DISBURSEMENT
app.post("/api/payment/withdraw", async (req, res) => {
  const { phone, amount, operator, withdrawPhone } = req.body;
  const withAmt = parseInt(amount);

  if (!phone || isNaN(withAmt) || withAmt < 500 || !operator || !withdrawPhone) {
    return res.status(400).json({ error: "Missing payout parameters. Minimum 500 Shs." });
  }

  try {
    const config = await getSiteConfig();
    const allowAutoWithdraw = config.allowAutoWithdraw !== false;

    if (!allowAutoWithdraw) {
      // Manual/offline withdrawal processing!
      const cashoutResult = await requestCashout(phone, withAmt, undefined, "manual", withdrawPhone, operator);
      return res.json({
        success: true,
        profile: cashoutResult.profile,
        message: "Offline withdrawal requested! Pending manual validation."
      });
    }

    const zKey = process.env.PAYMENT_SECRET_KEY;
    const pin = process.env.PAYMENT_WITHDRAW_PASSWORD || "";
    if (!zKey) {
      throw new Error(`ZuluPay configuration secret key is missing (PAYMENT_SECRET_KEY). Env loaded path: "${appliedEnvPath || "None"}". Checked paths: [${searchPaths.slice(0, 10).join(", ")}]. Loaded env keys: ${Object.keys(process.env).filter(k => k.includes("PAYMENT") || k.includes("PORT") || k.includes("APP")).join(", ")}`);
    }

    const token = await getZuluPayToken();
    const trans_id = "WD-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const webhookUrl = process.env.PAYMENT_WEBHOOK_URL || `${req.protocol}://${req.get("host")}/api/payment/webhook`;

    const withdrawRes = await fetchWithTimeout(`${PAYMENT_GATEWAY_URL}/api/withdraw`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "secret_key": zKey,
        "Authorization": `Bearer ${token}`,
        "password": pin
      },
      body: JSON.stringify({
        amount: withAmt,
        phone: withdrawPhone,
        trans_id,
        reason: "Customer withdraw from mining grid",
        callback_url: webhookUrl,
        webhook_url: webhookUrl
      })
    });

    const bodyText = await withdrawRes.text();
    let withResult: any = {};
    try {
      withResult = JSON.parse(bodyText);
    } catch (e) {
      console.warn("Withdraw returned non-JSON text:", bodyText);
    }

    if (!withdrawRes.ok) {
      return res.status(400).json({
        error: withResult.message || withResult.error || `Payout gateway failed: ${withdrawRes.status}`
      });
    }

    // Process the cashout in db (deducts points, updates history & records notification)
    const cashoutResult = await requestCashout(phone, withAmt, trans_id, undefined, withdrawPhone, operator);

    res.json({
      success: true,
      profile: cashoutResult.profile,
      zuluResponse: withResult
    });

  } catch (error: any) {
    console.error("Zulupay payout error:", error);
    res.status(400).json({ error: error.message });
  }
});

// 4. ZULUPAY WEBHOOK / CALLBACK (Provide this URL to your provider)
app.post("/api/payment/webhook", async (req, res) => {
  try {
    console.log("Received ZuluPay Webhook Callback:", JSON.stringify(req.body, null, 2));

    const payload = req.body || {};
    const trans_id = payload.trans_id || payload.data?.trans_id;
    const rawStatus = payload.status || payload.data?.status;

    if (!trans_id) {
      console.warn("ZuluPay webhook received without transaction ID:", payload);
      return res.status(200).json({ received: true, status: "ignored_missing_trans_id" });
    }

    if (!rawStatus) {
      console.warn("ZuluPay webhook received without status:", payload);
      return res.status(200).json({ received: true, status: "ignored_missing_status" });
    }

    // Normalize incoming status from ZuluPay
    let normalizedStatus = "PENDING";
    const upperStatus = String(rawStatus).toUpperCase();
    if (upperStatus === "SUCCESS" || upperStatus === "SUCCESSFUL" || upperStatus === "COMPLETED") {
      normalizedStatus = "SUCCESSFUL";
    } else if (upperStatus === "FAIL" || upperStatus === "FAILED" || upperStatus === "REJECTED") {
      normalizedStatus = "FAILED";
    }

    console.log(`ZuluPay webhook parsed: trans_id=${trans_id}, status=${normalizedStatus} (original: ${rawStatus})`);

    // Fetch local transaction record
    const tx = await getTransaction(trans_id);
    if (!tx) {
      console.warn(`ZuluPay webhook transaction not found in local DB: ${trans_id}`);
      return res.status(200).json({ received: true, status: "ignored_not_found" });
    }

    // Prevent double processing
    if (tx.status === "SUCCESSFUL" || tx.status === "FAILED") {
      console.log(`ZuluPay webhook transaction already settled: trans_id=${trans_id}, status=${tx.status}`);
      return res.status(200).json({ received: true, status: "already_settled" });
    }

    // Process state change
    if (normalizedStatus === "SUCCESSFUL") {
      if (tx.type === "deposit") {
        await completeSuccessfulDeposit(
          tx.userId,
          tx.amount,
          tx.phone,
          tx.operator,
          trans_id
        );
        console.log(`ZuluPay Webhook successfully processed deposit: ${trans_id}`);
      } else if (tx.type === "withdrawal" || tx.type === "withdraw") {
        await completeSuccessfulWithdrawal(trans_id);
        console.log(`ZuluPay Webhook successfully processed withdrawal: ${trans_id}`);
      } else {
        await completeSuccessfulGpuActivation(
          tx.userId,
          tx.itemId,
          trans_id,
          tx.phone,
          tx.operator,
          tx.amount
        );
        console.log(`ZuluPay Webhook successfully processed GPU activation: ${trans_id}`);
      }
    } else if (normalizedStatus === "FAILED") {
      await completeFailedTransaction(trans_id);
      console.log(`ZuluPay Webhook successfully processed failed transaction: ${trans_id}`);
    } else {
      console.log(`ZuluPay Webhook status still pending: ${trans_id}`);
    }

    res.status(200).json({ received: true, status: "processed", transaction_status: normalizedStatus });
  } catch (error) {
    console.error("ZuluPay Webhook error:", error);
    // Still return 200 OK so the provider knows we received the request and doesn't retry infinitely on crash
    res.status(200).json({ received: true, error: error instanceof Error ? error.message : String(error) });
  }
});

// Kept for backward compatibility
app.post("/api/profile/deposit", async (req, res) => {
  const { phone, amount, operator, depositPhone } = req.body;
  const depAmt = parseInt(amount);

  if (!phone || isNaN(depAmt) || depAmt <= 0 || !operator || !depositPhone) {
    return res.status(400).json({ error: "Please input full merchant phone, operator, and valid non-zero deposit amount." });
  }

  try {
    const updatedProfile = await processDeposit(phone, depAmt, operator, depositPhone);
    res.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error("Direct deposit error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Fetch non-simulated persistent user notification logs
app.get("/api/profile/notifications/:phone", async (req, res) => {
  try {
    const logs = await getUserNotifications(req.params.phone);
    res.json(logs);
  } catch (error: any) {
    console.error("Fetch notifications list exception:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch non-simulated user transactions
app.get("/api/profile/transactions/:phone", async (req, res) => {
  try {
    const list = await getUserTransactions(req.params.phone);
    res.json(list);
  } catch (error: any) {
    console.error("Fetch transactions exception:", error);
    res.status(500).json({ error: error.message });
  }
});

// Referrals summary categorized index
app.get("/api/profile/referrals/:phone", async (req, res) => {
  try {
    const statsList = await getReferreeStatsList(req.params.phone);
    res.json(statsList);
  } catch (error: any) {
    console.error("Get referrals lists error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= MESSAGE ROOM ENDPOINTS =================

// Fetch messages for a specific room
app.get("/api/chat/room/:roomId", async (req, res) => {
  try {
    const list = await getChatMessages(req.params.roomId);
    res.json(list);
  } catch (error: any) {
    console.error("Get chats error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Post a chat message
app.post("/api/chat/send", async (req, res) => {
  const { roomId, sender, senderName, text, image } = req.body;

  if (!roomId || !sender || !senderName || (!text && !image)) {
    return res.status(400).json({ error: "Incomplete chat parameters." });
  }

  try {
    const newMsg = await sendChatMessage({ roomId, sender, senderName, text: text || "", image });

    res.json({ success: true, message: newMsg });
  } catch (error: any) {
    console.error("Send message error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch active admin support conversations
app.get("/api/admin/chat/conversations", async (req, res) => {
  try {
    const data = await adminGetChatConversations();
    res.json(data);
  } catch (error: any) {
    console.error("Get admin conversations error:", error);
    res.status(500).json({ error: error.message });
  }
});

// System global telemetry metrics
app.get("/api/system/stats", async (req, res) => {
  try {
    const data = await fetchSystemDashboardStats();
    res.json(data);
  } catch (error: any) {
    console.error("Get system stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= GEMINI Miner Assistant =================

// In-memory rate limiting map for AI Copilot (phone -> { count, date })
const copilotRateLimit = new Map<string, { count: number, date: string }>();

app.post("/api/copilot/chat", async (req, res) => {
  const { messages, userProfile, activeSubscriptions } = req.body;
  
  // Rate Limiting (5 msgs / day)
  if (userProfile?.phone) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const userLimit = copilotRateLimit.get(userProfile.phone);
    if (userLimit && userLimit.date === today) {
      if (userLimit.count >= 5) {
        return res.status(429).json({ error: "Daily limit of 5 AI messages reached. Please try again tomorrow!" });
      }
      userLimit.count += 1;
    } else {
      copilotRateLimit.set(userProfile.phone, { count: 1, date: today });
    }
  }

  const siteConfig = await getSiteConfig();
  const brand = siteConfig?.brandName || "TW AI Mining";
  const manifestDesc = siteConfig?.manifestDescription || "Uganda High-Yield AI GPU Mining Network";

  let catalogProductsList = "";
  let categoriesList = "";
  let activeCodesList = "";

  try {
    const [catalogItems, giftCodes] = await Promise.all([
      getSubscriptionItems(),
      adminGetGiftCodes()
    ]);

    const customCats: string[] = siteConfig?.categories || [];
    const itemCats = catalogItems.map((i) => i.category).filter(Boolean);
    const allCategories = Array.from(new Set([...customCats, ...itemCats]));
    categoriesList = allCategories.length > 0 ? allCategories.join(", ") : "General";

    catalogProductsList = catalogItems
      .map(
        (i) =>
          `- ${i.name} (Category: ${i.category}): Price UGX ${i.amount.toLocaleString()}, Daily Income UGX ${i.dailyYield.toLocaleString()}, Duration ${i.duration} Days, Total Return UGX ${(i.dailyYield * i.duration).toLocaleString()}`
      )
      .join("\n");

    const validGiftCodes = giftCodes.filter(
      (c) => c.status === "active" && (!c.expiryDate || new Date(c.expiryDate).getTime() > Date.now())
    );
    activeCodesList = validGiftCodes.length > 0
      ? validGiftCodes
          .map((c) => `- Gift Code: "${c.code}" | Reward: UGX ${c.amount.toLocaleString()} | Redemptions Left: ${c.maxRedemptions - c.currentRedemptions}`)
          .join("\n")
      : "No active gift codes currently.";
  } catch (err) {
    console.error("Failed fetching catalog/gift code items for AI prompt:", err);
  }

  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].map(k => k?.trim()).filter(Boolean).filter(k => k && k !== "MY_GEMINI_API_KEY" && k !== "YOUR_GEMINI_API_KEY" && k.length > 10) as string[];

  if (keys.length === 0) {
    return res.status(503).json({ error: "Gemini Copilot Service is offline. No valid API key configured." });
  }

  try {
    const systemInstruction = `You are "${brand} AI", the official Mining Advisor & Assistant of "${brand}".
Description: ${manifestDesc}

Platform Config & Financial Parameters:
- **Site Name**: ${brand}
- **Withdrawal Fee**: ${siteConfig?.withdrawFee || 0}% for all withdrawal requests (MTN, Airtel, USDT TRC20)
- **Level 1 Referral Commission Rate**: ${siteConfig?.level1InviteIncomePct !== undefined ? siteConfig.level1InviteIncomePct : 15}%
- **Level 2 Referral Commission Rate**: ${siteConfig?.level2InviteIncomePct !== undefined ? siteConfig.level2InviteIncomePct : 5}%
- **Registration Bonus**: UGX ${(siteConfig?.registrationBonus || 1000).toLocaleString()} Shs
- **Official WhatsApp Support Link**: ${siteConfig?.whatsappLink || "Not configured"}
- **Official Telegram Group Link**: ${siteConfig?.telegramLink || "Not configured"}

Active Gift Codes / Vouchers:
${activeCodesList}

Available Node Categories:
${categoriesList}

Available Machines Catalog:
${catalogProductsList || "No products currently listed."}

Current User Details:
- Username: ${userProfile?.username || "Guest Miner"}
- Phone: ${userProfile?.phone || "None"}
- Balance: ${userProfile?.points || 0} UGX Shs
- Invites count: ${userProfile?.invitesCount || 0} users referred
- Active sub nodes count: ${activeSubscriptions?.length || 0} active miners

Knowledge & Capabilities:
- **Recharge (Deposit)**: Users can deposit UGX via MTN/Airtel Mobile Money or USDT TRC20 to buy server nodes.
- **Withdrawal**: Cash out balance directly to Mobile Money or USDT. Withdrawal fee is exactly ${siteConfig?.withdrawFee || 0}%.
- **Invite Program**: Users earn ${siteConfig?.level1InviteIncomePct || 15}% on Level 1 and ${siteConfig?.level2InviteIncomePct || 5}% on Level 2 when invited friends activate GPU nodes.
- **VIP Tasks**: Complete referral targets to unlock rewards up to UGX 50,000,000.
- **Support Links**: WhatsApp (${siteConfig?.whatsappLink || "N/A"}) and Telegram (${siteConfig?.telegramLink || "N/A"}).

Instructions:
1. Speak confidently, warmly, and helpfully like a knowledgeable crypto advisor and developer.
2. Provide exact facts when users ask about withdrawal fees (${siteConfig?.withdrawFee || 0}%), invite rates (${siteConfig?.level1InviteIncomePct || 15}% L1, ${siteConfig?.level2InviteIncomePct || 5}% L2), support links, or active gift codes.
3. Keep replies concise, friendly, and structured. Limit responses below 70 words.
4. Format response strictly as simple JSON object:
{
  "text": "Your response in clean markdown layout."
}`;

    const convoText = messages.map((m: any) => `${m.sender === "user" ? "User" : `${brand} AI`}: ${m.text}`).join("\n");

    let responseText = "";
    let lastError: any = null;

    // Standard valid model alias for Google GenAI SDK
    const modelsToTry = ["gemini-2.5-flash"];

    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];
      const rotationAi = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      for (const currentModel of modelsToTry) {
        try {
          console.log(`[Gemini Rotation] Attempting model ${currentModel} with key index ${i}`);
          
          let response;
          try {
            // First attempt with strict JSON schema
            response = await rotationAi.models.generateContent({
              model: currentModel,
              contents: `${convoText}\n${brand} AI:`,
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING }
                  },
                  required: ["text"]
                }
              }
            });
            responseText = response.text ? response.text.trim() : "";
          } catch (schemaErr: any) {
            console.warn(`[Gemini Schema warning] Schema generation failed with ${currentModel}. Falling back to unstructured content.`, schemaErr.message || schemaErr);
            // Fallback to unstructured text generation
            response = await rotationAi.models.generateContent({
              model: currentModel,
              contents: `${convoText}\n${brand} AI:`,
              config: {
                systemInstruction
              }
            });
            
            const rawText = response.text ? response.text.trim() : "";
            responseText = JSON.stringify({ text: rawText });
          }

          if (responseText) {
            lastError = null;
            break; // Success! Break the model loop
          }
        } catch (err: any) {
          console.warn(`[Gemini Model warning] Model ${currentModel} failed with key index ${i}.`, err.message || err);
          lastError = err;
        }
      }

      if (!lastError && responseText) {
        break; // Success! Break the key loop
      }
    }

    if (lastError || !responseText) {
      throw lastError || new Error("Failed to get any valid response from Gemini rotation pool.");
    }

    // Strip any markdown codeblock wrappers if present
    let cleanedTextStr = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let result: { text: string };
    try {
      result = JSON.parse(cleanedTextStr);
    } catch (parseErr) {
      console.error("[Gemini parse error] could not parse response text directly:", cleanedTextStr);
      result = { text: cleanedTextStr };
    }

    // Double check if result.text contains stringified JSON or markdown codeblocks
    if (typeof result.text === "string") {
      let t = result.text.trim();
      if (t.startsWith("```json") || t.startsWith("{")) {
        const innerClean = t.replace(/```json/gi, "").replace(/```/g, "").trim();
        try {
          const parsedInner = JSON.parse(innerClean);
          if (parsedInner.text && typeof parsedInner.text === "string") {
            t = parsedInner.text;
          }
        } catch (_) {}
      }
      result.text = t;
    }

    res.json(result);
  } catch (err: any) {
    console.error("Gemini Copilot Error:", err);
    res.status(503).json({ error: "The Gemini AI Copilot service is undergoing system calibration. Please ensure a valid GEMINI_API_KEY is saved in settings.", details: err.message });
  }
});

// Admin endpoint to wipe and flush the database to start completely fresh
app.post("/api/admin/flush-db-now", async (req, res) => {
  try {
    console.log("[Admin API] Received request to flush and restart database collections...");
    const result = await flushDatabase();
    res.json({
      success: true,
      message: `Database successfully flushed! Deleted ${result.deletedCount} total routing document nodes, and re-placed fresh item catalog definitions.`,
      ...result
    });
  } catch (err: any) {
    console.error("[Admin API Failure] DB flush failed:", err);
    res.status(500).json({ error: "Failed to flush database", details: err.message });
  }
});

// Admin API: List all user profiles
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await adminGetAllUsers();
    res.json(users);
  } catch (err: any) {
    console.error("[Admin API Error] Fetch all users failed:", err);
    res.status(500).json({ error: "Failed to load users list", details: err.message });
  }
});

// Admin API: Override a user's password override
app.post("/api/admin/users/override-password", async (req, res) => {
  const { phone, newPassword } = req.body;
  if (!phone || !newPassword) {
    return res.status(400).json({ error: "Missing required parameters: phone, newPassword" });
  }
  try {
    await adminOverridePassword(phone, newPassword);
    res.json({ success: true, message: `Password for user ${phone} successfully updated.` });
  } catch (err: any) {
    console.error("[Admin API Error] Override password failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin API: List all transaction logs
app.get("/api/admin/transactions", async (req, res) => {
  try {
    const transactions = await adminGetAllTransactions();
    res.json(transactions);
  } catch (err: any) {
    console.error("[Admin API Error] Fetch all transactions failed:", err);
    res.status(500).json({ error: "Failed to load transaction history", details: err.message });
  }
});

// Admin API: Manually approve / reject or complete pending transaction state
app.post("/api/admin/transactions/update-status", async (req, res) => {
  const { transId, status } = req.body;
  if (!transId || !status) {
    return res.status(400).json({ error: "Missing required values: transId and target status" });
  }
  try {
    await adminUpdateTransactionStatus(transId, status);
    res.json({ success: true, message: `Transaction ${transId} successfully updated to status: ${status}.` });
  } catch (err: any) {
    console.error("[Admin API Error] Transaction update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin API: Create or update catalog node subscription item config specifications
app.post("/api/admin/catalog/save", async (req, res) => {
  const item = req.body;
  if (!item || !item.id || !item.name || item.amount == null || item.duration == null || item.dailyYield == null || !item.category) {
    return res.status(400).json({ error: "Missing required fields to update catalog item parameters." });
  }
  try {
    const numAmount = parseInt(item.amount);
    const numDuration = parseInt(item.duration);
    const numYield = parseInt(item.dailyYield);
    const numBonus = parseInt(item.inviteBonusPercent || "10");

    await adminSaveCatalogItem({
      ...item,
      amount: isNaN(numAmount) ? 0 : numAmount,
      duration: isNaN(numDuration) ? 0 : numDuration,
      dailyYield: isNaN(numYield) ? 0 : numYield,
      inviteBonusPercent: isNaN(numBonus) ? 10 : numBonus
    });
    res.json({ success: true, message: `Catalog item ${item.name} configured successfully.` });
  } catch (err: any) {
    console.error("[Admin API Error] Store catalog config failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin API: Delete catalog node
app.post("/api/admin/catalog/delete", async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: "Missing required value: itemId" });
  }
  try {
    await adminDeleteCatalogItem(itemId);
    res.json({ success: true, message: `Catalog node ${itemId} has been purged successfully.` });
  } catch (err: any) {
    console.error("[Admin API Error] Delete catalog item failed:", err);
    res.status(550).json({ error: err.message });
  }
});

// Admin API: Delete ALL catalog nodes
app.post("/api/admin/catalog/delete-all", async (req, res) => {
  try {
    const { count } = await adminDeleteAllCatalogItems();
    res.json({ success: true, message: `Successfully deleted all ${count} catalog nodes.` });
  } catch (err: any) {
    console.error("[Admin API Error] Delete all catalog items failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin API: List all catalog nodes with active subscriber counts
app.get("/api/admin/catalog/nodes", async (req, res) => {
  try {
    const items = await adminGetCatalogItems();
    res.json(items);
  } catch (err: any) {
    console.error("[Admin API Error] Fetch all catalog nodes failed:", err);
    res.status(500).json({ error: "Failed to load catalog nodes list" });
  }
});

// Admin API: Lock / Unlock a user
app.post("/api/admin/users/lock", async (req, res) => {
  const { phone, locked } = req.body;
  if (!phone || typeof locked !== "boolean") {
    return res.status(400).json({ error: "Missing required parameters: phone, locked" });
  }
  try {
    await adminUpdateUserLockStatus(phone, locked);
    res.json({ success: true, message: `Account for ${phone} is now ${locked ? "locked" : "unlocked"}.` });
  } catch(err: any) {
    console.error("[Admin API Error] Lock user failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/announcements", async (req, res) => {
  try {
    const announcements = await adminGetAnnouncements();
    res.json(announcements);
  } catch (err: any) {
    console.error("[Admin API Error] Fetch announcements failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/announcements", async (req, res) => {
  const { title, message, readMoreLink, category, imageUrl, tag } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    await adminCreateAnnouncement(title, message, readMoreLink, category || "announcement", imageUrl, tag);
    res.json({ success: true, message: "Announcement published." });
  } catch (err: any) {
    console.error("[Admin API Error] Create announcement failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/announcements/:id", async (req, res) => {
  const { title, message, readMoreLink, category, imageUrl, tag } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    await adminUpdateAnnouncement(req.params.id, title, message, readMoreLink, category, imageUrl, tag);
    res.json({ success: true, message: "Announcement updated." });
  } catch (err: any) {
    console.error("[Admin API Error] Update announcement failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/announcements/:id", async (req, res) => {
  try {
    await adminDeleteAnnouncement(req.params.id);
    res.json({ success: true, message: "Announcement deleted." });
  } catch (err: any) {
    console.error("[Admin API Error] Delete announcement failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Site Config APIs
app.get("/api/manifest/icon", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const config = await getSiteConfig();
    let logo = config.logoUrl || "";
    
    // If it's a raw SVG string
    if (logo.trim().toLowerCase().startsWith("<svg")) {
      if (!logo.includes('xmlns="http://www.w3.org/2000/svg"')) {
        logo = logo.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(logo);
    } 
    
    // If it's a URL, we should redirect to it, or if it's empty, redirect to default png
    if (!logo) {
      const requestedSize = String(req.query.size) === "192" ? "192" : "512";
      return res.redirect(`/icon-${requestedSize}.png`);
    }

    return res.redirect(logo);
  } catch (err: any) {
    res.redirect("/icon-512.png");
  }
});

app.get("/api/manifest.json", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const config = await getSiteConfig();
    const manifest = {
      id: "/",
      name: config.brandName || "Canan AI",
      short_name: config.manifestShortName || config.brandName || "Canan AI",
      description: config.manifestDescription || "Uganda High-Yield AI GPU Mining Network",
      start_url: "/",
      display: "standalone",
      display_override: ["window-controls-overlay", "standalone"],
      background_color: config.manifestBgColor || "#020617",
      theme_color: config.manifestThemeColor || "#020617",
      lang: "en",
      scope: "/",
      orientation: "portrait",
      icons: [
        {
          src: "/api/manifest/icon?size=192",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/api/manifest/icon?size=512",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        }
      ],
      screenshots: [
        {
          src: "/api/manifest/icon?size=512&type=wide",
          sizes: "512x512",
          type: "image/png",
          form_factor: "wide",
          label: "Desktop App View"
        },
        {
          src: "/api/manifest/icon?size=512&type=narrow",
          sizes: "512x512",
          type: "image/png",
          form_factor: "narrow",
          label: "Mobile App View"
        }
      ]
    };
    res.json(manifest);
  } catch (err: any) {
    // A temporary database issue should not make the app permanently
    // uninstallable. Return a valid fallback manifest while logging the cause.
    console.error("[PWA] Manifest configuration lookup failed:", err);
    res.json({
      id: "/",
      name: "Canan AI",
      short_name: "Canan AI",
      description: "Uganda High-Yield AI GPU Mining Network",
      start_url: "/",
      display: "standalone",
      background_color: "#020617",
      theme_color: "#020617",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
      ]
    });
  }
});

app.get("/api/config/site", async (req, res) => {
  try {
    const config = await getSiteConfig();
    // NEVER send admin password to frontend
    res.json({
      adminPhone: config.adminPhone,
      whatsappLink: config.whatsappLink,
      telegramLink: config.telegramLink,
      brandName: config.brandName,
      logoUrl: config.logoUrl,
      logoType: config.logoType,
      logoSvg: config.logoSvg,
      withdrawFee: config.withdrawFee !== undefined ? config.withdrawFee : 0,
      allowAutoDeposit: config.allowAutoDeposit !== undefined ? config.allowAutoDeposit : true,
      allowManualDeposit: config.allowManualDeposit !== undefined ? config.allowManualDeposit : false,
      mtnReceiverPhone: config.mtnReceiverPhone || "",
      mtnReceiverName: config.mtnReceiverName || "",
      airtelReceiverPhone: config.airtelReceiverPhone || "",
      airtelReceiverName: config.airtelReceiverName || "",
      usdtAddress: config.usdtAddress || "",
      usdtNetwork: config.usdtNetwork || "TRC20",
      usdtLogoUrl: config.usdtLogoUrl || "",
      usdtQrUrl: config.usdtQrUrl || "",
      usdtRate: config.usdtRate || 3700,
      mtnLogoUrl: config.mtnLogoUrl || "",
      airtelLogoUrl: config.airtelLogoUrl || "",
      allowAutoWithdraw: config.allowAutoWithdraw !== undefined ? config.allowAutoWithdraw : true,
      allowManualWithdraw: config.allowManualWithdraw !== undefined ? config.allowManualWithdraw : false,
      level1InviteIncomePct: config.level1InviteIncomePct !== undefined ? config.level1InviteIncomePct : 15,
      level2InviteIncomePct: config.level2InviteIncomePct !== undefined ? config.level2InviteIncomePct : 5,
      registrationBonus: config.registrationBonus !== undefined ? config.registrationBonus : 1000,
      inviteBonus: config.inviteBonus !== undefined ? config.inviteBonus : 3000,
      checkinBaseBonus: config.checkinBaseBonus !== undefined ? config.checkinBaseBonus : 100,
      checkinIncrement: config.checkinIncrement !== undefined ? config.checkinIncrement : 50,
      themePreset: config.themePreset || "duolingo-playful",
      themeMode: config.themeMode || "light",
      authBgImage: config.authBgImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
      dashboardBgImage: config.dashboardBgImage || "",
      cardStyle: config.cardStyle || "playful-3d",
      borderRadius: config.borderRadius || "rounded-2xl",
      primaryColor: config.primaryColor || "#58cc02",
      accentColor: config.accentColor || "#ff4b4b"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/access/activate", async (req, res) => {
  try {
    const config = await getSiteConfig();
    
    // Check if already seeded or activated
    if (config.hasBeenActivatedSeeded === true) {
      return res.status(400).json({ error: "Administration access has already been activated. Seeding is disabled for safety." });
    }
    
    // Retrieve credentials from environment variables without hardcoded fallbacks
    const adminPhone = (process.env.ADMIN_PHONE || "").trim().replace(/,$/, "").trim();
    const adminPass = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "").trim().replace(/,$/, "").trim();
    const adminUsername = (process.env.ADMIN_USERNAME || "admin").trim().replace(/,$/, "").trim();

    if (!adminPhone || !adminPass) {
      return res.status(400).json({ error: "ADMIN_PHONE and ADMIN_PASSWORD environment variables are required to activate access." });
    }
    
    const updatedConfig = {
      ...config,
      adminPhone,
      adminPass,
      adminUsername,
      hasBeenActivatedSeeded: true
    };
    
    await updateSiteConfig(updatedConfig);

    // Create the admin user in standard users collection with 0 points (no funds)
    await registerUserProfile({
      phone: adminPhone,
      username: adminUsername,
      password: adminPass,
      inviteCode: "ADMIN-INV",
      referredByCode: "",
      operator: "MTN",
      points: 0, // No funds
      grantRegistrationBonus: false,
      withdrawnCash: 0,
      totalDeposits: 0,
      aiIncome: 0,
      createdAt: new Date().toISOString(),
      invitesCount: 0,
      referralRewardsEarned: 0
    });
    
    res.json({ 
      success: true, 
      message: "Admin credentials successfully seeded from secure environment configuration. Access activated.",
      phone: adminPhone,
      username: adminUsername
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const password = req.body?.password;
    if (!phone || typeof password !== "string") {
      return res.status(400).json({ error: "Enter the admin phone number and password." });
    }
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ error: "Admin phone number must contain 9 or 10 digits." });
    }
    if (!password || password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ error: "Enter a valid admin password." });
    }
    const config = await getSiteConfig();
    if (phone === config.adminPhone && password === config.adminPass) {
      // Keep the administrator usable on the normal user login screen too.
      // Older releases could mark activation complete while the users row was
      // never written, so repair that inconsistency on a valid admin login.
      const adminUser = await getUserProfile(phone);
      if (!adminUser) {
        await registerUserProfile({
          phone,
          username: config.adminUsername || "admin",
          password,
          points: 0,
          grantRegistrationBonus: false,
          referredByCode: "",
          operator: "MTN"
        });
      } else if (adminUser.password !== password) {
        await updateUserProfile(phone, { password });
      }
      const secret = adminSessionSecret(config);
      if (!secret) return res.status(503).json({ error: "Admin session security is not configured on the server." });
      res.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(signAdminSession(phone, secret))}; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=${ADMIN_SESSION_TTL_SECONDS}`);
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Admin phone number or password is incorrect." });
    }
  } catch (err: any) {
    console.error("[Admin Auth] login failed:", err);
    const response = errorResponse(err, "Admin sign-in is temporarily unavailable.", 500);
    res.status(response.status).json(response.body);
  }
});

app.post("/api/admin/logout", (_req, res) => {
  res.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=0`);
  res.json({ success: true });
});

app.get("/api/admin/config", async (req, res) => {
  try {
    const config = await getSiteConfig();
    // Allow sending full config to admin (in a real app, require auth token)
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/config", async (req, res) => {
  try {
    await updateSiteConfig(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/redeem_gift_code", async (req, res) => {
  try {
    const { phone, code } = req.body;
    const result = await redeemGiftCode(phone, code);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/user/checkin", async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await dailyCheckin(phone);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Admin config endpoint
app.post("/api/admin/gift_codes", async (req, res) => {
  try {
    const { phone, password, code, amount, maxRedemptions, expiryDate } = req.body;
    
    const result = await adminCreateGiftCode(code, amount, maxRedemptions, expiryDate);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/admin/gift_codes", async (req, res) => {
  try {
    const { phone, password } = req.query;
    
    const result = await adminGetGiftCodes();
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/admin/gift_codes/:id", async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    await adminDeleteGiftCode(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Return JSON for malformed/oversized requests instead of Express' default
// HTML stack trace. This is especially important for mobile login and upload
// clients, which otherwise surface an opaque network error.
app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large. Please reduce the upload size and try again." });
  }
  if (error instanceof SyntaxError && (error as any)?.status === 400) {
    return res.status(400).json({ error: "The request body is not valid JSON." });
  }
  next(error);
});

// Vite middleware setup (see next step)

async function startServer() {
  const startupStartedAt = Date.now();
  console.log(`[Startup] Starting server (node=${process.version}, env=${process.env.NODE_ENV || "development"})`);
  console.log(`[Startup] Database configuration: ${process.env.DATABASE_URL || process.env.MYSQL_URL ? "provided" : "missing"}`);
  try {
    // Verify the connection and create any missing application tables.
    await seedDatabaseIfEmpty();
    databaseReady = true;
    console.log(`[Startup] Database ready in ${Date.now() - startupStartedAt}ms.`);
  } catch (seedErr) {
    databaseReady = false;
    console.error("[Startup] Database initialization failed. Server will not accept application traffic.", seedErr);
    process.exitCode = 1;
    return;
  }

  // Background mock cron job: automatically collects and credits yields for ALL users every night at midnight Kampala time
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("[Auto-Collect Cron] Scanning ledger to auto-credit daily mining yields for all users...");
      
      const usersList = await adminGetAllUsers();
      let totalProcessed = 0;
      let cursor = 0;
      const workerCount = Math.max(1, Math.min(Number(process.env.AUTO_COLLECT_CONCURRENCY || 8), 32));
      const workers = Array.from({ length: workerCount }, async () => {
        while (cursor < usersList.length) {
          const u = usersList[cursor++];
          if (!u?.phone) continue;
          try {
            await autoCollectUserYields(u.phone);
            totalProcessed++;
          } catch (err) {
            console.error(`[Auto-Collect Cron] Failed for user ${u.phone}:`, err);
          }
        }
      });
      await Promise.all(workers);
      
      console.log(`[Auto-Collect Cron] Finished scan successfully. Processed ${totalProcessed} users.`);
    } catch (err) {
      console.error("[Auto-Collect Cron Failure] error running scan:", err);
    }
  }, {
    timezone: "Africa/Nairobi"
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is located inside dist/
    // So __dirname will be the dist/ folder.
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  
  const listenPort = isNaN(Number(PORT)) ? PORT : Number(PORT);
  if (typeof listenPort === "number") {
    app.listen(listenPort, "0.0.0.0", () => {
      console.log(`[Referral Mining Server] running on http://localhost:${listenPort}`);
      console.log(`[Startup] Ready in ${Date.now() - processStartedAt}ms; health=/healthz readiness=/readyz`);
    });
  } else {
    app.listen(listenPort, () => {
      console.log(`[Referral Mining Server] running on IISNode named pipe: ${listenPort}`);
      console.log(`[Startup] Ready in ${Date.now() - processStartedAt}ms; health=/healthz readiness=/readyz`);
    });
  }
}

startServer();
