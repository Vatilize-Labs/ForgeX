import { AI_BACKEND_URL } from "./constants";

interface AIResponse {
  success: boolean;
  data: string;
  error?: string;
}

async function aiRequest(endpoint: string, body: Record<string, unknown>): Promise<AIResponse> {
  const res = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AI request failed: ${res.statusText}`);
  }
  return res.json();
}

export async function getStrategyAdvice(userAddress: string, riskPreference = "balanced"): Promise<string> {
  const res = await aiRequest("/api/strategy", { user_address: userAddress, risk_preference: riskPreference });
  if (!res.success) throw new Error(res.error || "Strategy request failed");
  return res.data;
}

export async function getRiskAssessment(userAddress: string): Promise<string> {
  const res = await aiRequest("/api/risk", { user_address: userAddress });
  if (!res.success) throw new Error(res.error || "Risk assessment failed");
  return res.data;
}

export async function chatWithAI(
  message: string,
  userAddress?: string,
  history?: { role: string; content: string }[]
): Promise<string> {
  const res = await aiRequest("/api/chat", {
    message,
    user_address: userAddress || null,
    history: history || null,
  });
  if (!res.success) throw new Error(res.error || "Chat request failed");
  return res.data;
}

export async function getDashboardInsights(userAddress: string): Promise<string> {
  const res = await aiRequest("/api/insights", { user_address: userAddress });
  if (!res.success) throw new Error(res.error || "Insights request failed");
  return res.data;
}

// ── Autonomous Agent API ──

interface AgentActionResponse {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
}

export interface AgentDecision {
  timestamp: string;
  decision: string;
  reasoning: string;
  confidence: number;
  urgency: string;
  risk_assessment: string;
  market_observation: string;
  actions_planned: number;
  execution_results: Record<string, unknown>[];
}

export interface AgentStatus {
  running: boolean;
  mode: string;
  simulate: boolean;
  risk_profile: string;
  monitored_vaults: string[];
  user_address: string | null;
  interval_seconds: number;
  last_check: string | null;
  cycle_count: number;
  recent_decisions: AgentDecision[];
}

export async function startAgent(
  userAddress: string,
  vaultAddresses: string[],
  riskProfile = "balanced",
  interval = 60,
  simulate = true
): Promise<AgentActionResponse> {
  const res = await fetch(`${AI_BACKEND_URL}/api/agent/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_address: userAddress,
      vault_addresses: vaultAddresses,
      risk_profile: riskProfile,
      interval,
      simulate,
    }),
  });
  return res.json();
}

export async function stopAgent(): Promise<AgentActionResponse> {
  const res = await fetch(`${AI_BACKEND_URL}/api/agent/stop`, { method: "POST" });
  return res.json();
}

export async function getAgentStatus(): Promise<AgentStatus> {
  const res = await fetch(`${AI_BACKEND_URL}/api/agent/status`);
  const data = await res.json();
  if (!data.success) throw new Error("Failed to get agent status");
  return data.data as AgentStatus;
}

export async function getAgentDecisions(limit = 20): Promise<AgentDecision[]> {
  const res = await fetch(`${AI_BACKEND_URL}/api/agent/decisions?limit=${limit}`);
  const data = await res.json();
  if (!data.success) throw new Error("Failed to get agent decisions");
  return data.data as AgentDecision[];
}

export async function triggerAgentCycle(): Promise<AgentActionResponse> {
  const res = await fetch(`${AI_BACKEND_URL}/api/agent/cycle`, { method: "POST" });
  return res.json();
}
