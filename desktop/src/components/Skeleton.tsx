export default function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="fn-card fn-pulse h-24 opacity-60" />
      ))}
    </div>
  );
}
