"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "default" | "sidebar";
}

export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return variant === "sidebar" ? (
      <Button variant="ghost" disabled className="h-12 w-10 flex-col gap-0.5" />
    ) : (
      <Button variant="ghost" size="icon" disabled className="h-9 w-9" />
    );
  }

  if (variant === "sidebar") {
    return (
      <Button
        variant="ghost"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={cn(
          "h-12 w-10 flex-col items-center justify-center gap-0.5",
          "hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {theme === "dark" ? (
          <>
            <BookOpen className="h-4 w-4" />
            <span className="text-[10px] font-semibold leading-none">Day</span>
          </>
        ) : (
          <>
            <Moon className="h-4 w-4" />
            <span className="text-[10px] font-semibold leading-none">Night</span>
          </>
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9"
    >
      {theme === "dark" ? (
        <BookOpen className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
