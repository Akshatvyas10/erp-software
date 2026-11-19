import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ScrollableTabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  showScrollButtons?: boolean;
}

/**
 * ScrollableTabsList:
 * An accessible, multi-device friendly wrapper for wide navigation tabs lists.
 * - Supports mouse-wheel horizontal scrolling without requiring Shift.
 * - Smooth touch momentum scrolling on mobile & tablet.
 * - Provides subtle chevron scroll buttons when overflowing.
 * - Automatic edge fade indicators so users immediately see more tabs exist.
 * - Full keyboard navigation compliance.
 */
export const ScrollableTabsList = React.forwardRef<HTMLDivElement, ScrollableTabsListProps>(
  ({ children, className, showScrollButtons = true, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    };

    useEffect(() => {
      checkScroll();
      const el = scrollContainerRef.current;
      if (!el) return;

      const handleWheel = (e: WheelEvent) => {
        // Allow vertical mouse wheel to scroll horizontally if overflowed and no shift key
        if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
          checkScroll();
        }
      };

      el.addEventListener('scroll', checkScroll, { passive: true });
      el.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('resize', checkScroll);

      return () => {
        el.removeEventListener('scroll', checkScroll);
        el.removeEventListener('wheel', handleWheel);
        window.removeEventListener('resize', checkScroll);
      };
    }, []);

    const scroll = (direction: 'left' | 'right') => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const offset = direction === 'left' ? -220 : 220;
      el.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    };

    return (
      <div className="relative group/tabs-container w-full">
        {/* Left Scroll Button */}
        {showScrollButtons && canScrollLeft && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center pr-2 pl-0.5 bg-gradient-to-r from-background via-background/90 to-transparent h-full rounded-l-xl">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Scroll tabs left"
              onClick={() => scroll('left')}
              className="h-7 w-7 rounded-full shadow-md bg-background/95 hover:bg-muted border-border/80 text-foreground transition-all hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          data-slot="scrollable-tabs-viewport"
          className={cn(
            'flex items-center gap-1 sm:gap-1.5 overflow-x-auto scroll-smooth scrollbar-none py-1 px-1',
            'touch-pan-x overscroll-x-contain select-none',
            className
          )}
          {...props}
        >
          {children}
        </div>

        {/* Right Scroll Button */}
        {showScrollButtons && canScrollRight && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center pl-2 pr-0.5 bg-gradient-to-l from-background via-background/90 to-transparent h-full rounded-r-xl">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Scroll tabs right"
              onClick={() => scroll('right')}
              className="h-7 w-7 rounded-full shadow-md bg-background/95 hover:bg-muted border-border/80 text-foreground transition-all hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

ScrollableTabsList.displayName = 'ScrollableTabsList';

