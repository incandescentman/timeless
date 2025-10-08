/**
 * Date utility functions for Timeless Calendar
 */

export const daysOfWeek = ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"];
export const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
export const shortMonths = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Generate a unique ID for a day cell
 * Format: {monthIndex}_{day}_{year} (zero-based month)
 */
export function generateDayId(date) {
  return `${date.getMonth()}_${date.getDate()}_${date.getFullYear()}`;
}

/**
 * Parse a day ID back into a Date object
 */
export function parseDate(dateId) {
  const [month, day, year] = dateId.split('_').map(Number);
  return new Date(year, month, day);
}

/**
 * Get the first day of the week for a given date (Monday)
 */
export function getWeekStart(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust for Monday start
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get all days in a week starting from Monday
 */
export function getWeekDays(weekStart) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * Check if a date is today
 */
export function isToday(date, today = new Date()) {
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Add days to a date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the number of weeks between two dates
 */
export function getWeeksBetween(startDate, endDate) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil((endDate - startDate) / msPerWeek);
}

/**
 * Format date for display
 */
export function formatDate(date, format = 'long') {
  if (format === 'long') {
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
  if (format === 'short') {
    return `${shortMonths[date.getMonth()]} ${date.getDate()}`;
  }
  // ISO format
  return date.toISOString().split('T')[0];
}

/**
 * Parse natural language date strings
 */
export function parseNaturalDate(input) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lower = input.toLowerCase().trim();

  if (lower === 'today') return today;
  if (lower === 'tomorrow') return addDays(today, 1);
  if (lower === 'yesterday') return addDays(today, -1);

  // Check for "next [day]"
  const nextDayMatch = lower.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextDayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    const currentDay = today.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    return addDays(today, daysToAdd);
  }

  // Try to parse as ISO date
  const isoDate = new Date(input);
  if (!isNaN(isoDate.getTime())) {
    isoDate.setHours(0, 0, 0, 0);
    return isoDate;
  }

  return null;
}

/**
 * Get all dates in a month
 */
export function getDatesInMonth(year, month) {
  const dates = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }

  return dates;
}

/**
 * Get weeks for a month view
 */
export function getMonthWeeks(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstWeek = getWeekStart(firstDay);
  const weeks = [];

  let currentWeek = new Date(firstWeek);
  while (currentWeek <= lastDay) {
    weeks.push(getWeekDays(currentWeek));
    currentWeek = addDays(currentWeek, 7);
  }

  return weeks;
}
