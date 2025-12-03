import { Link, useLocation } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';
import { cn } from '@/lib/utils';

export function Navigation() {
  const location = useLocation();

  const navItems = [
    {
      path: '/search',
      label: 'Search',
      icon: Search,
      description: 'Browse and search events'
    },
    {
      path: '/create',
      label: 'Create',
      icon: Plus,
      description: 'Create new notes'
    }
  ];

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold truncate hover:opacity-80 transition-opacity">
              <Search
                className="h-7 w-7 dark:text-accent text-primary flex-shrink-0"
                strokeWidth={3.5}
              />
              <span className="truncate dark:text-primary">Curator.hivetalk.org</span>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={item.description}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side - Login Area */}
          <div className="flex items-center gap-2 sm:gap-4">
            <LoginArea />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="sm:hidden mt-4 flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={item.description}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
