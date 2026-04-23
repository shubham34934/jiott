import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";

export default function RatingInfoPage() {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border">
        <Link href="/profile/settings" className="p-1" aria-label="Back">
          <ArrowLeft size={22} className="text-text-primary" />
        </Link>
        <h1 className="text-lg font-bold text-text-primary">
          How ratings work
        </h1>
      </div>

      <div className="px-4 pt-6 pb-12 space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-secondary to-primary p-6 text-white shadow-[0_12px_40px_-12px_rgba(94,158,255,0.45)]">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            Starting rating
          </p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums">1000</p>
          <p className="mt-3 text-sm opacity-90">
            Every player begins with 1000 points.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary mb-3">
            After a match
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border-2 border-success bg-success/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success text-white">
                  <Plus size={16} strokeWidth={3} />
                </div>
                <p className="text-sm font-bold text-text-primary">Win</p>
              </div>
              <p className="text-xs text-text-primary">
                You gain points.
              </p>
            </div>
            <div className="rounded-xl border-2 border-danger bg-danger/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white">
                  <Minus size={16} strokeWidth={3} />
                </div>
                <p className="text-sm font-bold text-text-primary">Lose</p>
              </div>
              <p className="text-xs text-text-primary">
                You lose points.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary mb-2">
            The stronger the opponent, the bigger the reward
          </h2>
          <p className="text-sm text-neutral mb-4">
            Beating a higher-rated player gives you more points. Beating a
            lower-rated player gives you fewer points.
          </p>

          <div className="space-y-3">
            <ExampleRow
              youRating={1000}
              oppRating={1000}
              outcome="win"
              yourDelta={16}
              caption="Equal rating · you win"
            />
            <ExampleRow
              youRating={1000}
              oppRating={1200}
              outcome="win"
              yourDelta={24}
              caption="Stronger opponent · you win"
            />
            <ExampleRow
              youRating={1200}
              oppRating={1000}
              outcome="win"
              yourDelta={8}
              caption="Weaker opponent · you win"
            />
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-text-primary mb-2">
            Losing works the same way
          </h2>
          <p className="text-sm text-neutral mb-4">
            Losing to a stronger player costs fewer points. Losing to a
            weaker player costs more.
          </p>

          <div className="space-y-3">
            <ExampleRow
              youRating={1000}
              oppRating={1200}
              outcome="lose"
              yourDelta={-8}
              caption="Stronger opponent · you lose"
            />
            <ExampleRow
              youRating={1200}
              oppRating={1000}
              outcome="lose"
              yourDelta={-24}
              caption="Weaker opponent · you lose"
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-base font-bold text-text-primary mb-2">
            Good to know
          </h2>
          <ul className="space-y-2 text-sm text-text-primary">
            <li className="flex gap-2">
              <span className="text-primary font-bold">·</span>
              <span>Friendly matches don&apos;t change your rating.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">·</span>
              <span>
                Only matches marked as ranked count toward your rating.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">·</span>
              <span>
                In doubles, your team&apos;s combined rating decides the
                swing.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function ExampleRow({
  youRating,
  oppRating,
  outcome,
  yourDelta,
  caption,
}: {
  youRating: number;
  oppRating: number;
  outcome: "win" | "lose";
  yourDelta: number;
  caption: string;
}) {
  const youNew = youRating + yourDelta;
  const oppNew = oppRating - yourDelta;
  const youColor = yourDelta >= 0 ? "text-success" : "text-danger";
  const oppColor = -yourDelta >= 0 ? "text-success" : "text-danger";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-neutral mb-3">{caption}</p>
      <div className="grid grid-cols-2 gap-4">
        <Side
          label="You"
          rating={youRating}
          newRating={youNew}
          delta={yourDelta}
          color={youColor}
          highlight={outcome === "win"}
        />
        <Side
          label="Opponent"
          rating={oppRating}
          newRating={oppNew}
          delta={-yourDelta}
          color={oppColor}
          highlight={outcome === "lose"}
        />
      </div>
    </div>
  );
}

function Side({
  label,
  rating,
  newRating,
  delta,
  color,
  highlight,
}: {
  label: string;
  rating: number;
  newRating: number;
  delta: number;
  color: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 text-center ${
        highlight ? "bg-success/10 ring-1 ring-success/35" : "bg-background"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
        {label}
      </p>
      <p className="mt-1 text-xs text-neutral tabular-nums">{rating}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${color}`}>
        {delta > 0 ? "+" : ""}
        {delta}
      </p>
      <p className="mt-1 text-xs text-neutral tabular-nums">
        → <span className="font-bold text-text-primary">{newRating}</span>
      </p>
    </div>
  );
}
