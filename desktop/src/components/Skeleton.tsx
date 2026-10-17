export default function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="fn-card fn-pulse p-5">
          <div className="h-2.5 w-24 rounded-full bg-hover" />
          <div className="mt-3 h-3.5 w-3/4 rounded-full bg-hover" />
          <div className="mt-2 h-2.5 w-1/2 rounded-full bg-hover" />
        </div>
      ))}
    </div>
  );
}
