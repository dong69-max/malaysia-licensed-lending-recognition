import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Camera, Search, ClipboardList, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: '首页', icon: Home },
  { to: '/scan', label: '扫描', icon: Camera },
  { to: '/search', label: '搜索', icon: Search },
  { to: '/records', label: '记录', icon: ClipboardList },
  { to: '/more', label: '更多', icon: MoreHorizontal },
];

export function AppShell({
  children,
  title,
  back,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {title && (
        <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-sm">
          <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-3">
            {back && (
              <button
                onClick={() => navigate(-1)}
                aria-label="返回"
                className="-ml-1 rounded-full p-2 hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="truncate text-base font-bold">{title}</h1>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default AppShell;
