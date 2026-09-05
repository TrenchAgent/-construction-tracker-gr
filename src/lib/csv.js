// CSV export for a project's entries. A few deliberate choices here that
// aren't obvious from the code alone:
//
// - Semicolon as the field delimiter, not comma. Greek-locale Excel (and
//   Windows generally) treats "," as the decimal separator, so its CSV
//   import expects ";" between fields — a comma-delimited file with
//   comma-decimal numbers is ambiguous and Excel mangles it. Semicolon +
//   comma-decimals is what Greek Excel actually expects.
// - A UTF-8 BOM (U+FEFF) at the very start of the file. Without it, Excel
//   on Windows guesses the file's encoding from the system codepage
//   instead of assuming UTF-8, and Greek characters come out as garbage.
// - CRLF line endings — the actual CSV spec, and safest for Windows Excel.

const DELIMITER = ';'

const KIND_LABELS = { expense: 'Έξοδο', income: 'Είσπραξη' }

function escapeField(value) {
  const str = String(value ?? '')
  if (str.includes(DELIMITER) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function formatAmount(amount) {
  return amount.toFixed(2).replace('.', ',')
}

function formatDateGr(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export function entriesToCsv(entries) {
  const headers = ['Τύπος', 'Κατηγορία', 'Προμηθευτής', 'Σημείωση', 'Ποσό', 'ΦΠΑ', 'Ημερομηνία']
  const rows = entries.map((e) => [
    KIND_LABELS[e.kind] || e.kind,
    e.category,
    e.vendor || '',
    e.note,
    formatAmount(e.amount),
    e.vat ? 'Ναι' : 'Όχι',
    formatDateGr(e.date),
  ])
  const lines = [headers, ...rows].map((cols) => cols.map(escapeField).join(DELIMITER))
  const BOM = String.fromCharCode(0xfeff)
  return BOM + lines.join('\r\n') + '\r\n'
}

// Filenames only — never touches the CSV content, which stays fully Greek.
// Kept to plain ASCII on purpose: non-ASCII `download` attribute values are
// standard and well-supported in real browsers, but there's no good way to
// verify that from here, and an ASCII filename sidesteps the question
// entirely at zero cost (nothing about the data is affected).
const GREEK_TO_LATIN = {
  α: 'a', ά: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', έ: 'e', ζ: 'z',
  η: 'i', ή: 'i', θ: 'th', ι: 'i', ί: 'i', ϊ: 'i', ΐ: 'i', κ: 'k',
  λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', ό: 'o', π: 'p', ρ: 'r',
  σ: 's', ς: 's', τ: 't', υ: 'y', ύ: 'y', ϋ: 'y', ΰ: 'y', φ: 'f',
  χ: 'ch', ψ: 'ps', ω: 'o', ώ: 'o',
}

function transliterate(str) {
  return Array.from(str.toLowerCase())
    .map((ch) => GREEK_TO_LATIN[ch] ?? ch)
    .join('')
}

export function slugifyFilename(name) {
  const slug = transliterate(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'ergo'
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
