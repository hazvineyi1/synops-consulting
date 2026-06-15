import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, BookOpen, Layers, Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projects", href: "/projects", icon: BookOpen },
  { name: "Standards", href: "/standards", icon: Layers },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="hidden border-r bg-card md:flex md:w-64 md:flex-col">
        <div className="flex h-14 items-center border-b px-4 font-semibold text-primary">
          <div className="mr-2 flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
            ID
          </div>
          Production Engine
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    "group flex items-center rounded-md px-2 py-2 text-sm font-medium"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-secondary-foreground" : "text-muted-foreground group-hover:text-foreground",
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
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
              ID
            </div>
            <div className="text-sm">
              <p className="font-medium">Instructional Designer</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="font-semibold text-primary">ID Production Engine</div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
