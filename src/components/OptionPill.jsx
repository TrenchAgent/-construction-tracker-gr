// Shared shell for every "pick one of a few options" control in the
// app — the kind toggle, category picker, payment status/method
// pickers (QuickAddModal), the collaborator role picker
// (ProjectSettingsModal). Icon above label, comfortable padding, a
// real filled background on selection rather than just a border color
// swap — that border-only pattern was the actual complaint this
// component exists to fix.
//
// Unselected stays a plain neutral fill on purpose: the point is for
// the selected option to visibly pop against uniform siblings, not for
// every option to carry its own pastel all the time (that would compete
// with, not support, "scannable at a glance").
export default function OptionPill({ selected, selectedClassName, onClick, Icon, label, iconSize = 18 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-center transition-colors ' +
        (selected ? selectedClassName + ' text-white' : 'bg-stone-100 text-stone-600 active:bg-stone-200')
      }
    >
      <Icon size={iconSize} />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </button>
  )
}
