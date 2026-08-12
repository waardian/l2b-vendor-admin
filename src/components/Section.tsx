export default function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}
