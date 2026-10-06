import { Link } from 'react-router-dom';
import BackgroundFX from './BackgroundFX';

/**
 * Split-screen auth shell:
 *  left — cinematic brand panel (AI scenes, live metrics)
 *  right — form card
 */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="relative min-h-screen bg-[#050505]">
      <div className="absolute inset-0">
        <BackgroundFX density={0.7} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1fr_1fr]">
        {/* brand panel */}
        <div className="hidden flex-col justify-between p-10 lg:flex">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 font-display text-lg font-extrabold text-white">S</span>
            <span className="font-display text-lg font-bold text-white">SANGAM<span className="text-cyan-300">.AI</span></span>
          </Link>

          <div>
            <div className="card-glass max-w-md p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE · 2:47 AM NPT
              </div>
              <p className="mt-3 font-display text-xl font-bold leading-snug text-white">
                “While you sleep, your AI books, reminds and collects.”
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['38.4k', 'chats'],
                  ['4.2×', 'bookings'],
                  ['<8s', 'reply'],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-lg border border-white/10 bg-white/[0.03] py-2.5">
                    <div className="font-display text-[15px] font-bold text-white">{v}</div>
                    <div className="text-[11px] text-slate-500">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex -space-x-2">
                {['AS', 'RT', 'PM', '+'].map((x) => (
                  <span key={x} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#050505] bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-bold text-white">{x}</span>
                ))}
              </div>
              <p className="text-[12.5px] text-slate-400">480+ Nepali businesses · ★ 4.9/5</p>
            </div>
          </div>

          <p className="text-[12px] text-slate-600">© 2026 Sangam AI · Encrypted · ISO-minded practices</p>
        </div>

        {/* form panel */}
        <div className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-[460px]">
            <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 font-display text-lg font-extrabold text-white">S</span>
              <span className="font-display text-lg font-bold text-white">SANGAM<span className="text-cyan-300">.AI</span></span>
            </Link>
            <div className="card-glass p-7 sm:p-8">
              {(title || subtitle) && (
                <div className="mb-6">
                  {title && <h1 className="font-display text-2xl font-bold text-white">{title}</h1>}
                  {subtitle && <p className="mt-1.5 text-[13.5px] text-slate-400">{subtitle}</p>}
                </div>
              )}
              {children}
            </div>
            <p className="mt-5 text-center text-[12px] text-slate-600">
              Protected by rate-limiting · httpOnly sessions · audit logs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
