// A plain, on-brand fallback for a React render crash Sentry.ErrorBoundary
// catches (see main.jsx) — the alternative is a blank white screen, which
// for someone standing on a jobsite mid-entry is a lot scarier than a
// short message and a button. Sentry.ErrorBoundary already reports the
// error itself; nothing to do here beyond showing this.
export default function CrashFallback() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-stone-700 font-medium mb-2">Κάτι πήγε στραβά.</p>
      <p className="text-stone-500 text-sm mb-4">
        Το σφάλμα καταγράφηκε. Δοκιμάστε να ανανεώσετε τη σελίδα.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-rust-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
      >
        Ανανέωση
      </button>
    </div>
  )
}
