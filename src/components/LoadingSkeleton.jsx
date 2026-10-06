import Skeleton from './Skeleton'

// The shared skeleton shape for both of this app's "we don't know what
// to show yet" moments — AuthGate.jsx's session check (is anyone signed
// in?) and App.jsx's own initial data load (projects/entries). Doesn't
// try to guess overview vs. a single project (not knowable at either of
// those two points), just the generic page shape either one lands on.
export default function LoadingSkeleton() {
  return (
    <div className="max-w-md mx-auto bg-stone-50 bg-blueprint min-h-screen">
      <div className="px-4 py-3 flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-md" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="p-4">
        <Skeleton className="h-32 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-16 rounded-2xl mb-3" />
        <Skeleton className="h-16 rounded-2xl mb-3" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  )
}
