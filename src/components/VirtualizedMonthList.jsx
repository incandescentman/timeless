import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { generateDayId } from '../utils/dateUtils';

const BUFFER_MULTIPLIER = 1.5;

const VirtualizedMonthList = forwardRef(function VirtualizedMonthList(
  {
    months,
    renderMonth,
    initialMonthIndex = 0,
    overscan = 2,
    onMonthInView
  },
  ref
) {
  const containerRef = useRef(null);
  const hasInitialScrollRef = useRef(false);
  const measuredHeightsRef = useRef(new Map());
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  const containerOffsetRef = useRef(0);

  const updateContainerOffset = useCallback(() => {
    if (typeof window === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    containerOffsetRef.current = rect.top + window.scrollY;
  }, []);

  useLayoutEffect(() => {
    updateContainerOffset();
  }, [updateContainerOffset, months]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      updateContainerOffset();
    };

    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleResize();
    handleScroll();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updateContainerOffset]);

  const heights = useMemo(() => {
    return months.map((month) => measuredHeightsRef.current.get(month.key) ?? month.estimatedHeight);
  }, [months, measurementVersion]);

  const cumulativeHeights = useMemo(() => {
    const cumulative = new Array(heights.length).fill(0);
    let running = 0;
    for (let i = 0; i < heights.length; i += 1) {
      cumulative[i] = running;
      running += heights[i];
    }
    return cumulative;
  }, [heights]);

  const totalHeight = useMemo(() => {
    if (heights.length === 0) return 0;
    return cumulativeHeights[cumulativeHeights.length - 1] + heights[heights.length - 1];
  }, [cumulativeHeights, heights]);

  const relativeScrollTop = Math.max(0, Math.min(scrollTop - containerOffsetRef.current, Math.max(totalHeight - viewportHeight, 0)));
  const buffer = viewportHeight * BUFFER_MULTIPLIER;

  const startIndex = useMemo(() => {
    if (months.length === 0) return 0;
    let index = 0;
    while (index < months.length - 1 && cumulativeHeights[index + 1] < relativeScrollTop - buffer) {
      index += 1;
    }
    return index;
  }, [months.length, cumulativeHeights, relativeScrollTop, buffer]);

  const endIndex = useMemo(() => {
    if (months.length === 0) return -1;
    const maxVisible = relativeScrollTop + viewportHeight + buffer;
    let index = startIndex;
    while (index < months.length - 1 && cumulativeHeights[index] + heights[index] < maxVisible) {
      index += 1;
    }
    return Math.min(index + overscan, months.length - 1);
  }, [months.length, cumulativeHeights, heights, relativeScrollTop, viewportHeight, buffer, startIndex, overscan]);

  const effectiveStartIndex = Math.max(0, startIndex - overscan);
  const safeEndIndex = Math.max(endIndex, effectiveStartIndex);
  const visibleMonths = months.slice(effectiveStartIndex, safeEndIndex + 1);
  const offsetY = cumulativeHeights[effectiveStartIndex] ?? 0;

  useEffect(() => {
    if (onMonthInView && months[effectiveStartIndex]) {
      onMonthInView(months[effectiveStartIndex], effectiveStartIndex);
    }
  }, [effectiveStartIndex, months, onMonthInView]);

  const handleHeightChange = useCallback((key, height) => {
    if (!Number.isFinite(height)) return;
    const sanitized = Math.max(height, 0);
    const current = measuredHeightsRef.current.get(key);
    if (current !== undefined && Math.abs(current - sanitized) < 1) {
      return;
    }
    measuredHeightsRef.current.set(key, sanitized);
    setMeasurementVersion((v) => v + 1);
  }, []);

  const scrollToMonthIndex = useCallback((index, { align = 'start', behavior = 'smooth' } = {}) => {
    if (typeof window === 'undefined') return false;
    if (!Number.isFinite(index)) return false;
    const clampedIndex = Math.max(0, Math.min(months.length - 1, Math.round(index)));
    const topOffset = (cumulativeHeights[clampedIndex] ?? 0) + containerOffsetRef.current;
    const monthHeight = heights[clampedIndex] ?? 0;
    let target = topOffset;

    if (align === 'center') {
      target = topOffset - (viewportHeight - monthHeight) / 2;
    } else if (align === 'end') {
      target = topOffset - viewportHeight + monthHeight;
    }

    window.scrollTo({ top: Math.max(target, 0), behavior });
    return true;
  }, [months.length, cumulativeHeights, heights, viewportHeight]);

  const scrollToDate = useCallback((date, { behavior = 'smooth', align = 'start', maxAttempts = 4 } = {}) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return false;
    }

    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const targetIndex = months.findIndex((month) => month.year === year && month.monthIndex === monthIndex);

    if (targetIndex === -1) {
      return false;
    }

    const success = scrollToMonthIndex(targetIndex, { behavior: 'auto', align });
    if (!success) {
      return false;
    }

    let attempts = 0;
    const tryFocus = () => {
      const dateId = generateDayId(date);
      const cell = document.querySelector(`[data-date-id="${dateId}"]`);
      if (cell) {
        cell.scrollIntoView({ behavior, block: 'center' });
        return true;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        return false;
      }
      window.requestAnimationFrame(tryFocus);
      return null;
    };

    window.requestAnimationFrame(tryFocus);
    return true;
  }, [months, scrollToMonthIndex]);

  useImperativeHandle(ref, () => ({
    scrollToMonthIndex,
    scrollToDate,
    getVisibleRange: () => ({ startIndex: effectiveStartIndex, endIndex })
  }), [effectiveStartIndex, endIndex, scrollToMonthIndex, scrollToDate]);

  useEffect(() => {
    if (hasInitialScrollRef.current) return;
    if (initialMonthIndex == null || months.length === 0) return;
    window.requestAnimationFrame(() => {
      if (scrollToMonthIndex(initialMonthIndex, { behavior: 'auto', align: 'center' })) {
        hasInitialScrollRef.current = true;
      }
    });
  }, [initialMonthIndex, months.length, scrollToMonthIndex, measurementVersion, viewportHeight]);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: totalHeight }}>
      <div style={{ transform: `translateY(${offsetY}px)` }}>
        {visibleMonths.map((month) => (
          <MonthContainer
            key={month.key}
            month={month}
            onHeightChange={handleHeightChange}
          >
            {renderMonth(month)}
          </MonthContainer>
        ))}
      </div>
    </div>
  );
});

function MonthContainer({ month, onHeightChange, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const notify = () => {
      const rect = node.getBoundingClientRect();
      onHeightChange(month.key, rect.height);
    };

    notify();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => notify());
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', notify);
    return () => window.removeEventListener('resize', notify);
  }, [month.key, onHeightChange]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}

export default VirtualizedMonthList;
