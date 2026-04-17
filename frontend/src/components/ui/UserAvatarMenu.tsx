import { useState, useRef, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function UserAvatarMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user.email?.[0].toUpperCase() ?? 'U';

  return (
    <div className="relative" ref={ref}>
      {/* Avatar Button */}
    <button
        onClick={() => setOpen(prev => !prev)}
        className="relative flex items-center gap-3 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded-full transition-colors focus:outline-none"
        aria-label="Abrir menu do perfil"
      >
        <div className="relative flex-shrink-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'Avatar'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 hover:ring-brand-400 transition-all duration-200 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-100 border-2 border-brand-200 hover:border-brand-400 transition-all duration-200 flex items-center justify-center text-brand-700 text-xs font-bold shadow-sm">
              {initials}
            </div>
          )}
          {/* Dot de status Online */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
        </div>

        <span className="hidden sm:block text-sm font-medium text-slate-700">
          {user.displayName?.split(' ')[0] ?? user.email?.split('@')[0]}
        </span>
      </button>

      {/* Dropdown flutuante */}
      {open && (
        <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Cabeçalho do perfil */}
          <div className="px-4 py-4 flex items-center gap-3 bg-slate-50 border-b border-slate-100">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate leading-tight">
                {user.displayName ?? 'Usuário'}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          {/* Plano/Badge */}
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Plano B2B Corporativo
            </span>
          </div>

          {/* Logout */}
          <div className="px-2 py-2">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium group"
            >
              <LogOut className="w-4 h-4 text-red-500 group-hover:translate-x-0.5 transition-transform" />
              Sair da Conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
