import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuthStore } from '../store/useAuthStore';

export default function ForgotPassword() {
  const { forgotPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ loading: false, done: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, done: false, error: '' });
    try {
      await forgotPassword(email.trim());
      setState({ loading: false, done: true, error: '' });
    } catch (err) {
      const data = err?.response?.data;
      setState({
        loading: false, done: false,
        error: data?.errors?.[0]?.msg || data?.message || 'Could not send reset link. Try again.',
      });
    }
  };

  return (
    <AuthLayout title="Reset your password 🔐" subtitle="We email you a secure, single-use reset link.">
      {state.done ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-200">
          ✓ If <strong>{email}</strong> exists, a reset link is on its way. Check inbox + spam — links expire in 1 hour.
          <div className="mt-4"><Link to="/login" className="font-semibold underline underline-offset-4">← Back to sign in</Link></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          {state.error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">{state.error}</div>
          )}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Account email</label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">mail</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" className="input-field" />
            </div>
          </div>
          <button disabled={state.loading} className="btn-primary w-full !py-3.5">
            {state.loading ? 'Sending…' : 'Send reset link →'}
          </button>
          <p className="text-center text-[13px] text-slate-400">
            <Link to="/login" className="text-cyan-300 hover:text-cyan-200">← Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
