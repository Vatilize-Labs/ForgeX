// wagmiAdapter and createAppKit are now handled in context/Web3Provider.tsx
// This file is kept for any components that need to import projectId or networks directly.
import { base, baseSepolia } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'placeholder-build-id'
export const networks = [base, baseSepolia]
