"""Core AI engine using Anthropic Claude for ForgeX analysis."""

import anthropic
from config import ANTHROPIC_API_KEY
from prompts import STRATEGY_SYSTEM, RISK_SYSTEM, CHAT_SYSTEM, INSIGHTS_SYSTEM

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
MODEL = "claude-sonnet-4-20250514"


def _call_claude(system: str, user_message: str) -> str:
    """Make a call to Claude and return the text response."""
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _format_vault_context(portfolio: dict) -> str:
    """Format portfolio data into a readable context string for Claude."""
    if not portfolio.get("vaults"):
        return "No vaults found for this user."

    lines = [
        f"User: {portfolio['user_address']}",
        f"Total Vaults: {portfolio['vault_count']}",
        "",
    ]

    for i, v in enumerate(portfolio["vaults"], 1):
        total_assets = v.get("total_assets")
        total_accrued = v.get("total_assets_accrued")
        aave_bal = v.get("aave_balance")
        compound_bal = v.get("compound_balance")
        total_usd = v.get("total_value_usd")
        share_price = v.get("share_price_usd")
        user_shares = v.get("user_shares", 0)

        # Use asset's actual decimals (e.g. 6 for USDT/USDC, 18 for WETH/DAI)
        asset_decimals = v.get("asset_decimals", 18)
        asset_divisor = 10 ** asset_decimals

        def fmt(val):
            if val is None:
                return "N/A"
            return f"{val / asset_divisor:.4f}"

        # USD values from the contract are always 18 decimals
        def fmt_usd(val):
            if val is None:
                return "N/A"
            return f"${val / 1e18:,.2f}"

        idle = 0
        if total_assets is not None:
            idle = total_assets - (aave_bal or 0) - (compound_bal or 0)

        lines.append(f"--- Vault #{i}: {v['address'][:10]}... ---")
        lines.append(f"  Asset: {v.get('asset', 'Unknown')}")
        lines.append(f"  Total Assets: {fmt(total_assets)}")
        lines.append(f"  Total Accrued (with yield): {fmt(total_accrued)}")
        lines.append(f"  Aave Deployed: {fmt(aave_bal)}")
        lines.append(f"  Compound Deployed: {fmt(compound_bal)}")
        lines.append(f"  Idle (in vault): {fmt(idle if idle >= 0 else 0)}")
        lines.append(f"  Total Value USD: {fmt_usd(total_usd)}")
        lines.append(f"  Share Price USD: {fmt_usd(share_price)}")
        lines.append(f"  Your Shares: {fmt(user_shares)}")
        lines.append(f"  Paused: {v.get('is_paused', 'Unknown')}")

        if total_accrued and total_assets and total_assets > 0:
            yield_pct = ((total_accrued - total_assets) / total_assets) * 100
            lines.append(f"  Unrealized Yield: {yield_pct:.2f}%")

        lines.append("")

    return "\n".join(lines)


def get_strategy_advice(portfolio: dict, risk_preference: str = "balanced") -> str:
    """Generate yield strategy recommendations based on vault data."""
    context = _format_vault_context(portfolio)
    user_msg = (
        f"Here is my current vault portfolio data:\n\n{context}\n\n"
        f"My risk preference is: {risk_preference}\n\n"
        "Please analyze my portfolio and provide specific yield strategy recommendations. "
        "Include recommended allocation percentages across Aave, Compound, and Uniswap v4 (via VultHook). "
        "Also suggest if I should create additional vaults for diversification."
    )
    return _call_claude(STRATEGY_SYSTEM, user_msg)


def get_risk_assessment(portfolio: dict) -> str:
    """Generate risk assessment for the user's vault portfolio."""
    context = _format_vault_context(portfolio)
    user_msg = (
        f"Here is my current vault portfolio data:\n\n{context}\n\n"
        "Please provide a comprehensive risk assessment. Include:\n"
        "1. Overall risk score (1-10)\n"
        "2. Breakdown by risk category\n"
        "3. Specific risks identified\n"
        "4. Mitigation recommendations"
    )
    return _call_claude(RISK_SYSTEM, user_msg)


def chat(portfolio: dict | None, message: str, history: list[dict] | None = None) -> str:
    """Handle a chat message with optional portfolio context."""
    context = ""
    if portfolio and portfolio.get("vaults"):
        context = (
            f"Current portfolio context:\n{_format_vault_context(portfolio)}\n\n"
        )

    user_msg = f"{context}User message: {message}"

    if history:
        messages = []
        for h in history[-10:]:  # Keep last 10 messages for context
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_msg})
    else:
        messages = [{"role": "user", "content": user_msg}]

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=CHAT_SYSTEM,
        messages=messages,
    )
    return response.content[0].text


def get_dashboard_insights(portfolio: dict) -> str:
    """Generate concise dashboard insights for the portfolio."""
    context = _format_vault_context(portfolio)
    user_msg = (
        f"Here is my current vault portfolio data:\n\n{context}\n\n"
        "Generate 5-7 concise dashboard insights covering: "
        "performance summary, allocation analysis, yield optimization opportunities, "
        "risk alerts, and recommended action items. "
        "Format as short bullet points. Be specific with numbers."
    )
    return _call_claude(INSIGHTS_SYSTEM, user_msg)
