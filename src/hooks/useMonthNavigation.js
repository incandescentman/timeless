import { useCallback } from 'react';

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
  const jumpMonths = useCallback((direction, attempt = 0, state) => {
    if (!direction) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const monthSections = Array.from(document.querySelectorAll('.month-section'));
    if (monthSections.length === 0) {
      window.scrollBy({
        top: direction * AVERAGE_MONTH_HEIGHT,
        behavior: 'smooth'
      });
      return;
    }

    const viewportBottom = window.innerHeight;
    const scrollDirection = Math.sign(direction || 1) || 1;

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
      window.scrollBy({
        top: scrollDirection * window.innerHeight * SCROLL_RATIO,
        behavior: 'smooth'
      });
      return;
    }

    let workingState = state;
    if (!workingState) {
      const parsed = parseMonthKey(activeEntry.key);
      if (!parsed) {
        window.scrollBy({
          top: scrollDirection * window.innerHeight * SCROLL_RATIO,
          behavior: 'smooth'
        });
        return;
      }
      const baseAbsolute = parsed.year * 12 + parsed.monthIndex;
      workingState = {
        baseAbsolute,
        targetAbsolute: baseAbsolute + direction
      };
    }

    const { targetAbsolute } = workingState;
    if (!Number.isFinite(targetAbsolute)) {
      return;
    }

    const target = normalizeTargetIndex(targetAbsolute);
    const targetKey = `${target.year}-${target.monthIndex}`;
    const targetSection = document.querySelector(`.month-section[data-month-key="${targetKey}"]`);

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
  }, []);

  const announceAndJump = useCallback((direction, message) => {
    if (!direction) return;
    if (typeof window === 'undefined') return;
    if (announceCommand && message) {
      announceCommand({ label: message });
    }
    jumpMonths(direction);
  }, [announceCommand, jumpMonths]);

  const describeDirection = useCallback((direction) => {
    if (!direction) return '';
    const magnitude = Math.abs(direction);
    if (direction === 12) return 'Jumping to next year';
    if (direction === -12) return 'Jumping to previous year';
    if (direction > 0) {
      return magnitude === 1
        ? 'Scrolling to next month'
        : `Scrolling forward ${magnitude} months`;
    }
    return magnitude === 1
      ? 'Scrolling to previous month'
      : `Scrolling back ${magnitude} months`;
  }, []);

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
