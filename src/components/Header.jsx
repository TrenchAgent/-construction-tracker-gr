export default function Header({ activeProject, projects, activeId, onSwitchProject }) {
  return (
    <div className="sticky top-0 bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center gap-2 z-10">
      <span className="text-xl shrink-0">🏗️</span>
      <div className="flex-1 min-w-0">
        {activeProject ? (
          <>
            <div className="font-semibold truncate">{activeProject.name}</div>
            {activeProject.location && (
              <div className="text-xs text-stone-500 truncate">{activeProject.location}</div>
            )}
          </>
        ) : (
          <div className="font-semibold">Διαχείριση Έργου</div>
        )}
      </div>
      {projects.length > 1 && (
        <select
          className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white max-w-[110px]"
          value={activeId || ''}
          onChange={(e) => onSwitchProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
