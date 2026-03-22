import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
BASE_RPC_URL = os.getenv("BASE_RPC_URL", "https://mainnet.base.org")
VAULT_FACTORY_ADDRESS = os.getenv("VAULT_FACTORY_ADDRESS", "0x8374257da04F00ABAf74E13EFE5A17B0f08EC226")
VULT_HOOK_ADDRESS = os.getenv("VULT_HOOK_ADDRESS", "0xe988b6816d94C10377779F08f2ab08925cE96D09")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Chainlink Price Feed addresses on Base Mainnet
PRICE_FEEDS = {
    "ETH/USD": "0x71041dddad3595F745215C98a901844ED99Db595",
    "USDC/USD": "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
    "USDT/USD": "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9",
}

# Token addresses on Base Mainnet
TOKENS = {
    "USDT": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "WETH": "0x4200000000000000000000000000000000000006",
    "DAI": "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
}

# WDK Agent Sidecar
WDK_SIDECAR_URL = os.getenv("WDK_SIDECAR_URL", "http://localhost:3100")

# Known protocol addresses
PROTOCOLS = {
    "aave": {"name": "Aave V3", "type": "lending"},
    "compound": {"name": "Compound V2", "type": "lending"},
    "uniswap": {"name": "Uniswap V4", "type": "dex"},
}
