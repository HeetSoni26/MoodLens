import { Reveal } from './Section';

export default function FeatureHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Reveal className="mx-auto w-full max-w-6xl px-5 pt-28 sm:pt-32">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-aurora-violet/25 bg-aurora-violet/[0.08] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4b5fd]">
          {eyebrow}
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">{description}</p>
      </div>
    </Reveal>
  );
}
