import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AI_EMPLOYEES, INTEGRATIONS } from '../data/content';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'employees', label: 'AI Employees', icon: 'smart_toy' },
  { id: 'inbox', label: 'Conversations', icon: 'forum', badge: '12' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar_month' },
  { id: 'contacts', label: 'Contacts', icon: 'contacts' },
  { id: 'analytics', label: 'Analytics', icon: 'insights' },
  { id: 'integrations', label: 'Integrations', icon: 'hub' },
  { id: 'billing', label: 'Billing', icon: 'receipt_long' },
  { id: 'team', label: 'Team', icon: 'group' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const MOCK_CONVOS = [
  { name: 'Gita R.', channel: 'WhatsApp', lang: 'NE', text: 'bholi 4 baje skin facial milcha?', time: '2m', sentiment: 'warm', status: 'AI handling' },
  { name: '@sneha.m', channel: 'Instagram', lang: 'EN', text: 'Price for bridal package?', time: '9m', sentiment: 'hot', status: ' booked ✓' },
  { name: 'Ramesh K.', channel: 'Voice', lang: 'NE', text: '“mero appointment saryo…” → moved to Fri', time: '22m', sentiment: 'neutral', status: 'AI resolved' },
  { name: 'billing@edu.com', channel: 'Gmail', lang: 'EN', text: 'Invoice #INV-2091 overdue — nudge sent', time: '1h', sentiment: 'cold', status: 'Payment link sent' },
  { name: 'Anish P.', channel: 'WhatsApp', lang: 'ROMAN', text: 'hajur khalti ma paisa pathaye, confirm?', time: '2h', sentiment: 'warm', status: 'Verified ✓' },
];

const MOCK_BOOKINGS = [
  { who: 'Gita Rana', service: 'HydraFacial · 60m', when: 'Today · 4:00 PM', by: 'Booking AI', state: 'Confirmed' },
  { who: 'Sneha Maharjan', service: 'Bridal trial · 90m', when: 'Tomorrow · 11:30 AM', by: 'Sales Closer', state: 'Deposit paid' },
  { who: 'Ramesh KC', service: 'Root canal · follow-up', when: 'Fri · 9:30 AM', by: 'Receptionist AI', state: 'Reminded' },
  { who: 'Waitlist ×3', service: 'Sat cancellations', when: 'Auto-fill on', by: 'Booking AI', state: 'Watching' },
];

const MOCK_CONTACTS = [
  { name: 'Gita Rana', tag: 'VIP · facial ×6', value: 'Rs. 48,000 LTV', last: '2m ago · WhatsApp' },
  { name: 'Sneha Maharjan', tag: 'Bridal · hot lead', value: 'Rs. 65,000 pipeline', last: '9m ago · IG' },
  { name: 'Ramesh KC', tag: 'Dental · treatment plan', value: 'Rs. 18,000 pending', last: '22m ago · Voice' },
  { name: 'EduBridge ref', tag: 'B2B · invoice due', value: 'Rs. 32,000 overdue', last: '1h ago · Gmail' },
];

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#101016]/90 p-5 ${className}`}>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-white/10'}`}
      aria-label="Toggle"
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function Dashboard() {
  const { user, getMe, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(AI_EMPLOYEES.slice(0, 5).map((e) => [e.id, true]))
  );
  const [connected, setConnected] = useState(() =>
    Object.fromEntries(INTEGRATIONS.slice(0, 5).map((g) => [g.name, true]))
  );
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => { getMe().catch(() => {}); }, [getMe]);

  const activeCount = useMemo(() => Object.values(enabled).filter(Boolean).length, [enabled]);

  const doLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  const displayName = user?.name || 'there';
  const business = user?.businessName || 'Your business';

  return (
    <div className="min-h-screen bg-[#070709] text-slate-200 lg:grid lg:grid-cols-[248px_1fr]">
      {/* ── Sidebar ── */}
      <aside className="hidden border-r border-white/10 bg-[#0a0a0e] p-4 lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 font-display text-lg font-extrabold text-white">S</span>
          <div>
            <div className="font-display text-[15px] font-bold text-white leading-none">SANGAM.AI</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{business}</div>
          </div>
        </Link>

        <div className="mt-2 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${
                tab === t.id ? 'bg-gradient-to-r from-violet-600/25 to-cyan-500/15 text-white border border-violet-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">{t.icon}</span>
              {t.label}
              {t.badge && (
                <span className="ml-auto rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-300">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <div className="text-[12px] font-semibold text-emerald-200">● {activeCount} employees on shift</div>
            <div className="mt-1 text-[11.5px] text-slate-400">Handling chats right now — even at 2 AM.</div>
          </div>
          <button onClick={doLogout} disabled={loggingOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-slate-400 hover:bg-rose-500/10 hover:text-rose-200">
            <span className="material-symbols-outlined text-[19px]">logout</span>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="min-w-0">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070709]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setMobileNav(!mobileNav)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 lg:hidden" aria-label="Menu">
              <span className="material-symbols-outlined">{mobileNav ? 'close' : 'menu'}</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[17px] font-bold text-white">
                Namaste, {displayName} 🙏
              </h1>
              <p className="truncate text-[12px] text-slate-500">
                {new Date().toLocaleDateString('en-NP', { weekday: 'long', month: 'short', day: 'numeric' })} · AI handled 47 chats since midnight
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> All systems live
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[12px] font-bold text-white">
                {(user?.name || 'S').slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
          {mobileNav && (
            <div className="grid grid-cols-2 gap-1.5 border-t border-white/10 p-3 lg:hidden">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setMobileNav(false); }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] ${tab === t.id ? 'bg-violet-600/20 text-white' : 'text-slate-400'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          {/* ══ OVERVIEW ══ */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Rs. 2,84,000', '+18% vs last week', 'Revenue influenced', 'payments', 'text-emerald-300'],
                  ['312', '87% auto-resolved', 'Conversations (7d)', 'forum', 'text-cyan-300'],
                  ['96', '−43% no-shows', 'Bookings held', 'calendar_month', 'text-violet-300'],
                  ['4.9 ★', '+31 new reviews', 'Google rating', 'star', 'text-amber-300'],
                ].map(([v, s, l, icon, color]) => (
                  <Card key={l}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-slate-400">{l}</span>
                      <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
                    </div>
                    <div className="mt-2 font-display text-2xl font-extrabold text-white">{v}</div>
                    <div className="mt-0.5 font-mono text-[11.5px] text-emerald-300">{s}</div>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-[15px] font-bold text-white">Bookings — last 7 days</h3>
                    <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">AI booked 81%</span>
                  </div>
                  <div className="mt-4 flex h-36 items-end gap-2">
                    {[42, 68, 55, 80, 96, 74, 88].map((h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                        <div
                          className={`w-full rounded-t-lg ${i === 4 ? 'bg-gradient-to-t from-orange-500 to-amber-400' : 'bg-gradient-to-t from-violet-600 to-cyan-500'}`}
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[10px] text-slate-500">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <h3 className="font-display text-[15px] font-bold text-white">⚡ Live activity</h3>
                  <ul className="mt-3 space-y-2.5 text-[12.5px]">
                    {[
                      ['Booking AI booked Gita · 4 PM today', '1m', 'emerald'],
                      ['Payment Collector verified Khalti Rs. 6,500', '6m', 'cyan'],
                      ['Review Booster requested ★ from Sneha', '14m', 'amber'],
                      ['Handoff: angry caller → you (transcript ready)', '31m', 'rose'],
                    ].map(([t, time, c]) => (
                      <li key={t} className="flex gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full bg-${c}-400`} style={{ background: c === 'emerald' ? '#34d399' : c === 'cyan' ? '#22d3ee' : c === 'amber' ? '#fbbf24' : '#fb7185' }} />
                        <span className="flex-1 text-slate-300">{t}</span>
                        <span className="text-slate-600">{time}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">🌅 This morning’s AI brief <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[11px] font-normal text-slate-400">7:00 AM</span></h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">
                  Yesterday: <strong className="text-slate-200">Rs. 41,500</strong> influenced · <strong className="text-slate-200">2 no-shows</strong> re-booked automatically ·
                  top objection was <em>“price too high”</em> (6×) — consider a 3-installment Khalti plan. One VIP (Gita, LTV Rs. 48k) asked for Sunday — approve manually.
                </p>
              </Card>
            </div>
          )}

          {/* ══ EMPLOYEES ══ */}
          {tab === 'employees' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-bold text-white">Your AI team</h2>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-300">{activeCount} on shift</span>
                <span className="text-[12.5px] text-slate-500">Toggle to clock them in/out instantly.</span>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {AI_EMPLOYEES.map((e) => {
                  const on = !!enabled[e.id];
                  return (
                    <Card key={e.id} className={on ? '' : 'opacity-60'}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="material-symbols-outlined rounded-xl border border-white/10 bg-white/5 p-2.5 text-[22px] text-violet-300">{e.icon}</span>
                        <Toggle on={on} onChange={(v) => setEnabled((s) => ({ ...s, [e.id]: v }))} />
                      </div>
                      <h3 className="mt-3 font-display text-[15px] font-bold text-white">{e.name}</h3>
                      <p className="text-[12px] text-cyan-300/80">{e.tag}</p>
                      <p className="mt-1.5 text-[12.5px] text-slate-400">{e.desc}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="font-mono text-[11px] text-emerald-300">{e.metric}</span>
                        <button className="text-[12px] font-medium text-slate-400 hover:text-white">Configure →</button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ INBOX ══ */}
          {tab === 'inbox' && (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="!p-3">
                <div className="flex items-center justify-between px-2 py-1">
                  <h2 className="font-display text-[15px] font-bold text-white">Unified inbox</h2>
                  <span className="text-[11.5px] text-slate-500">WhatsApp · IG · Gmail · Voice</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {MOCK_CONVOS.map((c) => (
                    <div key={c.name} className="cursor-pointer rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3 transition hover:border-violet-500/30">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[11px] font-bold text-white">{c.name.slice(0, 1)}</span>
                        <span className="text-[13px] font-semibold text-white">{c.name}</span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10.5px] text-slate-400">{c.channel} · {c.lang}</span>
                        <span className="ml-auto text-[11px] text-slate-600">{c.time}</span>
                      </div>
                      <p className="mt-1.5 truncate text-[12.5px] text-slate-400">{c.text}</p>
                      <p className="mt-1 font-mono text-[11px] text-emerald-300">{c.status}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">Thread — Gita R. <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">AI handling · warm lead</span></h3>
                <div className="mt-4 space-y-2.5">
                  <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-[13px] text-white">bholi 4 baje skin facial milcha?</div></div>
                  <div className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-slate-200">Namaste Gita ji 🙏 4:00 ra 5:30 khali cha. 4 baje book gardiu?</div></div>
                  <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-[13px] text-white">hus 4 baje ✅ deposit?</div></div>
                  <div className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-bl-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-[13px] text-emerald-100">Booked ✓ · eSewa Rs. 1,000 deposit link sent · reminder ON</div></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <input placeholder="Type to take over… (AI pauses)" className="input-field !pl-4" />
                  <button className="btn-primary shrink-0 !px-5">Send</button>
                </div>
                <p className="mt-2 text-[11.5px] text-slate-500">Taking over pauses AI for this thread · transcript saved to CRM.</p>
              </Card>
            </div>
          )}

          {/* ══ BOOKINGS ══ */}
          {tab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-bold text-white">Bookings</h2>
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[12px] text-violet-300">Google Calendar synced ✓</span>
                <button className="btn-secondary ml-auto !py-2">+ Manual booking</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {MOCK_BOOKINGS.map((b) => (
                  <Card key={b.who}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[15px] font-bold text-white">{b.who}</h3>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">{b.state}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-400">{b.service}</p>
                    <p className="mt-0.5 font-mono text-[12px] text-slate-300">{b.when}</p>
                    <p className="mt-2 text-[11.5px] text-slate-500">by {b.by} · reminders ON · waitlist backup ON</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ══ CONTACTS ══ */}
          {tab === 'contacts' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-xl font-bold text-white">Contacts <span className="text-sm font-normal text-slate-500">(mini-CRM)</span></h2>
                <input placeholder="Search name, tag, channel…" className="input-field ml-auto !w-64 !pl-4" />
              </div>
              <Card className="!p-0 overflow-hidden">
                {MOCK_CONTACTS.map((c, i) => (
                  <div key={c.name} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${i ? 'border-t border-white/5' : ''}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[12px] font-bold text-white">{c.name.slice(0, 1)}</span>
                    <div className="min-w-[180px]">
                      <div className="text-[13.5px] font-semibold text-white">{c.name}</div>
                      <div className="text-[11.5px] text-slate-500">{c.tag}</div>
                    </div>
                    <span className="font-mono text-[12px] text-emerald-300">{c.value}</span>
                    <span className="ml-auto text-[11.5px] text-slate-500">{c.last}</span>
                    <button className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-300 hover:bg-white/5">Open →</button>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ══ ANALYTICS ══ */}
          {tab === 'analytics' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">Funnel — inquiry → paid</h3>
                {[
                  ['Inquiries', '100%', 'w-full', '#8b5cf6'],
                  ['Replied < 8s', '96%', 'w-[96%]', '#06b6d4'],
                  ['Booked', '58%', 'w-[58%]', '#10b981'],
                  ['Showed up', '81% of booked', 'w-[47%]', '#f59e0b'],
                  ['Paid + reviewed', '34%', 'w-[34%]', '#ff5500'],
                ].map(([l, v, w, c]) => (
                  <div key={l} className="mt-3">
                    <div className="flex justify-between text-[12px]"><span className="text-slate-300">{l}</span><span className="font-mono text-slate-400">{v}</span></div>
                    <div className="mt-1 h-2.5 rounded-full bg-white/5"><div className={`h-full rounded-full ${w}`} style={{ background: c }} /></div>
                  </div>
                ))}
              </Card>
              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">Top objections (AI-heard)</h3>
                {[
                  ['“Price too high”', 6, 'Offer 3-part Khalti plan'],
                  ['“Location far?”', 4, 'Send map + parking video'],
                  ['“Need doctor female?”', 3, 'Route to Dr. Anisha slots'],
                ].map(([o, n, fix]) => (
                  <div key={o} className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                    <div className="flex justify-between text-[13px]"><span className="text-slate-200">{o}</span><span className="font-mono text-amber-300">{n}×</span></div>
                    <div className="mt-1 text-[12px] text-cyan-300">→ Fix: {fix}</div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ══ INTEGRATIONS ══ */}
          {tab === 'integrations' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {INTEGRATIONS.map((g) => {
                const on = connected[g.name] ?? false;
                return (
                  <Card key={g.name}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined rounded-xl border border-white/10 bg-white/5 p-2.5 text-[22px] text-cyan-300">{g.icon}</span>
                      <div>
                        <div className="text-[14px] font-semibold text-white">{g.name}</div>
                        <div className="text-[11.5px] text-slate-500">{g.desc}</div>
                      </div>
                      <span className="ml-auto"><Toggle on={on} onChange={(v) => setConnected((s) => ({ ...s, [g.name]: v }))} /></span>
                    </div>
                    <div className={`mt-3 text-[12px] font-medium ${on ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {on ? '● Connected — syncing' : '○ Disconnected — connect in 2 clicks'}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ══ BILLING ══ */}
          {tab === 'billing' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">Current plan — Growth</h3>
                <div className="mt-2 font-display text-3xl font-extrabold text-white">Rs. 9,999<span className="text-sm font-normal text-slate-500">/mo · yearly</span></div>
                <div className="mt-3">
                  <div className="flex justify-between text-[12px] text-slate-400"><span>Conversations: 6,240 / 10,000</span><span>62%</span></div>
                  <div className="mt-1 h-2.5 rounded-full bg-white/5"><div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div>
                </div>
                <div className="mt-4 space-y-2 text-[13px]">
                  {[['INV-2094 · Ashadh', 'Rs. 9,999 · Paid ✓'], ['INV-2081 · Jestha', 'Rs. 9,999 · Paid ✓']].map(([a, b]) => (
                    <div key={a} className="flex justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
                      <span className="text-slate-300">{a}</span><span className="font-mono text-emerald-300">{b}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">ROI this month</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">
                  AI influenced <strong className="text-white">Rs. 2,84,000</strong> across 96 held bookings + Rs. 84,000 recovered carts.
                  Plan cost Rs. 9,999 → <strong className="text-emerald-300">28.4× return.</strong> Skipping Growth would cost more than buying it.
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="btn-primary flex-1 !py-2.5">Upgrade to Scale</button>
                  <button className="btn-secondary flex-1 !py-2.5">Pay via eSewa</button>
                </div>
                <p className="mt-2.5 text-[11.5px] text-slate-500">VAT invoice · Khalti / bank transfer accepted · cancel anytime</p>
              </Card>
            </div>
          )}

          {/* ══ TEAM ══ */}
          {tab === 'team' && (
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="font-display text-[15px] font-bold text-white">Team · 3 seats used</h3>
                <button className="btn-secondary !py-2 !text-[12.5px]">+ Invite teammate</button>
              </div>
              {[
                [user?.name || 'You', user?.email || '', 'Owner · full access'],
                ['Reception Staff', 'frontdesk@business.com', 'Staff · inbox + bookings'],
                ['Accountant', 'accounts@business.com', 'Finance · billing only'],
              ].map(([n, e, r], i) => (
                <div key={e + i} className={`flex items-center gap-3 px-5 py-3.5 ${i ? 'border-t border-white/5' : 'border-t border-white/5'}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[12px] font-bold text-white">{String(n).slice(0, 1)}</span>
                  <div><div className="text-[13.5px] font-semibold text-white">{n}</div><div className="text-[11.5px] text-slate-500">{e}</div></div>
                  <span className="ml-auto rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">{r}</span>
                </div>
              ))}
            </Card>
          )}

          {/* ══ SETTINGS ══ */}
          {tab === 'settings' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="font-display text-[15px] font-bold text-white">Profile</h3>
                <div className="mt-3 space-y-2.5">
                  <div><label className="text-[12px] text-slate-400">Name</label><input defaultValue={user?.name || ''} className="input-field mt-1 !pl-4" /></div>
                  <div><label className="text-[12px] text-slate-400">Business</label><input defaultValue={user?.businessName || ''} className="input-field mt-1 !pl-4" /></div>
                  <div><label className="text-[12px] text-slate-400">Email</label><input defaultValue={user?.email || ''} disabled className="input-field mt-1 !pl-4 opacity-60" /></div>
                  <button className="btn-secondary w-full !py-2.5">Save changes</button>
                </div>
              </Card>
              <div className="space-y-4">
                <Card>
                  <h3 className="font-display text-[15px] font-bold text-white">Security</h3>
                  <p className="mt-1 text-[12.5px] text-slate-500">Sessions are httpOnly + revocable. Lost a device? Kill it here.</p>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-secondary flex-1 !py-2.5 !text-[12.5px]">Revoke other sessions</button>
                    <Link to="/forgot-password" className="btn-secondary flex-1 !py-2.5 !text-[12.5px] text-center">Change password</Link>
                  </div>
                </Card>
                <Card>
                  <h3 className="font-display text-[15px] font-bold text-white">API keys <span className="ml-1 rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] font-normal text-slate-400">Scale</span></h3>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-[12px] text-slate-300">
                    sk-live-••••••••••••3f9a
                    <button className="ml-auto text-cyan-300 hover:text-cyan-200">Copy</button>
                  </div>
                  <p className="mt-2 text-[11.5px] text-slate-500">Push bookings to your HIS / POS via webhooks.</p>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
