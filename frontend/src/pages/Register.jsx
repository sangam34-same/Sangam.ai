import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuthStore } from '../store/useAuthStore';

function scorePassword(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['bg-white/10', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-emerald-500'];

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    name: '', businessName: '', email: '', phone: '',
    password: '', confirmPassword: '', terms: false,
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Your name is required.');
    if (!form.email.trim()) return setError('Work email is required.');
    if (form.phone && !/^\+[1-9]\d{1,14}$/.test(form.phone.trim())) {
      return setError('Phone must be in E.164 format — e.g. +9779800000000.');
    }
    if (!form.password) return setError('Password is required.');
    if (form.password.length < 12) return setError('Password must be at least 12 characters.');
    if (!/[A-Z]/.test(form.password)) return setError('Password needs at least one UPPERCASE letter.');
    if (!/[a-z]/.test(form.password)) return setError('Password needs at least one lowercase letter.');
    if (!/[0-9]/.test(form.password)) return setError('Password needs at least one number.');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password)) return setError('Password needs at least one symbol (e.g. ! # $).');
    if (strength < 3) return setError('Password is too guessable — make it longer and less predictable.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (!form.terms) return setError('Please accept the Terms & Privacy Policy.');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        terms: true,
        ...(form.businessName.trim() ? { businessName: form.businessName.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      };
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (!err?.response) {
        setError('Cannot reach the server. Start the backend first (see below).');
        return;
      }
      const data = err.response.data;
      const msg = data?.errors?.length
        ? data.errors.map((x) => x.msg || x.message).join(' · ')
        : data?.message || 'Registration failed. Try a different email.';
      setError(msg);
    }
  };

  return (
    <AuthLayout
      title="Hire AI in 60 seconds ⚡"
      subtitle="14-day free trial · no credit card · live in 48 hours."
    >
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Your name *</label>
            <input value={form.name} onChange={set('name')} placeholder="Asha Sharma" autoComplete="name" className="input-field !pl-4" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Business</label>
            <input value={form.businessName} onChange={set('businessName')} placeholder="Himal Dental" autoComplete="organization" className="input-field !pl-4" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Work email *</label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">mail</span>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" autoComplete="email" className="input-field" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">
            WhatsApp number <span className="font-normal text-slate-500">(E.164 — e.g. +9779800000000)</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">call</span>
            <input value={form.phone} onChange={set('phone')} placeholder="+9779800000000" autoComplete="tel" className="input-field" />
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Password *</label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500">lock</span>
              <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Min. 12 characters" autoComplete="new-password" className="input-field pr-11" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label="Toggle password">
                <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i < strength ? STRENGTH_COLOR[strength] : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="mt-1 text-[11.5px] text-slate-500">{STRENGTH[strength]} — mix Aa, 0-9, symbols for best security</p>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-slate-300">Confirm *</label>
            <input type={show ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" className="input-field !pl-4" />
            {form.confirmPassword && (
              <p className={`mt-1.5 text-[11.5px] ${form.password === form.confirmPassword ? 'text-emerald-300' : 'text-rose-300'}`}>
                {form.password === form.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
              </p>
            )}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-slate-400">
          <input type="checkbox" checked={form.terms} onChange={set('terms')} className="mt-0.5 h-4 w-4 rounded accent-violet-500" />
          <span>I agree to the <span className="text-slate-200 underline underline-offset-2">Terms</span> and <span className="text-slate-200 underline underline-offset-2">Privacy Policy</span>. I understand AI replies are grounded in my business data.</span>
        </label>

        <button disabled={isLoading} className="btn-primary shimmer-btn w-full !py-3.5">
          {isLoading ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Creating your workspace…</>
          ) : 'Create account — start free trial →'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13.5px] text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">Sign in →</Link>
      </p>
    </AuthLayout>
  );
}
