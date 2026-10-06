import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuthStore } from '../store/useAuthStore';

function fieldError(err) {
  // backend validateRequest shape may be { errors: [...] } or message
  const data = err?.response?.data;
  if (!data) return 'Network error. Is the backend running on :5000?';
  if (data.errors && Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg || e.message).join(' · ');
  }
  return data.message || 'Login failed. Check your credentials.';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const from = location.state?.from?.pathname || '/dashboard';

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    try {
      await login({ email: form.email.trim(), password: form.password, rememberMe: !!form.rememberMe });
      navigate(from, { replace: true });
    } catch (err) {
      setError(fieldError(err));
    }
  };

  return (
    <AuthLayout title="Welcome back 👋" subtitle="Your AI employees kept working while you were away.">
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Work email</label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">mail</span>
            <input
              type="email" autoComplete="email" placeholder="you@business.com"
              value={form.email} onChange={set('email')}
              className="input-field"
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[12.5px] font-medium text-slate-300">Password</label>
            <Link to="/forgot-password" className="text-[12.5px] font-medium text-cyan-300 hover:text-cyan-200">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">lock</span>
            <input
              type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              value={form.password} onChange={set('password')}
              className="input-field pr-11"
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label="Toggle password">
              <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-400">
          <input type="checkbox" checked={form.rememberMe} onChange={set('rememberMe')} className="h-4 w-4 rounded accent-violet-500" />
          Keep me signed in for 30 days
          <span className="ml-auto hidden items-center gap-1 text-[11.5px] text-slate-500 sm:flex">
            <span className="material-symbols-outlined text-[14px]">shield</span> Secure session
          </span>
        </label>

        <button disabled={isLoading} className="btn-primary shimmer-btn w-full !py-3.5">
          {isLoading ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Signing in…</>
          ) : 'Sign in →'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] text-slate-600">
        <span className="h-px flex-1 bg-white/10" /> 2FA via authenticator on Scale plans <span className="h-px flex-1 bg-white/10" />
      </div>

      <p className="text-center text-[13.5px] text-slate-400">
        New to Sangam?{' '}
        <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Start 14-day free trial →
        </Link>
      </p>
    </AuthLayout>
  );
}
