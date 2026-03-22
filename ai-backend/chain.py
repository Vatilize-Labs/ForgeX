"""On-chain data fetching utilities for ForgeX vaults."""

from web3 import Web3
from config import BASE_RPC_URL, VAULT_FACTORY_ADDRESS, TOKENS

w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))

# Minimal ABIs for reading on-chain data
VAULT_FACTORY_ABI = [
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getUserVaults",
        "outputs": [{"name": "", "type": "address[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "isUserRegistered",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getUserInfo",
        "outputs": [
            {"name": "", "type": "string"},
            {"name": "", "type": "string"},
            {"name": "", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalVaults",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

USER_VAULT_ABI = [
    {
        "inputs": [],
        "name": "totalAssets",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalAssetsAccrued",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "asset",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "isPaused",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAaveBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getCompoundBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getTotalValueUSD",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getSharePriceUSD",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAssetPriceUSD",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def get_factory_contract():
    return w3.eth.contract(
        address=Web3.to_checksum_address(VAULT_FACTORY_ADDRESS),
        abi=VAULT_FACTORY_ABI,
    )


def get_vault_contract(vault_address: str):
    return w3.eth.contract(
        address=Web3.to_checksum_address(vault_address),
        abi=USER_VAULT_ABI,
    )


def fetch_user_vaults(user_address: str) -> list[str]:
    """Get all vault addresses for a user."""
    factory = get_factory_contract()
    try:
        vaults = factory.functions.getUserVaults(
            Web3.to_checksum_address(user_address)
        ).call()
        return [v for v in vaults]
    except Exception:
        return []


# Known asset decimals by address (lowercase)
ASSET_DECIMALS = {
    TOKENS["USDT"].lower(): 6,
    TOKENS["USDC"].lower(): 6,
    TOKENS["WETH"].lower(): 18,
    TOKENS["DAI"].lower(): 18,
}

ERC20_DECIMALS_ABI = [
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    }
]


def get_asset_decimals(asset_address: str) -> int:
    """Get decimals for an asset, from known map or on-chain."""
    known = ASSET_DECIMALS.get(asset_address.lower())
    if known is not None:
        return known
    try:
        token = w3.eth.contract(
            address=Web3.to_checksum_address(asset_address),
            abi=ERC20_DECIMALS_ABI,
        )
        return token.functions.decimals().call()
    except Exception:
        return 18


def fetch_vault_data(vault_address: str) -> dict:
    """Fetch comprehensive data for a single vault."""
    vault = get_vault_contract(vault_address)
    data = {"address": vault_address}

    calls = {
        "total_assets": ("totalAssets", []),
        "total_assets_accrued": ("totalAssetsAccrued", []),
        "total_supply": ("totalSupply", []),
        "asset": ("asset", []),
        "is_paused": ("isPaused", []),
        "aave_balance": ("getAaveBalance", []),
        "compound_balance": ("getCompoundBalance", []),
        "total_value_usd": ("getTotalValueUSD", []),
        "share_price_usd": ("getSharePriceUSD", []),
        "asset_price_usd": ("getAssetPriceUSD", []),
    }

    for key, (fn_name, args) in calls.items():
        try:
            result = getattr(vault.functions, fn_name)(*args).call()
            data[key] = result if isinstance(result, (str, bool)) else int(result)
        except Exception:
            data[key] = None

    # Resolve asset decimals
    asset_addr = data.get("asset")
    data["asset_decimals"] = get_asset_decimals(asset_addr) if asset_addr else 18

    return data


def fetch_user_portfolio(user_address: str) -> dict:
    """Fetch full portfolio data for a user."""
    vault_addresses = fetch_user_vaults(user_address)
    vaults = []
    for addr in vault_addresses:
        vault_data = fetch_vault_data(addr)
        # Also get user's share balance in this vault
        try:
            vault_contract = get_vault_contract(addr)
            balance = vault_contract.functions.balanceOf(
                Web3.to_checksum_address(user_address)
            ).call()
            vault_data["user_shares"] = int(balance)
        except Exception:
            vault_data["user_shares"] = 0
        vaults.append(vault_data)

    return {
        "user_address": user_address,
        "vault_count": len(vaults),
        "vaults": vaults,
    }


def fetch_platform_stats() -> dict:
    """Fetch platform-level statistics."""
    factory = get_factory_contract()
    try:
        total_vaults = factory.functions.totalVaults().call()
    except Exception:
        total_vaults = 0

    return {
        "total_vaults": total_vaults,
        "factory_address": VAULT_FACTORY_ADDRESS,
        "network": "Base Mainnet",
        "chain_id": 8453,
    }
