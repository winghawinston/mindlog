"use client";

import { logoutAction } from "@/app/(auth)/actions";
import { usePathname } from "next/navigation"
import { useTransition } from "react";
import { BookOpen, LayoutDashboard, User, LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal",   label: "Journal",   icon: BookOpen },
  { href: "/profile",   label: "Profile",   icon: User },
];

export default function DashboardNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <nav className="w-56 shrink-0 flex flex-col border-r border-parchment dark:border-dark-border bg-white dark:bg-dark-surface h-screen sticky top-0">
      {/* brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-parchment dark:border-dark-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-forest">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2 10h3l2-6 3 12 2-8 1 2h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-medium text-ink dark:text-[#f0ede8]">MindLog</span>
      </div>

      {/* nav links */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                isActive
                  ? "bg-forest/10 text-forest font-medium dark:bg-sage/10 dark:text-sage"
                  : "text-ink-muted hover:bg-linen hover:text-ink dark:text-[#888480] dark:hover:bg-dark-raised dark:hover:text-[#d8d5ce]"
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* user + logout */}
      <div className="px-3 pb-4 border-t border-parchment dark:border-dark-border pt-4">
        <p className="px-3 text-xs text-ink-subtle dark:text-[#555250] truncate mb-2">
          {userEmail}
        </p>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer",
            "text-ink-muted hover:bg-[#fcecea] hover:text-danger",
            "dark:text-[#888480] dark:hover:bg-[#2a1414] dark:hover:text-[#e87070]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <LogOut size={16} aria-hidden="true" />
          {isPending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </nav>
  )
}