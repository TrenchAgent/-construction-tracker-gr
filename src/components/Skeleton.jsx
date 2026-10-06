// A plain shimmering rounded block — the shared building block for every
// loading skeleton in the app (see App.jsx's top-level loading screen).
// One component so every skeleton shares the same shimmer timing/colors
// instead of each screen inventing its own. prefers-reduced-motion turns
// the shimmer into a static two-tone block (see index.css's .skeleton
// rule) rather than removing the component's sizing entirely — the
// placeholder shape itself isn't motion, only the shimmer sweep is.
export default function Skeleton({ className = '' }) {
  return <div className={'skeleton rounded-lg ' + className} />
}
