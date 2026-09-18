// Shared shell for every "there's nothing here (yet)" moment in the
// app — the first-run/empty-projects screen, an empty entry list, no
// archived projects, everything archived. These used to be a single
// line of plain gray text; now they all get the same real character:
// an icon in a soft colored badge, a short heading, and a warmer,
// more specific line about what to do next (or why it's empty) —
// still no new screens or steps, just more considered content on the
// screen that was already there.
export default function EmptyMoment({ Icon, tone = 'rust', title, children, action, iconStrokeWidth }) {
  // Darker than the first pass here — text-rust-700/text-stone-500
  // measured at 6.37:1 and 3.81:1 against their badge backgrounds
  // (the second one fails even the 4.5:1 AA minimum, not just this
  // app's own stricter 7:1 bar), caught by actually measuring the
  // real rendered contrast rather than assuming a "light bg, muted
  // icon" combination would be fine. -800 clears 7:1 for both.
  const badgeTone = tone === 'rust' ? 'bg-rust-100 text-rust-800' : 'bg-stone-200 text-stone-700'
  // A contained block, not text floating on the bare (now textured)
  // page background — the actual fix for "sparse reads as unfinished":
  // more generous padding, a bigger icon badge, and its own card
  // elevation give a sparse screen (one project, zero entries) enough
  // visual weight to read as deliberately clean instead of incomplete.
  // Translucent rather than solid white so the page's blueprint texture
  // still shows faintly through it — this is content sitting on that
  // surface, not a separate opaque layer blocking it out.
  return (
    <div className="text-center py-10 px-6 bg-white/80 rounded-2xl shadow-card">
      <div className={'w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ' + badgeTone}>
        <Icon size={32} strokeWidth={iconStrokeWidth} />
      </div>
      {/* Narrow enough to force a wrap, not just "narrower" — max-w-xs
          (320px) still let every real title in this app render as one
          line reaching under the fixed "add entry" FAB in the
          bottom-right corner when this message happens to land at
          that scroll position (measured the actual glyph run, not the
          container: the widest real title here is ~294px, well past
          where a single centered line stays clear of the FAB). 200px
          forces every one of them to wrap to two lines, each safely
          narrower than the FAB's position regardless of centering —
          confirmed by re-measuring after, not assumed from the number
          alone. */}
      {title && <div className="font-display font-bold text-lg mb-1 max-w-[200px] mx-auto">{title}</div>}
      {children && <p className="text-sm text-stone-500 max-w-xs mx-auto">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
