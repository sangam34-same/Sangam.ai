import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../store/useAuthStore';

// Internal ops console. Deliberately linked NOWHERE in public UI —
// admins reach it via direct URL; everyone else gets bounced by AdminRoute
// and 403'd by the API. Obscurity is not the defense; requireRole is.
export default function Admin() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError('');
    try {
      const [s, u] = await Promise.all([
        adminApi.stats(),
        adminApi.users({ q, limit: 50 }),
      ]);
      setStats(s.data);
      setUsers(u.data.users);
      setTotal(u.data.total);
    } catch (err) {
      setError(err?.response?.status === 403 ? 'Forbidden: admin role required.' : 'Failed to load console.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Ops Console — Sangam.ai';
    load();
    const t = setTimeout(() => {}, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(query), 400);
    return () => clearTimeout(t);
  }, [query, load]);

  const act = async (id, fn, label) => {
    if (!window.confirm(`${label} — are you sure?`)) return;
    setBusyId(id + label);
    setNotice('');
    try {
      const res = await fn();
      setNotice(res.message || 'Done.');
      load(query);
    } catch (err) {
      setNotice('');
      setError(err?.response?.data?.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-200">
      <header className="border-b border-red-500/20 bg-[#0c0708]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-600 font-display text-lg font-extrabold text-white">◈</span>
          <div>
            <div className="font-display text-[15px] font-bold text-white">Ops Console <span className="ml-1 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">Restricted</span></div>
            <div className="text-[11.5px] text-slate-500">Signed in as {user?.email} · every action is audit-logged</div>
          </div>
          <Link to="/dashboard" className="btn-secondary ml-auto !py-2 !text-[12.5px]">← Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">{error}</div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-200">{notice}</div>
        )}

        {/* stats */}
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {loading && !stats ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-[#101016] p-6 text-sm text-slate-500">Loading fleet metrics…</div>
          ) : stats && (
            [
              ['Users', stats.totalUsers, 'group'],
              ['New today', stats.newToday, 'person_add'],
              ['New / 7d', stats.newWeek, 'trending_up'],
              ['Admins', stats.admins, 'shield_person'],
              ['Locked', stats.locked, 'lock'],
              ['Live sessions', stats.activeSessions, 'bolt'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#101016] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-medium text-slate-500">{label}</span>
                  <span className="material-symbols-outlined text-[18px] text-slate-500">{icon}</span>
                </div>
                <div className="mt-1 font-display text-2xl font-extrabold text-white">{value}</div>
              </div>
            ))
          )}
        </div>

        {/* users */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101016]">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <h2 className="font-display text-[15px] font-bold text-white">Users <span className="ml-1 font-mono text-[12px] font-normal text-slate-500">{total} total</span></h2>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="input-field ml-auto !w-64 !pl-4"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Joined</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const locked = u.lockUntil && new Date(u.lockUntil) > new Date();
                  const isSelf = u.id === user?.id || u.email === user?.email;
                  return (
                    <tr key={u.id || u.email} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-[12px] text-slate-500">{u.email}{u.businessName ? ` · ${u.businessName}` : ''}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${u.role === 'admin' ? 'bg-red-500/10 text-red-300' : 'bg-white/5 text-slate-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-3">
                        {locked ? <span className="font-mono text-[12px] text-amber-300">● locked</span> : <span className="font-mono text-[12px] text-emerald-300">● active</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          {!isSelf && (
                            <>
                              <button
                                disabled={busyId}
                                onClick={() => act(u.id, () => adminApi.setRole(u.id, u.role === 'admin' ? 'user' : 'admin'), u.role === 'admin' ? 'Demote to user' : 'Promote to admin')}
                                title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] text-slate-300 hover:bg-white/5"
                              >
                                {u.role === 'admin' ? 'Demote' : 'Make admin'}
                              </button>
                              <button
                                disabled={busyId}
                                onClick={() => act(u.id, () => adminApi.revokeSessions(u.id), 'Revoke ALL sessions')}
                                title="Revoke all sessions"
                                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] text-slate-300 hover:bg-white/5"
                              >
                                Kick
                              </button>
                              {locked ? (
                                <button
                                  disabled={busyId}
                                  onClick={() => act(u.id, () => adminApi.unlock(u.id), 'Unlock account')}
                                  className="rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-[11.5px] text-emerald-300 hover:bg-emerald-500/10"
                                >
                                  Unlock
                                </button>
                              ) : (
                                <button
                                  disabled={busyId}
                                  onClick={() => act(u.id, () => adminApi.lock(u.id), 'Lock account 30 min + revoke sessions')}
                                  className="rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-[11.5px] text-amber-300 hover:bg-amber-500/10"
                                >
                                  Lock
                                </button>
                              )}
                            </>
                          )}
                          {isSelf && <span className="text-[11.5px] text-slate-600">you</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-slate-500">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11.5px] text-slate-600">
          Self-demotion and self-lock are blocked server-side. Role changes and revocations write to the audit log with your admin ID.
        </p>
      </main>
    </div>
  );
}
