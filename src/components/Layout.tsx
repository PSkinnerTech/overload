import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { 
  Mic, 
  FileText, 
  Brain, 
  Settings, 
  Menu,
  X,
  Home,
  History,
  BarChart2
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: 'dashboard' | 'record' | 'documents' | 'analytics' | 'settings';
  onViewChange: (view: LayoutProps['activeView']) => void;
}

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'record' as const, label: 'Record', icon: Mic },
    { id: 'documents' as const, label: 'Documents', icon: FileText },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart2 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className={cn("flex items-center gap-2", !sidebarOpen && "justify-center")}>
              <Brain className="h-8 w-8 text-primary" />
              {sidebarOpen && (
                <h1 className="text-xl font-bold">Aurix</h1>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(!sidebarOpen && "absolute right-2")}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Button
                      variant={activeView === item.id ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        !sidebarOpen && "justify-center px-2"
                      )}
                      onClick={() => onViewChange(item.id)}
                    >
                      <Icon className={cn("h-5 w-5", sidebarOpen && "mr-3")} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          {sidebarOpen && (
            <div className="p-4 border-t">
              <p className="text-sm text-muted-foreground">
                AI-powered documentation
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Version 1.0.0
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}