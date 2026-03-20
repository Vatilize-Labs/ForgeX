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
  { href: "/compare",   label: "Compare",   icon: GitCompare },
  { href: "/history",   label: "History",   icon: Clock },
  { href: "/automation",label: "Automation",icon: Zap },
  { href: "/hook",      label: "VultHook",  icon: Anchor },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();

  const isLanding = pathname === "/";
  const showNav = isConnected && isRegistered && !isLanding;

  return (
    <header
      style={{ background: "color-mix(in srgb, var(--background) 80%, transparent)", borderBottom: "1px solid var(--border)" }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between gap-6">

        {/* Logo + Wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <Image
            src="/forgex-logo.png"
            alt="ForgeX logo"
            width={72}
            height={72}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <span
            style={{ letterSpacing: "0.16em", lineHeight: 1 }}
            className="text-2xl font-black uppercase"
          >
            <span style={{ color: "var(--primary)" }}>FORGEX</span>
            <span style={{ color: "var(--foreground-muted)" }} className="mx-1.5">:</span>
            <span style={{ color: "var(--accent)" }}>VULT</span>
          </span>
        </Link>

        {/* Nav links — inner pages only, icons with active label below */}
        {showNav && (
          <nav className="hidden md:flex items-end gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={
                    active
                      ? { color: "var(--primary)", background: "var(--primary-muted)", borderColor: "rgba(143,168,40,0.22)" }
                      : { color: "var(--foreground-muted)", borderColor: "transparent" }
                  }
                  className="flex flex-col items-center px-3 py-2 rounded-lg border transition-all duration-150 hover:text-[var(--foreground)] hover:bg-[var(--card)] min-w-[44px]"
                >
                  <Icon size={16} />
                  {active && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", marginTop: 3, lineHeight: 1 }}>
                      {label.toUpperCase()}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: theme toggle + conditional buttons */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* LaunchButton only on landing page */}
          {isLanding && <LaunchButton />}

          {/* Connected pill (landing + connected) or appkit-button (inner pages / not connected) */}
          {isLanding && isConnected ? (
            <span
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
              className="px-4 py-2 rounded-lg text-xs font-bold"
            >
              Connected
            </span>
          ) : (
            <appkit-button />
          )}
        </div>
      </div>

      {/* Mobile nav — inner pages only */}
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
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 justify-center transition-colors"
              >
                <Icon size={15} />
                {active && (
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1 }}>
                    {label.toUpperCase()}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
