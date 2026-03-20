"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useIsRegistered } from "@/hooks/useVaultFactory";
import { LayoutDashboard, Vault, BarChart2, Briefcase, Anchor, GitCompare, Clock, Zap } from "lucide-react";

const LaunchButton = dynamic(() => import("./LaunchButton"), { ssr: false });
const ThemeToggle = dynamic(() => import("./ThemeToggle"), { ssr: false });

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vaults",    label: "Vaults",    icon: Vault },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/compare",    label: "Compare",    icon: GitCompare },
  { href: "/history",    label: "History",    icon: Clock },
  { href: "/automation", label: "Automation", icon: Zap },
  { href: "/hook",       label: "VultHook",   icon: Anchor },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const showNav = isConnected && isRegistered;


  return (
    <header
      style={{ background: "rgba(9,10,6,0.80)", borderBottom: "1px solid var(--border)" }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between gap-6">

        {/* Logo + Wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <Image
            src="/logo.svg"
            alt="ForgeX logo"
            width={36}
            height={36}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <span
            style={{ letterSpacing: "0.16em", lineHeight: 1 }}
            className="text-sm font-black uppercase"
          >
            <span style={{ color: "var(--primary)" }}>FORGEX</span>
            <span style={{ color: "var(--border-strong)" }} className="mx-1.5">:</span>
            <span style={{ color: "var(--accent)" }}>VULT</span>
          </span>
        </Link>

        {/* Nav links */}
        {showNav && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={
                    active
                      ? { background: "var(--primary-muted)", color: "var(--primary-hover)", borderColor: "rgba(143,168,40,0.22)" }
                      : { color: "var(--foreground-muted)", borderColor: "transparent" }
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150 hover:text-[var(--foreground)] hover:bg-[var(--card)]"
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: theme toggle + launch app + wallet button */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LaunchButton />
          {/* On landing page: show simple "Connected" pill when connected, full appkit-button otherwise */}
          {/* On inner pages: always show full appkit-button for address/balance */}
          {pathname === "/" && isConnected ? (
            <span
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              Connected
            </span>
          ) : (
            <appkit-button />
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {showNav && (
        <div
          style={{ borderTop: "1px solid var(--border)" }}
          className="md:hidden flex items-center gap-1 px-4 py-2"
        >
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={active ? { color: "var(--primary)" } : { color: "var(--foreground-muted)" }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold flex-1 justify-center transition-colors"
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
