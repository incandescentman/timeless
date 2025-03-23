// ui/dom.js

export function showLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('active');
  }
}

export function hideLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.remove('active');
  }
}

export function showToast(message, duration = 3000) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => { toast.style.opacity = '1'; });

  // After "duration" ms, fade out and remove the toast
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export function recalculateAllHeights() {
  document.querySelectorAll('textarea').forEach(ta => recalculateHeight(ta.id));
}

// Helper function to recalculate a single textarea's height
function recalculateHeight(itemId) {
  const ta = document.getElementById(itemId);
  if (!ta) return;
  ta.style.height = "0";
  ta.style.height = (ta.scrollHeight + 5) + "px";
}

// Export helper functions for scroll measurement:
export function documentScrollTop() {
  return Math.max(document.body.scrollTop, document.documentElement.scrollTop);
}

export function documentScrollHeight() {
  return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

export function scrollPositionForElement(element) {
  let y = element.offsetTop;
  let node = element;
  while (node.offsetParent && node.offsetParent !== document.body) {
    node = node.offsetParent;
    y += node.offsetTop;
  }
  const clientHeight = element.clientHeight;
  return y - (window.innerHeight - clientHeight) / 2;
}

// Export updateStickyMonthHeader so it can be used by other modules:
export function updateStickyMonthHeader() {
  const headerEl = document.getElementById('header');
  if (!headerEl) return;
  headerEl.style.display = window.innerWidth <= 768 ? 'none' : '';
  const headerOffset = headerEl.offsetHeight + 30;
  const rows = document.querySelectorAll('#calendar tr');
  let foundRow = null;
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    if ((rect.top >= headerOffset && rect.top <= window.innerHeight) ||
        (rect.top < headerOffset && rect.bottom > headerOffset)) {
      foundRow = row;
      break;
    }
  }
  if (foundRow) {
    // Define a local months array for the header text.
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = parseInt(foundRow.dataset.monthIndex, 10);
    const year = parseInt(foundRow.dataset.year, 10);
    const monthName = months[monthIndex] || "???";
    const stickyElem = document.getElementById('stickyMonthHeader');
    if (stickyElem) {
      stickyElem.textContent = `${monthName} ${year}`;
      stickyElem.style.display = 'block';
    }
  }
}
