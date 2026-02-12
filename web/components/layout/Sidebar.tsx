"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  ListOrdered,
  FileText,
  Users,
  Globe,
  StickyNote,
  Settings,
} from "lucide-react";

const TOP_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

export const PROJECT_NAV = [
  { href: "chat",          icon: MessageSquare, label: "Chat" },
  { href: "outline",       icon: ListOrdered,   label: "Outline" },
  { href: "chapters",      icon: FileText,      label: "Chapters" },
  { href: "characters",    icon: Users,         label: "Characters" },
  { href: "worldbuilding", icon: Globe,         label: "World" },
  { href: "notes",         icon: StickyNote,    label: "Notes" },
  { href: "settings",      icon: Settings,      label: "Settings" },
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
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg"
      >
        N
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
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
