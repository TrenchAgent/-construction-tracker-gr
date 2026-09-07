import { useEffect, useState } from 'react'
import { X, ImageOff } from 'lucide-react'
import { getReceiptUrl } from '../lib/storage'

// Small clickable thumbnail for a receipt photo — tap it to see the full
// size image in a lightbox. Storage is private (see supabase/schema.sql),
// so there's no plain public URL to just drop into an <img src> — a
// fresh signed URL is fetched on mount instead, valid only for a while
// and never cached anywhere.
export default function ReceiptThumbnail({ path, size = 44 }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // `path` never actually changes for an already-mounted instance in
    // this app (each thumbnail is keyed by entry, not given a new path
    // prop in place) — no need to reset url/failed back to their initial
    // values here, only to set them once the fetch settles.
    let cancelled = false
    getReceiptUrl(path)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0"
        title="Η φωτογραφία δεν φορτώθηκε"
      >
        <ImageOff size={16} />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => url && setExpanded(true)}
        style={{ width: size, height: size }}
        className="rounded-lg overflow-hidden border border-stone-200 shrink-0 bg-stone-100"
        aria-label="Προβολή απόδειξης"
      >
        {url ? (
          <img src={url} alt="Απόδειξη" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full animate-pulse bg-stone-200" />
        )}
      </button>

      {expanded && url && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 text-white/80 p-2"
            aria-label="Κλείσιμο"
          >
            <X size={22} />
          </button>
          <img
            src={url}
            alt="Απόδειξη"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
