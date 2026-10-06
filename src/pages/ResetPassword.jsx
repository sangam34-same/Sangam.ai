import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuthStore } from '../store/useAuthStore';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [state, setState] = useState({ loading: false, error: '', done: false });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.password) return setState((s) => ({ ...s, error: 'New password is required.' }));
    if (form.password !== form.confirmPassword) {
      return setState((s) => ({ ...s, error: 'Passwords do not match.' }));
    }
    setState({ loading: true, error: '', done: false });
    try {
      await resetPassword(token, form.password, form.confirmPassword);
      setState({ loading: false, error: '', done: true });
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      const data = err?.response?.data;
      setState({
        loading: false, done: false,
        error: data?.errors?.[0]?.msg || data?.message || 'Reset failed — link may be expired.',
      });
    }
  };

  return (
    <AuthLayout title="Choose a new password ✨" subtitle="Make it long, unique, and yours alone.">
      {state.done ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
          ✓ Password reset! Redirecting you to sign in…
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          {state.error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">{state.error}</div>
          )}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">New password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" autoComplete="new-password" className="input-field !pl-4" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Confirm new password</label>
            <input type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat password" autoComplete="new-password" className="input-field !pl-4" />
          </div>
          <button disabled={state.loading} className="btn-primary w-full !py-3.5">
            {state.loading ? 'Resetting…' : 'Reset password →'}
          </button>
          <p className="text-center text-[13px] text-slate-400">
            <Link to="/login" className="text-cyan-300 hover:text-cyan-200">← Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
