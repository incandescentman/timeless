/**
 * Local storage utilities for Timeless Calendar
 */

/**
 * Get all calendar data from localStorage
 */
export function getAllCalendarData() {
  const data = {};
  const datePattern = /^\d+_\d+_\d+$/;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (datePattern.test(key)) {
      data[key] = localStorage.getItem(key);
    }
  }

  return data;
}

/**
 * Load calendar data from localStorage
 */
export function loadFromLocalStorage() {
  return getAllCalendarData();
}

/**
 * Save calendar data to localStorage
 */
export function saveToLocalStorage(calendarData) {
  // Clear old date entries
  const datePattern = /^\d+_\d+_\d+$/;
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (datePattern.test(key) && !calendarData[key]) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Save current data
  Object.entries(calendarData).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  });

  // Update timestamp
  localStorage.setItem('lastSavedTimestamp', Date.now().toString());
}

/**
 * Download calendar data as JSON
 */
export function downloadCalendarData() {
  const data = getAllCalendarData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timeless-calendar-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import calendar data from JSON
 */
export function importCalendarData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    // Clear existing calendar data
    const datePattern = /^\d+_\d+_\d+$/;
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (datePattern.test(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Import new data
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    return true;
  } catch (error) {
    console.error('Error importing calendar data:', error);
    return false;
  }
}

/**
 * Export calendar data as Markdown diary
 */
export function exportAsMarkdownDiary() {
  const data = getAllCalendarData();
  const entries = Object.entries(data).map(([dateId, text]) => {
    const [month, day, year] = dateId.split('_').map(Number);
    const date = new Date(year, month, day);
    return { date, text };
  }).sort((a, b) => a.date - b.date);

  let markdown = '# Calendar Diary\n\n';
  let currentYear = null;
  let currentMonth = null;

  entries.forEach(({ date, text }) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (year !== currentYear) {
      currentYear = year;
      markdown += `## ${year}\n\n`;
    }

    if (month !== currentMonth) {
      currentMonth = month;
      const monthNames = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
      markdown += `### ${monthNames[month]}\n\n`;
    }

    markdown += `**${day}**: ${text}\n\n`;
  });

  return markdown;
}

/**
 * Download Markdown diary
 */
export function downloadMarkdownDiary() {
  const markdown = exportAsMarkdownDiary();
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calendar-diary-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);

  // Also copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown);
  }
}