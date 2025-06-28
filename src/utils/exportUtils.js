import { saveAs } from 'file-saver';
import { formatForExport, getToday, parseDateFromId, getMonthYearLabel } from './dateUtils';

// Export calendar data as JSON backup
export const exportCalendarJSON = (calendarData, filename) => {
  try {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      appName: 'Timeless Calendar',
      data: calendarData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const defaultFilename = `timeless-calendar-backup-${formatForExport(getToday())}.json`;
    saveAs(blob, filename || defaultFilename);
    
    return true;
  } catch (error) {
    console.error('Error exporting JSON:', error);
    return false;
  }
};

// Export calendar data as Markdown diary
export const exportMarkdownDiary = (calendarData, filename) => {
  try {
    const diary = generateMarkdownDiary(calendarData);
    
    const blob = new Blob([diary], {
      type: 'text/markdown'
    });

    const defaultFilename = `timeless-diary-${formatForExport(getToday())}.md`;
    saveAs(blob, filename || defaultFilename);
    
    // Also copy to clipboard if available
    if (navigator.clipboard) {
      navigator.clipboard.writeText(diary).catch(console.error);
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting markdown:', error);
    return false;
  }
};

// Export as Emacs Org-mode format
export const exportOrgMode = (calendarData, filename) => {
  try {
    const orgContent = generateOrgModeContent(calendarData);
    
    const blob = new Blob([orgContent], {
      type: 'text/plain'
    });

    const defaultFilename = `timeless-calendar-${formatForExport(getToday())}.org`;
    saveAs(blob, filename || defaultFilename);
    
    return true;
  } catch (error) {
    console.error('Error exporting org-mode:', error);
    return false;
  }
};

// Export as CSV format
export const exportCSV = (calendarData, filename) => {
  try {
    const csv = generateCSV(calendarData);
    
    const blob = new Blob([csv], {
      type: 'text/csv'
    });

    const defaultFilename = `timeless-calendar-${formatForExport(getToday())}.csv`;
    saveAs(blob, filename || defaultFilename);
    
    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
};

// Generate Markdown diary content
const generateMarkdownDiary = (calendarData) => {
  const dateEntries = {};
  
  // Group entries by date
  Object.keys(calendarData).forEach(key => {
    if (key.match(/^\d+_\d+_\d+$/)) {
      const date = parseDateFromId(key);
      const itemIds = calendarData[key].split(',').filter(Boolean);
      const notes = itemIds.map(id => calendarData[id]).filter(Boolean);
      
      if (notes.length > 0) {
        dateEntries[formatForExport(date)] = {
          date: date,
          notes: notes
        };
      }
    }
  });

  // Sort by date
  const sortedDates = Object.keys(dateEntries).sort();
  
  let markdown = `# Timeless Calendar Diary\n\n`;
  markdown += `Exported on: ${new Date().toLocaleDateString()}\n\n`;
  
  let currentYear = null;
  let currentMonth = null;
  
  sortedDates.forEach(dateStr => {
    const entry = dateEntries[dateStr];
    const date = entry.date;
    const year = date.getFullYear();
    const monthYear = getMonthYearLabel(date);
    
    // Add year header if changed
    if (year !== currentYear) {
      markdown += `# ${year}\n\n`;
      currentYear = year;
      currentMonth = null;
    }
    
    // Add month header if changed
    if (monthYear !== currentMonth) {
      markdown += `## ${monthYear}\n\n`;
      currentMonth = monthYear;
    }
    
    // Add date and notes
    markdown += `### ${date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })}\n\n`;
    
    entry.notes.forEach(note => {
      markdown += `- ${note.replace(/\n/g, '  \n  ')}\n`;
    });
    
    markdown += '\n';
  });
  
  return markdown;
};

// Generate Org-mode content
const generateOrgModeContent = (calendarData) => {
  const dateEntries = {};
  
  // Group entries by date
  Object.keys(calendarData).forEach(key => {
    if (key.match(/^\d+_\d+_\d+$/)) {
      const date = parseDateFromId(key);
      const itemIds = calendarData[key].split(',').filter(Boolean);
      const notes = itemIds.map(id => calendarData[id]).filter(Boolean);
      
      if (notes.length > 0) {
        dateEntries[formatForExport(date)] = {
          date: date,
          notes: notes
        };
      }
    }
  });

  const sortedDates = Object.keys(dateEntries).sort();
  
  let orgContent = `#+TITLE: Timeless Calendar\n`;
  orgContent += `#+AUTHOR: Timeless Calendar Export\n`;
  orgContent += `#+DATE: ${new Date().toISOString().split('T')[0]}\n\n`;
  
  let currentYear = null;
  
  sortedDates.forEach(dateStr => {
    const entry = dateEntries[dateStr];
    const date = entry.date;
    const year = date.getFullYear();
    
    // Add year header if changed
    if (year !== currentYear) {
      orgContent += `* ${year}\n\n`;
      currentYear = year;
    }
    
    // Add date entry
    orgContent += `** <${formatForExport(date)}> ${date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })}\n\n`;
    
    entry.notes.forEach(note => {
      orgContent += `   - ${note}\n`;
    });
    
    orgContent += '\n';
  });
  
  return orgContent;
};

// Generate CSV content
const generateCSV = (calendarData) => {
  const rows = [['Date', 'Note', 'Created']];
  
  Object.keys(calendarData).forEach(key => {
    if (key.match(/^\d+_\d+_\d+$/)) {
      const date = parseDateFromId(key);
      const itemIds = calendarData[key].split(',').filter(Boolean);
      
      itemIds.forEach(itemId => {
        const note = calendarData[itemId];
        if (note) {
          rows.push([
            formatForExport(date),
            `"${note.replace(/"/g, '""')}"`, // Escape quotes in CSV
            new Date().toISOString()
          ]);
        }
      });
    }
  });
  
  return rows.map(row => row.join(',')).join('\n');
};

// Import calendar data from JSON file
export const importCalendarJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const importData = JSON.parse(content);
        
        // Validate the import data
        if (importData.data) {
          resolve(importData.data);
        } else if (importData.version || importData.exportDate) {
          // Handle different export formats
          resolve(importData);
        } else {
          // Assume it's raw calendar data
          resolve(importData);
        }
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

// Export utilities object
export const exportUtils = {
  json: exportCalendarJSON,
  markdown: exportMarkdownDiary,
  orgMode: exportOrgMode,
  csv: exportCSV,
  import: importCalendarJSON
};

// Predefined export functions
export const quickExports = {
  // Quick JSON backup
  backup: (calendarData) => {
    return exportCalendarJSON(calendarData);
  },
  
  // Quick diary export
  diary: (calendarData) => {
    return exportMarkdownDiary(calendarData);
  },
  
  // Export all formats
  all: (calendarData) => {
    const baseFilename = `timeless-export-${formatForExport(getToday())}`;
    
    const results = {
      json: exportCalendarJSON(calendarData, `${baseFilename}.json`),
      markdown: exportMarkdownDiary(calendarData, `${baseFilename}.md`),
      orgMode: exportOrgMode(calendarData, `${baseFilename}.org`),
      csv: exportCSV(calendarData, `${baseFilename}.csv`)
    };
    
    return results;
  }
};

export default {
  exportCalendarJSON,
  exportMarkdownDiary,
  exportOrgMode,
  exportCSV,
  importCalendarJSON,
  exportUtils,
  quickExports
};