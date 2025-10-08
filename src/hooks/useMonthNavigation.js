import { useCallback, useMemo } from 'react';
import { useCalendar } from '../contexts/CalendarContext';

const VIEWPORT_TARGET_OFFSET = 100;
const SCROLL_RATIO = 0.9;
const MAX_ATTEMPTS = 8;
const RETRY_DELAY = 400;
const AVERAGE_MONTH_HEIGHT = 600;

function parseMonthKey(key) {
  const match = key?.match(/^(-?\d{1,4})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) return null;
  return { year, monthIndex };
}

function normalizeTargetIndex(targetAbsolute) {
  const targetInt = Math.trunc(targetAbsolute);
  const monthIndex = ((targetInt % 12) + 12) % 12;
  const year = (targetInt - monthIndex) / 12;
  return { year, monthIndex };
}

export function useMonthNavigation({ announceCommand } = {}) {
  const { scrollToDate } = useCalendar();
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric'
  }), []);
  const yearFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    year: 'numeric'
  }), []);

  const resolveNavigation = useCallback((direction) => {
    if (!direction) return null;
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    const monthSections = Array.from(document.querySelectorAll('.month-section'));
    if (monthSections.length === 0) {
      return null;
    }

    const viewportBottom = window.innerHeight;

    let activeEntry = null;
    let closestDistance = Infinity;

    const entries = monthSections.map((section) => {
      const header = section.querySelector('.month-header');
      const rect = header
        ? header.getBoundingClientRect()
        : section.getBoundingClientRect();
      const key = section.dataset.monthKey || '';
      const isVisible = rect.top < viewportBottom && rect.bottom > 0;
      const distanceFromTop = Math.abs(rect.top - VIEWPORT_TARGET_OFFSET);

      if (isVisible && distanceFromTop < closestDistance) {
        closestDistance = distanceFromTop;
        activeEntry = { section, header, rect, key };
      }

      return { section, header, rect, key };
    });

    if (!activeEntry && entries.length > 0) {
      activeEntry = entries.find(entry => entry.rect.top > 0) || entries[entries.length - 1];
    }

    if (!activeEntry) {
      return null;
    }

    const parsed = parseMonthKey(activeEntry.key);
    if (!parsed) {
      return null;
    }

    const baseAbsolute = parsed.year * 12 + parsed.monthIndex;
    const targetAbsolute = baseAbsolute + direction;
    if (!Number.isFinite(targetAbsolute)) {
      return null;
    }

    const target = normalizeTargetIndex(targetAbsolute);
    const targetKey = `${target.year}-${target.monthIndex}`;
    const targetDate = new Date(target.year, target.monthIndex, 1);
    const scrollDirection = Math.sign(direction || 1) || 1;

    return {
      scrollDirection,
      target,
      targetKey,
      targetDate
    };
  }, []);

  const jumpMonths = useCallback((direction, attempt = 0, state) => {
    if (!direction) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let workingState = state;
    if (!workingState) {
      workingState = resolveNavigation(direction);
      if (!workingState) {
        const fallbackDirection = Math.sign(direction || 1) || 1;
        window.scrollBy({
          top: fallbackDirection * AVERAGE_MONTH_HEIGHT,
          behavior: 'smooth'
        });
        return;
      }
    }

    const { scrollDirection, targetKey, targetDate } = workingState;

    const handledByVirtualizer = scrollToDate?.(targetDate, {
      behavior: 'smooth',
      align: 'start',
      maxAttempts: 240
    });

    if (handledByVirtualizer) {
      return;
    }

    const targetSection = targetKey
      ? document.querySelector(`.month-section[data-month-key="${targetKey}"]`)
      : null;

    if (targetSection) {
      const targetHeader = targetSection.querySelector('.month-header') || targetSection;
      targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (attempt >= MAX_ATTEMPTS) {
      window.scrollBy({
        top: scrollDirection * window.innerHeight * SCROLL_RATIO,
        behavior: 'smooth'
      });
      return;
    }
    window.scrollBy({
      top: scrollDirection * window.innerHeight * SCROLL_RATIO,
      behavior: 'smooth'
    });

    window.setTimeout(() => {
      jumpMonths(direction, attempt + 1, workingState);
    }, RETRY_DELAY + attempt * 120);
  }, [resolveNavigation, scrollToDate]);

  const announceAndJump = useCallback((direction, message) => {
    if (!direction) return;
    if (typeof window === 'undefined') return;
    if (announceCommand && message) {
      const payload = typeof message === 'string'
        ? { label: message }
        : (typeof message === 'object' && message !== null ? message : null);
      if (payload?.label) {
        announceCommand(payload);
      }
    }
    jumpMonths(direction);
  }, [announceCommand, jumpMonths]);

  const describeDirection = useCallback((direction) => {
    if (!direction) return { label: '' };
    const magnitude = Math.abs(direction);
    const context = resolveNavigation(direction);

    let label;
    let description = null;

    if (context?.targetDate) {
      const { targetDate } = context;
      const monthLabel = monthFormatter.format(targetDate);
      const yearLabel = yearFormatter.format(targetDate);

      if (magnitude === 12) {
        label = direction > 0 ? 'Jumping to next year' : 'Jumping to previous year';
        description = yearLabel;
      } else if (magnitude === 1) {
        label = direction > 0 ? 'Scrolling to next month' : 'Scrolling to previous month';
        description = monthLabel;
      } else {
        label = direction > 0
          ? `Scrolling forward ${magnitude} months`
          : `Scrolling back ${magnitude} months`;
        description = monthLabel;
      }
    } else {
      if (magnitude === 12) {
        label = direction > 0 ? 'Jumping to next year' : 'Jumping to previous year';
      } else if (direction > 0) {
        label = magnitude === 1 ? 'Scrolling to next month' : `Scrolling forward ${magnitude} months`;
      } else {
        label = magnitude === 1 ? 'Scrolling to previous month' : `Scrolling back ${magnitude} months`;
      }
    }

    return { label, description };
  }, [monthFormatter, resolveNavigation, yearFormatter]);

  return {
    jumpMonths,
    announceAndJump,
    describeDirection
  };
}

export function scrollWeeks(direction) {
  if (!direction) return;
  if (typeof window === 'undefined') return;
  const scrollAmount = window.innerHeight * 0.8 * Math.sign(direction);
  window.scrollBy({
    top: scrollAmount,
    behavior: 'smooth'
  });
}
