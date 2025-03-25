import { showToast } from './ui/dom.js';
import { loadCalendarAroundDate } from './ui/calendarfunctions.js';

export function downloadLocalStorageData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function loadDataFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                localStorage.clear();
                for (const [key, value] of Object.entries(data)) {
                    localStorage.setItem(key, value);
                }
                showToast('Data loaded successfully');
                loadCalendarAroundDate(new Date());
            } catch (error) {
                showToast('Error loading data: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

export function downloadBackupStorageData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function restoreDirectoryHandle() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        const permissionStatus = await dirHandle.queryPermission({ mode: 'readwrite' });
        if (permissionStatus === 'granted') {
            return dirHandle;
        }
        return null;
    } catch (error) {
        console.error('Error restoring directory handle:', error);
        return null;
    }
}

export async function loadDataFromFileHandle(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        localStorage.clear();
        for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value);
        }
        showToast('Data loaded successfully');
        loadCalendarAroundDate(new Date());
    } catch (error) {
        showToast('Error loading data: ' + error.message);
    }
}

export async function exportToFileHandle(fileHandle) {
    try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const writable = await fileHandle.getFileHandle('calendar_data.json', { create: true });
        const writer = await writable.createWritable();
        await writer.write(blob);
        showToast('Data exported successfully');
    } catch (error) {
        showToast('Error exporting data: ' + error.message);
    }
} 