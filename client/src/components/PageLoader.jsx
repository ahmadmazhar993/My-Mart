export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-primary [animation:bounce_1s_infinite_0ms]" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary [animation:bounce_1s_infinite_150ms]" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary [animation:bounce_1s_infinite_300ms]" />
      </div>
    </div>
  );
}