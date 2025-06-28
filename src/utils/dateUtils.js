import {
  startOfDay,
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  parse,
  isToday,
  isWeekend,
  getDay,
  isSameDay,
  isSameMonth,
  differenceInDays,
  eachDayOfInterval,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds
} from 'date-fns';

// Create timezone-safe local midnight clone
export const createLocalMidnight = (date) => {
  if (!date) return new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(year, month, day, 0, 0, 0, 0);
};

// Get today as local midnight
export const getToday = () => {
  return createLocalMidnight(new Date());
};

// Date formatting utilities
export const formatDateId = (date) => {
  const normalizedDate = createLocalMidnight(date);
  return `${normalizedDate.getMonth()}_${normalizedDate.getDate()}_${normalizedDate.getFullYear()}`;
};

export const parseDateFromId = (id) => {
  const [month, day, year] = id.split('_').map(Number);
  return createLocalMidnight(new Date(year, month, day));
};

// European-style week (Monday = 0, Sunday = 6)
export const getAdjustedDayIndex = (date) => {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
};

// Calendar navigation utilities
export const navigateToToday = () => {
  return getToday();
};

export const navigateMonth = (currentDate, direction) => {
  const baseDate = createLocalMidnight(currentDate);
  return direction > 0 ? addMonths(baseDate, direction) : subMonths(baseDate, Math.abs(direction));
};

export const navigateDay = (currentDate, direction) => {
  const baseDate = createLocalMidnight(currentDate);
  return direction > 0 ? addDays(baseDate, direction) : subDays(baseDate, Math.abs(direction));
};

export const navigateWeek = (currentDate, direction) => {
  const baseDate = createLocalMidnight(currentDate);
  const daysToMove = direction * 7;
  return daysToMove > 0 ? addDays(baseDate, daysToMove) : subDays(baseDate, Math.abs(daysToMove));
};

// Generate calendar days for infinite scroll
export const generateCalendarDays = (centerDate, daysBefore = 30, daysAfter = 59) => {
  const startDate = subDays(createLocalMidnight(centerDate), daysBefore);
  const endDate = addDays(createLocalMidnight(centerDate), daysAfter);
  
  return eachDayOfInterval({
    start: startDate,
    end: endDate
  });
};

// Check if date should show month header (first day of month)
export const shouldShowMonthHeader = (date) => {
  const normalizedDate = createLocalMidnight(date);
  return normalizedDate.getDate() === 1;
};

// Get month name and year for headers
export const getMonthYearLabel = (date) => {
  return format(createLocalMidnight(date), 'MMMM yyyy');
};

export const getShortMonthLabel = (date) => {
  return format(createLocalMidnight(date), 'MMM');
};

// Day classification utilities
export const isDayToday = (date) => {
  return isToday(createLocalMidnight(date));
};

export const isDayWeekend = (date) => {
  return isWeekend(createLocalMidnight(date));
};

export const isDayInSameMonth = (date1, date2) => {
  return isSameMonth(createLocalMidnight(date1), createLocalMidnight(date2));
};

export const isDayInRange = (date, startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const checkDate = createLocalMidnight(date);
  const rangeStart = createLocalMidnight(startDate);
  const rangeEnd = createLocalMidnight(endDate);
  return checkDate >= rangeStart && checkDate <= rangeEnd;
};

export const isDaySame = (date1, date2) => {
  if (!date1 || !date2) return false;
  return isSameDay(createLocalMidnight(date1), createLocalMidnight(date2));
};

// Date display utilities
export const getDayLabels = () => {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
};

export const getFullDayLabel = (date) => {
  const adjustedIndex = getAdjustedDayIndex(date);
  const fullLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return fullLabels[adjustedIndex];
};

export const getShortDayLabel = (date) => {
  const adjustedIndex = getAdjustedDayIndex(date);
  const shortLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return shortLabels[adjustedIndex];
};

export const getDayNumber = (date) => {
  return createLocalMidnight(date).getDate();
};

export const getFullDateString = (date) => {
  return format(createLocalMidnight(date), 'MM/dd/yyyy');
};

export const getReadableDateString = (date) => {
  return format(createLocalMidnight(date), 'EEEE, MMMM do, yyyy');
};

// Month navigation for mini calendar
export const getMonthsAroundDate = (centerDate, monthsBefore = 1, monthsAfter = 1) => {
  const months = [];
  const baseDate = startOfMonth(createLocalMidnight(centerDate));
  
  // Add previous months
  for (let i = monthsBefore; i >= 1; i--) {
    months.push(subMonths(baseDate, i));
  }
  
  // Add current month
  months.push(baseDate);
  
  // Add next months
  for (let i = 1; i <= monthsAfter; i++) {
    months.push(addMonths(baseDate, i));
  }
  
  return months;
};

// Year view utilities
export const getYearMonths = (year) => {
  const months = [];
  for (let month = 0; month < 12; month++) {
    months.push(createLocalMidnight(new Date(year, month, 1)));
  }
  return months;
};

export const getMonthDays = (date) => {
  const monthStart = startOfMonth(createLocalMidnight(date));
  const monthEnd = endOfMonth(createLocalMidnight(date));
  return eachDayOfInterval({ start: monthStart, end: monthEnd });
};

// Smooth scroll utilities
export const calculateScrollDistance = (fromDate, toDate) => {
  return differenceInDays(createLocalMidnight(toDate), createLocalMidnight(fromDate));
};

// Export/Import date utilities
export const formatForExport = (date) => {
  return format(createLocalMidnight(date), 'yyyy-MM-dd');
};

export const parseFromExport = (dateString) => {
  try {
    const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
    return createLocalMidnight(parsed);
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return getToday();
  }
};

// Keyboard navigation helpers
export const getDateAfterDays = (startDate, days) => {
  return addDays(createLocalMidnight(startDate), days);
};

export const getDateAfterWeeks = (startDate, weeks) => {
  return addDays(createLocalMidnight(startDate), weeks * 7);
};

// Constants
export const DAYS_OF_WEEK = getDayLabels();
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default {
  createLocalMidnight,
  getToday,
  formatDateId,
  parseDateFromId,
  getAdjustedDayIndex,
  navigateToToday,
  navigateMonth,
  navigateDay,
  navigateWeek,
  generateCalendarDays,
  shouldShowMonthHeader,
  getMonthYearLabel,
  getShortMonthLabel,
  isDayToday,
  isDayWeekend,
  isDayInSameMonth,
  isDayInRange,
  isDaySame,
  getDayLabels,
  getFullDayLabel,
  getShortDayLabel,
  getDayNumber,
  getFullDateString,
  getReadableDateString,
  getMonthsAroundDate,
  getYearMonths,
  getMonthDays,
  calculateScrollDistance,
  formatForExport,
  parseFromExport,
  getDateAfterDays,
  getDateAfterWeeks,
  DAYS_OF_WEEK,
  MONTHS,
  SHORT_MONTHS
};