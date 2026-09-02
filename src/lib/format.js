const currencyFormatter = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
})

export function formatEUR(amount) {
  return currencyFormatter.format(amount || 0)
}
