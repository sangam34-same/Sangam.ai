import Reveal from './Reveal';

export default function SectionHeading({ eyebrow, title, sub, align = 'center' }) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <Reveal className={`max-w-3xl ${alignCls}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
          {eyebrow}
        </span>
      )}
      <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.75rem] text-balance">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-slate-400">{sub}</p>}
    </Reveal>
  );
}
