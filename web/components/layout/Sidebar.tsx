"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  StickyNote,
  Settings,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const TOP_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

export const PROJECT_NAV = [
  { href: "vault",     icon: StickyNote,    label: "Files" },
  { href: "settings",  icon: Settings,      label: "Settings" },
];

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-16 flex-col items-center gap-1 border-r bg-background py-4">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <BookOpen className="h-5 w-5" />
      </Link>

      {/* Top nav */}
      {TOP_NAV.map(({ href, icon: Icon, label }) => (
        <NavIcon
          key={href}
          href={href}
          icon={Icon}
          label={label}
          active={pathname === href}
        />
      ))}

      {/* Project nav */}
      {projectId && (
        <>
          <div className="my-2 h-px w-8 bg-border" />
          {PROJECT_NAV.map(({ href, icon: Icon, label }) => {
            const full = `/projects/${projectId}/${href}`;
            return (
              <NavIcon
                key={href}
                href={full}
                icon={Icon}
                label={label}
                active={pathname.startsWith(full)}
              />
            );
          })}
        </>
      )}

      {/* Spacer */}
      <div className="mt-auto" />

      {/* Decorative divider */}
      <div className="sidebar-deco w-8 h-px bg-border mb-1" />

      {/* Theme toggle */}
      <ThemeToggle variant="sidebar" />
    </aside>
  );
}

function NavIcon({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r bg-primary" />}
      <Icon className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
