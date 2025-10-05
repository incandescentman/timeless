import { addMonths, getMonthWeeks, getWeekStart } from './dateUtils';

const ESTIMATED_WEEK_HEIGHT = 240; // px, rough baseline per week row including spacing
const MONTH_HEADER_HEIGHT = 80; // px, header + padding

function toMonthKey(year, monthIndex) {
  return `${year}-${monthIndex}`;
}

export function generateMonthsMeta({ startYear = 2020, endYear = 2035 } = {}) {
  const startDate = new Date(startYear, 0, 1);
  const totalMonths = (endYear - startYear + 1) * 12;
  const monthsMeta = [];

  for (let i = 0; i < totalMonths; i++) {
    const monthDate = addMonths(startDate, i);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const weeks = getMonthWeeks(year, monthIndex).map((weekDays, idx) => {
      const referenceDay = weekDays[0] ?? new Date(year, monthIndex, 1 + idx * 7);
      return {
        weekStart: getWeekStart(referenceDay).toISOString(),
        days: weekDays
      };
    });
    const estimatedHeight = weeks.length * ESTIMATED_WEEK_HEIGHT + MONTH_HEADER_HEIGHT;

    monthsMeta.push({
      key: toMonthKey(year, monthIndex),
      year,
      monthIndex,
      startDate: new Date(year, monthIndex, 1),
      weeks,
      estimatedHeight
    });
  }

  return monthsMeta;
}

export function findMonthIndex(monthsMeta, year, monthIndex) {
  if (!Array.isArray(monthsMeta)) return -1;
  const key = toMonthKey(year, monthIndex);
  return monthsMeta.findIndex(month => month.key === key);
}

export { toMonthKey as getMonthKey, ESTIMATED_WEEK_HEIGHT, MONTH_HEADER_HEIGHT };
