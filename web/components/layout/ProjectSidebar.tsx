"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PROJECT_NAV } from "./Sidebar";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string;
}

export function ProjectSidebar({ projectId, projectName }: ProjectSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex w-52 flex-col gap-1 border-r bg-muted/30 p-3">
      <p className="mb-2 truncate px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {projectName}
      </p>
      {PROJECT_NAV.map(({ href, icon: Icon, label }) => {
        const full = `/projects/${projectId}/${href}`;
        const active = pathname.startsWith(full);
        return (
          <Link
            key={href}
            href={full}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground font-medium"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
