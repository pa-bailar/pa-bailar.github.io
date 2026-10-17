// The clock the unit tests run on, moved when CLOCK_AT is set (scripts/test-clock-ahead.mjs): every `new Date()` and
// `Date.now()` reads as that moment, still ticking, from before any module loads. Without CLOCK_AT, the real clock.
// Tests written against fixed dates while the code reads the clock passed until the calendar caught up with them,
// and then blocked the sweeps' data PRs: one after 10 Oct 2026, one only on Saturdays ("sáb").

const at = process.env.CLOCK_AT;
if (at) {
  const RealDate = Date;
  const offset = new RealDate(at).getTime() - RealDate.now();
  class ShiftedDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor> | []) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...(args as ConstructorParameters<DateConstructor>));
    }
    static override now(): number {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ShiftedDate as DateConstructor;
}
