"use client";

import { logoutAction } from "@/app/(auth)/actions";
import { usePathname } from "next/navigation"
import { useTransition } from "react";
// ADDED: TrendingUp, Lock, PenLine, BookMarked for the new nav items
import { BookOpen, LayoutDashboard, User, LogOut, TrendingUp, Lock, PenLine, BookMarked } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
// import { useWritingStore } from "@/store/writingStore";

// ── Nav structure ────────────────────────────────────────────
// Top-level items can optionally have children (sub-items).
// Sub-items are only visible when the nav is expanded (hovered).
// When collapsed, clicking a parent icon navigates to href.

// ADDED: sub-item type for Journal's nested items
interface SubItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: SubItem[]; // ADDED
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/journal",
    label: "Journal",
    icon: BookOpen,
    // ADDED: sub-items for new entry and past logs
    children: [
      { href: "/journal",            label: "New Entry", icon: PenLine    },
      { href: "/journal/past-logs",  label: "Past Logs", icon: BookMarked },
    ],
  },
  { href: "/insights",      label: "Insights",      icon: TrendingUp }, // ADDED
  { href: "/privacy-vault", label: "Privacy Vault", icon: Lock       }, // ADDED
  { href: "/profile",       label: "Profile",       icon: User       },
];

export default function DashboardNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // ADDED: read canvas mode — nav retreats when user is writing
  // const isCanvasMode = useWritingStore((state) => state.isCanvasMode);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  // ADDED: named checkActive to avoid shadowing the local isActive
  // variable in the mobile nav map below
  const checkActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // ADDED: a parent is active if it or any of its children is active
  const isParentActive = (item: NavItem) =>
    checkActive(item.href) ||
    (item.children?.some((c) => checkActive(c.href)) ?? false);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          DESKTOP SIDEBAR
          - Always visible on md+ screens
          - Collapsed (64px) by default, expands (240px) on hover
          - Pure CSS hover — no JS state, no click required
          - Frosted glass effect with backdrop-filter
          ═══════════════════════════════════════════════════════ */}
      <nav
        className={cn(
          // layout
          "group hidden md:flex flex-col",
          "h-screen sticky top-0 z-30 shrink-0",
          // size transition — CSS hover handles expand/collapse
          "w-16 hover:w-60 transition-[width] duration-300 ease-in-out",
          // overflow must be hidden so text labels don't spill out when collapsed
          "overflow-hidden",
          // visual — frosted glass
          "border-r border-parchment/60 dark:border-dark-border/60",
          "bg-white/85 dark:bg-dark-surface/85 backdrop-blur-xl",
        )}
      >
        {/* brand */}
        <div className="flex items-center h-16 px-4 border-b border-parchment/60 dark:border-dark-border/60 shrink-0">
          {/* logo mark — always visible */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-forest shrink-0">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2 10h3l2-6 3 12 2-8 1 2h5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* brand name — fades in as sidebar expands */}
          <span
            className={cn(
              "ml-3 text-sm font-medium text-ink dark:text-[#F0EDE8] whitespace-nowrap",
              // fade in with a slight delay so it appears after width animation starts
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-100"
            )}
          >
            Cadence
          </span>
        </div>

        {/* nav items */}
        <div className="flex-1 px-2 py-3 flex flex-col gap-1 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const active = isParentActive(item);
            return (
              // ADDED: wrapper div so sub-items can sit below the parent
              <div key={item.href}>
                {/* parent item — styling preserved exactly from before */}
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex items-center rounded-lg transition-colors duration-150",
                    "whitespace-nowrap",
                    active
                      ? "bg-forest/10 text-forest dark:bg-sage/10 dark:text-sage"
                      : "text-ink-muted hover:bg-linen hover:text-ink dark:text-[#888480] dark:hover:bg-dark-raised dark:hover:text-[#D8D5CE]"
                  )}
                >
                  <span className="flex items-center justify-center ml-3.5 py-2.5 shrink-0">
                    <item.icon size={18} aria-hidden="true" />
                  </span>

                  <span
                    className={cn(
                      "text-sm font-medium ml-3",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-100"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>

                {/* ADDED: sub-items — only appear when sidebar is hovered/expanded */}
                {item.children && (
                  <div className={cn(
                    "overflow-hidden",
                    "max-h-0 group-hover:max-h-24",
                    "opacity-0 group-hover:opacity-100",
                    "transition-all duration-200 delay-100"
                  )}>
                    {item.children.map((child) => {
                      const childActive = checkActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center rounded-lg transition-colors duration-150 whitespace-nowrap",
                            "py-3 mt-1",
                            "dark:hover:bg-dark-raised dark:hover:text-[#D8D5CE]",
                            childActive
                              ? "text-forest dark:text-sage"
                              : "text-ink-subtle dark:text-[#555250] hover:text-ink dark:hover:text-[#D8D5CE]"
                          )}
                        >
                          {/* spacer aligns child text with parent label */}
                          <span className="flex items-center justify-center ml-3.5 py-2 shrink-0 opacity-0" />
                          <span className="flex items-center gap-2 text-xs ml-3">
                            <child.icon size={13} aria-hidden="true" />
                            {child.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* user + logout */}
        <div className="px-2 pb-4 border-t border-parchment/60 dark:border-dark-border/60 pt-3 overflow-hidden shrink-0">
          {/* email — only visible when expanded */}
          <p
            className={cn(
              "px-3 text-xs text-ink-subtle dark:text-[#555250] truncate mb-1",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-100"
            )}
          >
            {userEmail}
          </p>

          <button
            onClick={handleLogout}
            disabled={isPending}
            title="Sign out"
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm",
              "transition-colors duration-150 cursor-pointer whitespace-nowrap",
              "text-ink-muted hover:bg-[#FCECEA] hover:text-danger",
              "dark:text-[#888480] dark:hover:bg-[#2A1414] dark:hover:text-[#E87070]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span
              className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-100"
              )}
            >
              {isPending ? "Signing out…" : "Sign out"}
            </span>
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
          - Only visible on screens smaller than md
          - Fixed to bottom of screen
          - Shows icons + labels for all main routes
          - Logout is accessed via Profile page on mobile
          ═══════════════════════════════════════════════════════ */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-30",
          "flex items-center justify-around",
          "h-16 px-2",
          "border-t border-parchment/60 dark:border-dark-border/60",
          "bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl",
          // CHANGED: hide bottom nav in canvas mode on mobile — writing takes the full screen
          // isCanvasMode
          //   ? "opacity-0 pointer-events-none translate-y-2 transition-all duration-300"
          //   : "opacity-100 translate-y-0 transition-all duration-300"
        )}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full",
                "text-xs transition-colors duration-150",
                isActive
                  ? "text-forest dark:text-sage"
                  : "text-ink-subtle dark:text-[#555250]"
              )}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                aria-hidden="true"
              />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  )
}