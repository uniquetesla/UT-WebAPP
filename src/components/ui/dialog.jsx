export function Dialog({ open = false, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className = "", children }) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ className = "", children }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function DialogTitle({ className = "", children }) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}
