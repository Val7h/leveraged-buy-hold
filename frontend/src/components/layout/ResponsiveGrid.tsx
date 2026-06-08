"use client";
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  /**
   * Number of columns at different breakpoints
   * Default: { mobile: 1, sm: 1, md: 2, lg: 3 }
   */
  columns?: {
    mobile?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Responsive grid layout that automatically adapts to screen size
 * Mobile-first, touch-friendly spacing
 *
 * Example:
 * <ResponsiveGrid columns={{ mobile: 1, md: 2, lg: 3 }} gap="md">
 *   {items.map(item => <Card key={item.id}>{item.content}</Card>)}
 * </ResponsiveGrid>
 */
export default function ResponsiveGrid({
  children,
  columns = { mobile: 1, sm: 1, md: 2, lg: 3 },
  gap = 'md',
  className,
}: ResponsiveGridProps) {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const gridColsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const colsClass = [
    columns.mobile ? `${gridColsClasses[columns.mobile as keyof typeof gridColsClasses]}` : '',
    columns.sm ? `sm:${gridColsClasses[columns.sm as keyof typeof gridColsClasses]}` : '',
    columns.md ? `md:${gridColsClasses[columns.md as keyof typeof gridColsClasses]}` : '',
    columns.lg ? `lg:${gridColsClasses[columns.lg as keyof typeof gridColsClasses]}` : '',
    columns.xl ? `xl:${gridColsClasses[columns.xl as keyof typeof gridColsClasses]}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cn(
        'grid',
        colsClass,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}
