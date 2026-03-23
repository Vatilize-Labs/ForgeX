/**
 * ForgeX Agent WDK Sidecar
 *
 * Express server exposing the agent wallet operations as REST endpoints.
 * The Python AI backend calls these to execute on-chain transactions
 * when the autonomous agent decides to act.
 */

import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { AgentWallet } from "./wallet.js";

const app = express();
app.use(cors());
app.use(express.json());

const wallet = new AgentWallet();

// ── Health & Status ──

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "forgex-agent-wdk", chain: "Base Mainnet" });
});

app.get("/wallet/status", async (req, res) => {
  try {
    const status = await wallet.getStatus();
    res.json({ success: true, data: status });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Read Operations ──

app.get("/vault/:address", async (req, res) => {
  try {
    const data = await wallet.readVault(req.params.address);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/vaults/:userAddress", async (req, res) => {
  try {
    const vaults = await wallet.getUserVaults(req.params.userAddress);
    const vaultData = await Promise.all(
      vaults.map((v) => wallet.readVault(v))
    );
    res.json({ success: true, data: vaultData });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/balance/:token", async (req, res) => {
  try {
    const tokenAddress = config.tokens[req.params.token.toUpperCase()];
    if (!tokenAddress) {
      return res.status(400).json({ success: false, error: `Unknown token: ${req.params.token}` });
    }
    const balance = await wallet.getTokenBalance(tokenAddress);
    res.json({ success: true, data: { token: req.params.token, balance } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Write Operations (Agent Executions) ──

app.post("/execute/deposit", async (req, res) => {
  try {
    const { vault_address, amount } = req.body;
    if (!vault_address || !amount) {
      return res.status(400).json({ success: false, error: "vault_address and amount required" });
    }
    const result = await wallet.depositToVault(vault_address, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/execute/withdraw", async (req, res) => {
  try {
    const { vault_address, amount } = req.body;
    if (!vault_address || !amount) {
      return res.status(400).json({ success: false, error: "vault_address and amount required" });
    }
    const result = await wallet.withdrawFromVault(vault_address, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/execute/deploy-aave", async (req, res) => {
  try {
    const { vault_address, amount } = req.body;
    if (!vault_address || !amount) {
      return res.status(400).json({ success: false, error: "vault_address and amount required" });
    }
    const result = await wallet.deployToAave(vault_address, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/execute/deploy-compound", async (req, res) => {
  try {
    const { vault_address, amount } = req.body;
    if (!vault_address || !amount) {
      return res.status(400).json({ success: false, error: "vault_address and amount required" });
    }
    const result = await wallet.deployToCompound(vault_address, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/execute/withdraw-aave", async (req, res) => {
  try {
    const { vault_address, amount } = req.body;
    if (!vault_address || !amount) {
      return res.status(400).json({ success: false, error: "vault_address and amount required" });
    }
    const result = await wallet.withdrawFromAave(vault_address, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/execute/withdraw-compound", async (req, res) => {
  try {
    const { vault_address, amount } = req.body;
    if (!vault_address || !amount) {
      return res.status(400).json({ success: false, error: "vault_address and amount required" });
    }
    const result = await wallet.withdrawFromCompound(vault_address, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/execute/rebalance", async (req, res) => {
  try {
    const { vault_address, from_protocol, to_protocol, amount } = req.body;
    if (!vault_address || !from_protocol || !to_protocol || !amount) {
      return res.status(400).json({
        success: false,
        error: "vault_address, from_protocol, to_protocol, and amount required",
      });
    }
    const result = await wallet.rebalance(vault_address, from_protocol, to_protocol, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Start server ──

app.listen(config.port, () => {
  console.log(`[ForgeX Agent WDK] Running on port ${config.port}`);
  console.log(`[ForgeX Agent WDK] Chain: Base Mainnet (${config.chainId})`);
  console.log(`[ForgeX Agent WDK] Agent address: ${wallet.getAddress() || "READ-ONLY"}`);
});
