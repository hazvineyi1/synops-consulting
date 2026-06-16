import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, BookOpen, Layers, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_MAP } from "@/lib/products";
import React from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projects", href: "/projects", icon: BookOpen },
  { name: "Standards", href: "/standards", icon: Layers },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const compass = PRODUCT_MAP.compass;
  const Brand = compass.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="h-1 w-full" style={{ backgroundColor: compass.accent }} aria-hidden="true" />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden border-r border-sidebar-border bg-sidebar md:flex md:w-64 md:flex-col">
          <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 text-sidebar-foreground">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md text-white"
              style={{ backgroundColor: compass.accent }}
            >
              <Brand className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{compass.name}</div>
              <div className="text-[11px] text-sidebar-foreground/60">{compass.title}</div>
            </div>
          </div>
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {navigation.map((item) => {
                const isActive =
                  location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "group flex items-center rounded-md px-2 py-2 text-sm font-medium"
                    )}
                  >
                    <item.icon
                      className={cn(
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground",
                        "mr-3 h-4 w-4 flex-shrink-0"
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
          <div className="border-t border-sidebar-border p-4">
            {user && (
              <div className="mb-2 truncate px-2 text-xs text-sidebar-foreground/60">
                {user.name}
              </div>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
            <div className="flex items-center gap-2 font-semibold">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: compass.accent }}
              >
                <Brand className="h-4 w-4" aria-hidden="true" />
              </span>
              {compass.name}
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </header>
          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>
    </div>
  );
}
