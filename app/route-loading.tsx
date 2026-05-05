type RouteLoadingProps = {
  title: string;
  description?: string;
};

export function RouteLoading({ title, description }: RouteLoadingProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="space-y-4"
      role="status"
    >
      <div className="space-y-2">
        <p className="h-8 w-40 animate-pulse rounded-md bg-slate-200" />
        <p className="h-5 w-full max-w-xs animate-pulse rounded-md bg-slate-200" />
      </div>
      <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
        {title}
        {description ? <span className="block text-slate-500">{description}</span> : null}
      </p>
    </section>
  );
}
