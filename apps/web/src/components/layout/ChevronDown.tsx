export function ChevronDown({ open = false }: { open?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 border-b border-r border-current text-text-disabled transition-transform ${
        open ? 'rotate-[225deg]' : 'rotate-45'
      }`}
    />
  );
}