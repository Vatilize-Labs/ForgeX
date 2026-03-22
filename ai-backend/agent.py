"""
ForgeX Autonomous DeFi Agent

An AI agent that monitors on-chain state, reasons about opportunity and risk,
and autonomously decides WHEN and WHY to act — not just how.

Architecture:
  Monitor → Reason (Claude) → Decide → Execute (via WDK sidecar)

The agent uses USDT as its base settlement asset and interacts with
ForgeX vaults, Aave V3, and Compound V2 on Base Mainnet.
"""

import time
import json
import threading
from datetime import datetime, timezone

import httpx
import anthropic

from config import ANTHROPIC_API_KEY, WDK_SIDECAR_URL, TOKENS
from chain import fetch_vault_data, fetch_user_vaults

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
MODEL = "claude-sonnet-4-20250514"

# ── Agent State ──

agent_state = {
    "running": False,
    "mode": "monitor",  # monitor | paused
    "risk_profile": "balanced",  # conservative | balanced | aggressive
    "monitored_vaults": [],  # vault addresses the agent watches
    "user_address": None,
    "interval_seconds": 60,
    "decision_log": [],  # list of {timestamp, decision, reasoning, action, result}
    "last_check": None,
    "cycle_count": 0,
}

# Keep last 50 decisions
MAX_LOG_SIZE = 50

AGENT_SYSTEM_PROMPT = """You are the ForgeX Autonomous DeFi Agent. You manage yield vaults on Base Mainnet using USDT as the base settlement asset.

Your role is to DECIDE when and why to take action — not just follow instructions. You reason about:
1. Yield rates across protocols (Aave V3, Compound V2)
2. Allocation efficiency (is capital sitting idle when it could earn?)
3. Risk factors (concentration, protocol health, vault pause state)
4. Rebalancing opportunities (rate differentials between protocols)

IMPORTANT RULES:
- USDT is the primary settlement asset. Always consider positions relative to USDT value.
- Only recommend actions with clear reasoning (the "why").
- Be conservative with amounts — never suggest moving more than 30% of total assets in one action.
- If conditions are stable and yields are acceptable, recommend NO ACTION — that is a valid decision.
- Always output valid JSON.

Output format (strict JSON):
{
  "decision": "rebalance" | "deposit" | "withdraw" | "deploy_aave" | "deploy_compound" | "withdraw_aave" | "withdraw_compound" | "no_action",
  "reasoning": "1-3 sentence explanation of WHY this action is needed NOW",
  "confidence": 0.0 to 1.0,
  "urgency": "low" | "medium" | "high",
  "actions": [
    {
      "type": "rebalance" | "deploy_aave" | "deploy_compound" | "withdraw_aave" | "withdraw_compound" | "deposit" | "withdraw",
      "vault_address": "0x...",
      "amount": "amount_as_string",
      "from_protocol": "aave" | "compound" | null,
      "to_protocol": "aave" | "compound" | null
    }
  ],
  "risk_assessment": "brief risk note for this action",
  "market_observation": "what the agent notices about current state"
}

If decision is "no_action", actions should be an empty array.
"""


def _format_vault_state(vaults_data: list[dict]) -> str:
    """Format vault data into context for the AI decision engine."""
    if not vaults_data:
        return "No vaults are currently being monitored."

    lines = [f"Timestamp: {datetime.now(timezone.utc).isoformat()}", ""]

    for i, v in enumerate(vaults_data, 1):
        total = v.get("total_assets")
        aave = v.get("aave_balance")
        compound = v.get("compound_balance")
        usd = v.get("total_value_usd")

        # Use asset's actual decimals (e.g. 6 for USDT/USDC, 18 for WETH/DAI)
        asset_decimals = v.get("asset_decimals", 18)
        asset_divisor = 10 ** asset_decimals

        def fmt(val):
            if val is None:
                return "N/A"
            return f"{val / asset_divisor:.6f}"

        # USD values from the contract are always 18 decimals
        def fmt_usd(val):
            if val is None:
                return "N/A"
            return f"${val / 1e18:,.2f}"

        idle = 0
        if total is not None:
            idle = total - (aave or 0) - (compound or 0)

        total_deployed = (aave or 0) + (compound or 0)
        utilization = (total_deployed / total * 100) if total and total > 0 else 0
        aave_pct = (aave / total * 100) if total and total > 0 and aave else 0
        compound_pct = (compound / total * 100) if total and total > 0 and compound else 0

        asset_addr = v.get('asset')
        if not asset_addr or asset_addr == "0x0000000000000000000000000000000000000000":
            continue  # Skip vaults with no asset configured

        lines.append(f"=== Vault #{i}: {v['address']} ===")
        lines.append(f"  Asset: {asset_addr}")
        lines.append(f"  Total Assets: {fmt(total)}")
        lines.append(f"  Aave Deployed: {fmt(aave)} ({aave_pct:.1f}%)")
        lines.append(f"  Compound Deployed: {fmt(compound)} ({compound_pct:.1f}%)")
        lines.append(f"  Idle (earning nothing): {fmt(idle if idle >= 0 else 0)}")
        lines.append(f"  Capital Utilization: {utilization:.1f}%")
        lines.append(f"  Total Value USD: {fmt_usd(usd)}")
        lines.append(f"  Paused: {v.get('is_paused', False)}")
        lines.append("")

    return "\n".join(lines)


