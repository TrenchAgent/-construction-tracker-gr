import { WifiOff, TriangleAlert, Trash2, Copy, ArrowUpCircle, Percent, Receipt, SearchX } from 'lucide-react'
import {
  CATEGORY_BADGE_STYLES,
  CATEGORY_ICONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_STYLES,
  PAYMENT_STATUS_ICONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
} from '../constants'
import { formatEUR } from '../lib/format'
import ReceiptThumbnail from './ReceiptThumbnail'
import EmptyMoment from './EmptyMoment'

// Every badge icon in this row uses the same 11px size — matches the
// two sync-state badges (WifiOff/TriangleAlert) that already had icons
// before this pass, so the new ones don't look like they're from a
// different, slightly-mismatched icon set sitting right next to them.
const BADGE_ICON_SIZE = 11

export default function EntryList({ entries, filtersActive, canEdit, onEdit, onDuplicate, onDelete }) {
  if (entries.length === 0) {
    // Two genuinely different situations, given two different icons on
    // purpose — "nothing recorded yet" (an invitation to add the first
    // one) reads very differently from "nothing matches right now" (a
    // search came up empty), and conflating them into one generic
    // message was exactly the "flat" complaint this pass is fixing.
    return filtersActive ? (
      <EmptyMoment Icon={SearchX} tone="stone" title="Καμία καταχώρηση δεν ταιριάζει">
        Δοκιμάστε διαφορετικά φίλτρα ή αναζήτηση.
      </EmptyMoment>
    ) : (
      <EmptyMoment Icon={Receipt} title="Δεν έχετε καταχωρήσεις ακόμα">
        Πατήστε το «+» για να προσθέσετε την πρώτη καταχώρηση αυτού του έργου.
      </EmptyMoment>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => {
        // A not-yet-synced (or failed-to-sync) entry only exists locally —
        // there's no real row to edit yet, so tapping it to open the edit
        // form isn't offered. Deleting it is still fine either way (see
        // App.jsx's deleteEntry): that just drops it from the local queue.
        const rowCanEdit = canEdit && !e.pendingSync && !e.syncFailed
        const CategoryIcon = CATEGORY_ICONS[e.category]
        const StatusIcon = PAYMENT_STATUS_ICONS[e.paymentStatus]
        const MethodIcon = PAYMENT_METHOD_ICONS[e.paymentMethod]
        const details = (
          <>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {e.kind === 'expense' ? (
                <span
                  className={
                    'text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ' +
                    (CATEGORY_BADGE_STYLES[e.category] || 'bg-stone-200 text-stone-700')
                  }
                >
                  {CategoryIcon && <CategoryIcon size={BADGE_ICON_SIZE} />}
                  {e.category}
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-900 inline-flex items-center gap-1">
                  <ArrowUpCircle size={BADGE_ICON_SIZE} />
                  Είσπραξη
                </span>
              )}
              {e.vat && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 inline-flex items-center gap-1">
                  <Percent size={BADGE_ICON_SIZE} />
                  με ΦΠΑ
                </span>
              )}
              {e.paymentMethod && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 inline-flex items-center gap-1">
                  {MethodIcon && <MethodIcon size={BADGE_ICON_SIZE} />}
                  {PAYMENT_METHOD_LABELS[e.paymentMethod] || e.paymentMethod}
                </span>
              )}
              {e.paymentStatus && (
                <span
                  className={
                    'text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ' +
                    (PAYMENT_STATUS_BADGE_STYLES[e.paymentStatus] || 'bg-stone-100 text-stone-500')
                  }
                >
                  {StatusIcon && <StatusIcon size={BADGE_ICON_SIZE} />}
                  {PAYMENT_STATUS_LABELS[e.paymentStatus] || e.paymentStatus}
                </span>
              )}
              {e.pendingSync && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                  <WifiOff size={BADGE_ICON_SIZE} />
                  θα συγχρονιστεί όταν επανέλθει το δίκτυο
                </span>
              )}
              {e.syncFailed && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 inline-flex items-center gap-1">
                  <TriangleAlert size={BADGE_ICON_SIZE} />
                  απέτυχε η αποστολή
                </span>
              )}
            </div>
            <div className="text-sm truncate">{e.note}</div>
            <div className="text-xs text-stone-400 mt-0.5">
              {e.vendor ? e.vendor + ' · ' : ''}
              {e.date}
            </div>
          </>
        )
        return (
          <div
            key={e.id}
            className="bg-white border border-stone-200 rounded-xl p-3 flex items-start gap-3"
          >
            {e.receiptPath && <ReceiptThumbnail path={e.receiptPath} />}
            {rowCanEdit ? (
              <button onClick={() => onEdit(e)} className="flex-1 min-w-0 text-left">
                {details}
              </button>
            ) : (
              <div className="flex-1 min-w-0">{details}</div>
            )}
            <div className="text-right shrink-0">
              {/* Darker + bolder than a typical amount display on purpose
                  — the single most important number on this row, and the
                  one most often read outdoors in direct sunlight. */}
              <div
                className={
                  'font-display font-bold text-lg tabular-nums ' +
                  (e.kind === 'income' ? 'text-emerald-800' : 'text-rose-800')
                }
              >
                {e.kind === 'income' ? '+' : '-'}
                {formatEUR(e.amount)}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 justify-end mt-1 -mr-1.5">
                  <button
                    onClick={() => onDuplicate(e)}
                    className="text-stone-500 hover:text-rust-700 active:bg-stone-100 text-xs inline-flex items-center gap-1 py-2.5 px-1.5 rounded-lg"
                  >
                    <Copy size={13} />
                    Αντιγραφή
                  </button>
                  <button
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Διαγραφή της καταχώρησης «${e.note}» (${formatEUR(e.amount)}); ` +
                          'Μπορείτε να την αναιρέσετε για λίγα δευτερόλεπτα μετά.',
                      )
                      if (confirmed) onDelete(e.id)
                    }}
                    className="text-stone-500 hover:text-rose-600 active:bg-stone-100 text-xs inline-flex items-center gap-1 py-2.5 px-1.5 rounded-lg"
                  >
                    <Trash2 size={13} />
                    Διαγραφή
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
