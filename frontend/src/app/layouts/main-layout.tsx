import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Shield,
  LogOut,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import logoImage from '@/assets/logo.png';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
  userName?: string;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Главная', href: '/dashboard' },
  { icon: FileText, label: 'Заявки', href: '/requests' },
  { icon: Users, label: 'Клиенты', href: '/clients' },
  { icon: Shield, label: 'Аудит', href: '/audit' },
  { icon: Settings, label: 'Настройки', href: '/settings' },
];

export function MainLayout({
  children,
  currentPage = '/dashboard',
  darkMode = false,
  onToggleDarkMode,
  onNavigate,
  onLogout,
  userName = 'Пользователь'
}: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (href: string) => {
    if (onNavigate) {
      const pageMap: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/requests': 'requests',
        '/clients': 'clients',
        '/audit': 'audit',
        '/settings': 'settings',
      };
      onNavigate(pageMap[href] || 'dashboard');
    }
    setMobileMenuOpen(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={cn('flex h-screen bg-background', darkMode && 'dark')}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-primary">
              <img src={logoImage} alt="961.kz" className="h-6" />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.href;

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{getInitials(userName)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">admin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDarkMode}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -ml-2 text-foreground"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-2 rounded-lg bg-primary">
            <img src={logoImage} alt="961.kz" className="h-6" />
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-card z-40 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.href;

              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border mt-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/50 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{getInitials(userName)}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">admin</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleDarkMode}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-accent text-accent-foreground"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Тема
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-accent text-accent-foreground"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:mt-0 mt-16">
        {children}
      </main>
    </div>
  );
}