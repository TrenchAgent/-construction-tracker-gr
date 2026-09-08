// Expense categories are deliberately kept to exactly these three — see the
// project handoff notes for why the original app's finer-grained material
// list was cut for v1.
export const EXPENSE_CATEGORIES = ['Υλικά', 'Εργατικά', 'Λοιπά']

// Darker than the usual Tailwind default (800→900, 700→800) on purpose —
// these are read outdoors, often in direct sunlight, where ordinary
// screen-contrast minimums (WCAG AA, 4.5:1) wash out badly. Verified
// against the actual background each sits on, not eyeballed: every pair
// here clears 7:1 (WCAG AAA) — see the contrast check in the commit this
// came from for the exact numbers.
export const CATEGORY_BADGE_STYLES = {
  Υλικά: 'bg-amber-100 text-amber-900',
  Εργατικά: 'bg-blue-100 text-blue-900',
  Λοιπά: 'bg-stone-200 text-stone-800',
}

export const VAT_RATE = 0.24

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid']

export const PAYMENT_STATUS_LABELS = {
  pending: 'Εκκρεμεί',
  partial: 'Μερική εξόφληση',
  paid: 'Εξοφλήθηκε',
}

// Same outdoor-contrast reasoning as CATEGORY_BADGE_STYLES above.
export const PAYMENT_STATUS_BADGE_STYLES = {
  pending: 'bg-rose-100 text-rose-900',
  partial: 'bg-amber-100 text-amber-900',
  paid: 'bg-emerald-100 text-emerald-900',
}

// Optional — not every entry needs a recorded payment method, so unlike
// payment status there's no default; '' means "not set".
export const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'check']

export const PAYMENT_METHOD_LABELS = {
  cash: 'Μετρητά',
  transfer: 'Κατάθεση',
  card: 'Κάρτα',
  check: 'Επιταγή',
}

export const COLLABORATOR_ROLES = ['viewer', 'editor']

export const COLLABORATOR_ROLE_LABELS = {
  viewer: 'Προβολή',
  editor: 'Επεξεργασία',
}
