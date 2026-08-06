import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** Fixed — never derive this from the data being awaited. */
  count?: number;
  /** Grid classes of the real grid this stands in for, so nothing shifts. */
  className: string;
  /** Aspect of the image tile; matches the card it replaces. */
  tile?: string;
  lines?: number;
}

export function GridSkeleton({ count = 8, className, tile = "aspect-square", lines = 2 }: Props) {
  return (
    <div className={className} aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className={`${tile} rounded-2xl`} />
          <Skeleton className="h-3 w-3/4" />
          {lines > 1 && <Skeleton className="h-3 w-1/2" />}
        </div>
      ))}
    </div>
  );
}
