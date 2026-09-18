// The one genuinely custom visual asset in the app, replacing a stock
// lucide icon (HardHat) in the header — worth a real, considered shape
// rather than whatever icon set happened to have something
// construction-adjacent. A carpenter's/framing square: the actual tool
// used to mark and check right angles on site, and — deliberately —
// also the classic technical-drawing instrument, tying it to the same
// blueprint/site-plan identity as the page background texture. Two
// earlier attempts are why this ended up this simple: a stroke-based
// abstracted tower crane (mast/jib/hook) read as a flag or signpost
// once actually rendered at real header size, and a 3-bar "skyline"
// read as a generic bar-chart icon, not a building — both found by
// rendering them close to true size and looking, not by eyeballing
// the path data. A bold filled L, with two small graduation-mark
// cutouts as the one bit of extra detail, reads unambiguously at
// every size tried, from a 24px header down.
export default function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 3h4v14h14v4H3z M4.3 9.3h1.4v1.4h-1.4z M13.3 17.6h1.4v1.8h-1.4z"
      />
    </svg>
  )
}
