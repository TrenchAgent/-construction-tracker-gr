// Expense categories are deliberately kept to exactly these three — see the
// project handoff notes for why the original app's finer-grained material
// list was cut for v1.
export const EXPENSE_CATEGORIES = ['Υλικά', 'Εργατικά', 'Λοιπά']

export const CATEGORY_BADGE_STYLES = {
  Υλικά: 'bg-amber-100 text-amber-800',
  Εργατικά: 'bg-blue-100 text-blue-800',
  Λοιπά: 'bg-stone-200 text-stone-700',
}

export const VAT_RATE = 0.24

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid']

export const PAYMENT_STATUS_LABELS = {
  pending: 'Εκκρεμεί',
  partial: 'Μερική εξόφληση',
  paid: 'Εξοφλήθηκε',
}

export const PAYMENT_STATUS_BADGE_STYLES = {
  pending: 'bg-rose-100 text-rose-700',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
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
