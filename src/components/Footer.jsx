import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[#070709]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 font-display text-lg font-extrabold text-white">
                S
              </span>
              <span className="font-display text-lg font-bold text-white">
                SANGAM<span className="text-cyan-300">.AI</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Autonomous AI employees for Nepali businesses. Bookings, follow-ups, payments and support —
              handled in Nepali + English, 24/7.
            </p>
            <div className="mt-5 flex gap-2">
              {['WhatsApp', 'Instagram', 'eSewa', 'Khalti'].map((c) => (
                <span key={c} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Product</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {['AI Employees', 'Industries', 'Pricing', 'Integrations', 'Changelog'].map((x) => (
                <li key={x}><a href={x === 'AI Employees' ? '#employees' : x === 'Pricing' ? '#pricing' : '#'} className="hover:text-white">{x}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><a href="#demo" className="hover:text-white">Request demo</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Privacy · Terms</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Account</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><Link to="/login" className="hover:text-white">Log in</Link></li>
              <li><Link to="/register" className="hover:text-white">Start free trial</Link></li>
              <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
            </ul>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[12px] text-emerald-200">
              ● All systems operational · 99.98% uptime (90d)
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-[12px] text-slate-500 sm:flex-row">
          <span>© 2026 Sangam AI Pvt. Ltd. · Kathmandu, Nepal</span>
          <span>Made for businesses that never want to miss a customer again.</span>
        </div>
      </div>
    </footer>
  );
}
