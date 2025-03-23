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
