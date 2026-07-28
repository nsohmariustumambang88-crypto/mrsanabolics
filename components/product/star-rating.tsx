import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({
  rating,
  size = 'sm',
  showValue = false,
  count,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  count?: number;
}) {
  const sizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              sizes[size],
              i <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted text-muted'
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      )}
      {count !== undefined && (
        <span className="text-sm text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
