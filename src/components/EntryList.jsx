import { WifiOff, TriangleAlert, Trash2 } from 'lucide-react'
import {
  CATEGORY_BADGE_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_STYLES,
  PAYMENT_METHOD_LABELS,
} from '../constants'
import { formatEUR } from '../lib/format'
import ReceiptThumbnail from './ReceiptThumbnail'

export default function EntryList({ entries, canEdit, onEdit, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-stone-400 text-center py-10">
        Δεν υπάρχουν καταχωρήσεις ακόμα.
      </div>
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
        const details = (
          <>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {e.kind === 'expense' ? (
                <span
                  className={
                    'text-[11px] px-2 py-0.5 rounded-full font-medium ' +
                    (CATEGORY_BADGE_STYLES[e.category] || 'bg-stone-200 text-stone-700')
                  }
                >
                  {e.category}
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                  Είσπραξη
                </span>
              )}
              {e.vat && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                  με ΦΠΑ
                </span>
              )}
              {e.paymentMethod && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                  {PAYMENT_METHOD_LABELS[e.paymentMethod] || e.paymentMethod}
                </span>
              )}
              {e.paymentStatus && (
                <span
                  className={
                    'text-[11px] px-2 py-0.5 rounded-full font-medium ' +
                    (PAYMENT_STATUS_BADGE_STYLES[e.paymentStatus] || 'bg-stone-100 text-stone-500')
                  }
                >
                  {PAYMENT_STATUS_LABELS[e.paymentStatus] || e.paymentStatus}
                </span>
              )}
              {e.pendingSync && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                  <WifiOff size={11} />
                  θα συγχρονιστεί όταν επανέλθει το δίκτυο
                </span>
              )}
              {e.syncFailed && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 inline-flex items-center gap-1">
                  <TriangleAlert size={11} />
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
              <div
                className={
                  'font-semibold text-sm ' +
                  (e.kind === 'income' ? 'text-emerald-700' : 'text-rose-700')
                }
              >
                {e.kind === 'income' ? '+' : '-'}
                {formatEUR(e.amount)}
              </div>
              {canEdit && (
                <button
                  onClick={() => onDelete(e.id)}
                  className="text-stone-300 hover:text-rose-600 mt-1 text-xs inline-flex items-center gap-0.5"
                >
                  <Trash2 size={11} />
                  Διαγραφή
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