def _get_agent_decision(vaults_data: list[dict], risk_profile: str) -> dict:
    """Ask Claude to analyze vault state and make an autonomous decision."""
    context = _format_vault_state(vaults_data)

    user_msg = (
        f"Current vault state:\n\n{context}\n\n"
        f"Agent risk profile: {risk_profile}\n"
        f"Base settlement asset: USDT ({TOKENS.get('USDT', 'N/A')})\n\n"
        "Analyze the current state and decide: should the agent take any action right now? "
        "Remember — doing nothing is a perfectly valid choice if conditions are stable. "
        "Only act when there is a clear opportunity or risk to address. "
        "Respond with the JSON decision object ONLY."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=AGENT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    text = response.content[0].text.strip()

    # Parse JSON from response (handle potential markdown wrapping)
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(text)


def _execute_action(action: dict) -> dict:
    """Execute a single action via the WDK sidecar."""
    action_type = action.get("type")
    vault = action.get("vault_address")
    amount = action.get("amount")

    endpoint_map = {
        "deposit": "/execute/deposit",
        "withdraw": "/execute/withdraw",
        "deploy_aave": "/execute/deploy-aave",
        "deploy_compound": "/execute/deploy-compound",
        "withdraw_aave": "/execute/deploy-aave",  # uses same withdraw endpoint pattern
        "withdraw_compound": "/execute/deploy-compound",
        "rebalance": "/execute/rebalance",
    }

    endpoint = endpoint_map.get(action_type)
    if not endpoint:
        return {"success": False, "error": f"Unknown action type: {action_type}"}

    payload = {"vault_address": vault, "amount": amount}

    if action_type == "rebalance":
        payload["from_protocol"] = action.get("from_protocol")
        payload["to_protocol"] = action.get("to_protocol")

    try:
        resp = httpx.post(f"{WDK_SIDECAR_URL}{endpoint}", json=payload, timeout=60.0)
        return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def _log_decision(decision: dict, results: list[dict] | None = None):
    """Log an agent decision to the decision log."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "decision": decision.get("decision", "unknown"),
        "reasoning": decision.get("reasoning", ""),
        "confidence": decision.get("confidence", 0),
        "urgency": decision.get("urgency", "low"),
        "risk_assessment": decision.get("risk_assessment", ""),
        "market_observation": decision.get("market_observation", ""),
        "actions_planned": len(decision.get("actions", [])),
        "execution_results": results or [],
    }

    agent_state["decision_log"].insert(0, entry)

    # Trim log
    if len(agent_state["decision_log"]) > MAX_LOG_SIZE:
        agent_state["decision_log"] = agent_state["decision_log"][:MAX_LOG_SIZE]


def run_agent_cycle():
    """Run one monitoring + decision cycle."""
    if not agent_state["monitored_vaults"]:
        return {"status": "no_vaults", "message": "No vaults configured for monitoring"}

    # Step 1: Monitor — fetch current vault state
    vaults_data = []
    for vault_addr in agent_state["monitored_vaults"]:
        try:
            data = fetch_vault_data(vault_addr)
            vaults_data.append(data)
        except Exception as e:
            vaults_data.append({"address": vault_addr, "error": str(e)})

    # Step 2: Reason — ask Claude to analyze and decide
    try:
        decision = _get_agent_decision(vaults_data, agent_state["risk_profile"])
    except Exception as e:
        decision = {
            "decision": "error",
            "reasoning": f"Failed to get AI decision: {str(e)}",
            "actions": [],
        }

    # Step 3: Execute — if agent decides to act
    results = []
    if decision.get("decision") != "no_action" and decision.get("actions"):
        for action in decision["actions"]:
            result = _execute_action(action)
            results.append(result)

    # Step 4: Log
    _log_decision(decision, results)

    agent_state["last_check"] = datetime.now(timezone.utc).isoformat()
    agent_state["cycle_count"] += 1

    return {
        "status": "completed",
        "decision": decision,
        "execution_results": results,
        "cycle": agent_state["cycle_count"],
    }


def _agent_loop():
    """Background loop that runs agent cycles at configured intervals."""
    while agent_state["running"]:
        if agent_state["mode"] == "monitor":
            try:
                run_agent_cycle()
            except Exception as e:
                _log_decision({
                    "decision": "error",
                    "reasoning": f"Agent cycle error: {str(e)}",
                    "actions": [],
                })

        time.sleep(agent_state["interval_seconds"])


_agent_thread = None


def start_agent(user_address: str, vault_addresses: list[str], risk_profile: str = "balanced", interval: int = 60):
    """Start the autonomous agent."""
    global _agent_thread

    if agent_state["running"]:
        return {"status": "already_running"}

    agent_state["running"] = True
    agent_state["mode"] = "monitor"
    agent_state["user_address"] = user_address
    agent_state["monitored_vaults"] = vault_addresses
    agent_state["risk_profile"] = risk_profile
    agent_state["interval_seconds"] = max(30, interval)  # minimum 30s
    agent_state["cycle_count"] = 0

    _agent_thread = threading.Thread(target=_agent_loop, daemon=True)
    _agent_thread.start()

    return {
        "status": "started",
        "monitoring": vault_addresses,
        "risk_profile": risk_profile,
        "interval": agent_state["interval_seconds"],
    }


def stop_agent():
    """Stop the autonomous agent."""
    agent_state["running"] = False
    agent_state["mode"] = "paused"
    return {"status": "stopped", "cycles_completed": agent_state["cycle_count"]}


def get_agent_status():
    """Get current agent status and recent decisions."""
    return {
        "running": agent_state["running"],
        "mode": agent_state["mode"],
        "risk_profile": agent_state["risk_profile"],
        "monitored_vaults": agent_state["monitored_vaults"],
        "user_address": agent_state["user_address"],
        "interval_seconds": agent_state["interval_seconds"],
        "last_check": agent_state["last_check"],
        "cycle_count": agent_state["cycle_count"],
        "recent_decisions": agent_state["decision_log"][:10],
    }


def get_decision_log(limit: int = 20):
    """Get the full decision log."""
    return agent_state["decision_log"][:limit]
