import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NAV_LINKS } from '../data/content';
import { useAuthStore } from '../store/useAuthStore';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/85 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
      }`}
    >
      {/* scarcity bar — psychology: urgency + specificity */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 px-4 py-1.5 text-center text-[12px] font-medium text-white">
        <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Ashadh onboarding: only <strong>7 slots left</strong> for white-glove setup — live in 48 hours
        <button onClick={() => navigate('/register')} className="ml-3 underline underline-offset-2 hover:opacity-80">
          Claim yours →
        </button>
      </div>

      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 font-display text-lg font-extrabold text-white shadow-[0_4px_20px_rgba(139,92,246,0.5)]">
            S
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            SANGAM<span className="text-cyan-300">.AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-slate-300 transition hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-secondary !px-5 !py-2.5">
              Open dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white">
                Log in
              </Link>
              <Link to="/register" className="btn-primary shimmer-btn !px-5 !py-2.5">
                Start free trial
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white lg:hidden"
          aria-label="Menu"
        >
          <span className="material-symbols-outlined">{open ? 'close' : 'menu'}</span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-[#0d0d11]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary flex-1">
                Log in
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
