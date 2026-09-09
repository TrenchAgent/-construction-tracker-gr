import {
  Package,
  Hammer,
  MoreHorizontal,
  Clock,
  CircleDashed,
  CheckCircle2,
  Banknote,
  Landmark,
  CreditCard,
  FileSignature,
  Eye,
  Pencil,
} from 'lucide-react'

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

// One icon per category, so the category picker (QuickAddModal) and its
// badges (EntryList) are scannable by shape, not just by reading the
// label — Hammer for labor rather than the obvious HardHat, since that
// icon is already the app's own logo elsewhere and would read as "this
// is the app," not "this entry is labor," right next to it.
export const CATEGORY_ICONS = {
  Υλικά: Package,
  Εργατικά: Hammer,
  Λοιπά: MoreHorizontal,
}

// The picker's *selected* fill — a solid, darker version of the same
// hue as CATEGORY_BADGE_STYLES above (not a new color system), so
// picking "Υλικά" here and seeing its amber badge on the entry right
// after reads as the same color, not a coincidence. Calibrated for
// white text/icon on top, not for text-on-white like the badges are —
// verified for contrast the same way as everything else in this app,
// see the commit this came from for the exact numbers.
export const CATEGORY_SELECTED_STYLES = {
  Υλικά: 'bg-amber-800',
  Εργατικά: 'bg-blue-800',
  Λοιπά: 'bg-stone-700',
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

export const PAYMENT_STATUS_ICONS = {
  pending: Clock,
  partial: CircleDashed,
  paid: CheckCircle2,
}

// Same reasoning as CATEGORY_SELECTED_STYLES above — a solid version of
// the same hue PAYMENT_STATUS_BADGE_STYLES already uses.
export const PAYMENT_STATUS_SELECTED_STYLES = {
  pending: 'bg-rose-800',
  partial: 'bg-amber-800',
  paid: 'bg-emerald-800',
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

// No pre-existing badge color for payment method (EntryList shows it as
// a plain neutral chip) — so unlike category/status above, its picker's
// selected state uses the app's own primary accent (rust) rather than
// inventing a fourth unrelated color system for something that never
// carried its own meaningful hue in the first place.
export const PAYMENT_METHOD_ICONS = {
  cash: Banknote,
  transfer: Landmark,
  card: CreditCard,
  check: FileSignature,
}

export const COLLABORATOR_ROLES = ['viewer', 'editor']

export const COLLABORATOR_ROLE_LABELS = {
  viewer: 'Προβολή',
  editor: 'Επεξεργασία',
}

export const COLLABORATOR_ROLE_ICONS = {
  viewer: Eye,
  editor: Pencil,
}
