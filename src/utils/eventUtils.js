/**
 * Event utilities for Timeless Calendar
 * Handles event data structure normalization and manipulation
 */

/**
 * Normalize an event entry to object format
 * Handles backward compatibility with string events
 *
 * @param {string|object} event - Event entry (string or object)
 * @returns {object} Normalized event object { text, completed, tags }
 */
export function normalizeEvent(event) {
  // Already an object
  if (typeof event === 'object' && event !== null) {
    return {
      text: event.text || '',
      completed: event.completed === true,
      tags: Array.isArray(event.tags) ? event.tags : []
    };
  }

  // String event - migrate to object
  if (typeof event === 'string') {
    return {
      text: event.trim(),
      completed: false,
      tags: []
    };
  }

  // Invalid event
  return {
    text: '',
    completed: false,
    tags: []
  };
}

/**
 * Normalize an array of events
 *
 * @param {Array<string|object>} events - Array of events
 * @returns {Array<object>} Array of normalized event objects
 */
export function normalizeEvents(events) {
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .map(normalizeEvent)
    .filter(event => event.text.length > 0);
}

/**
 * Get display text for an event
 *
 * @param {string|object} event - Event entry
 * @returns {string} Display text
 */
export function getEventText(event) {
  if (typeof event === 'string') {
    return event;
  }
  if (typeof event === 'object' && event !== null) {
    return event.text || '';
  }
  return '';
}

/**
 * Check if an event is completed
 *
 * @param {string|object} event - Event entry
 * @returns {boolean} True if completed
 */
export function isEventCompleted(event) {
  if (typeof event === 'object' && event !== null) {
    return event.completed === true;
  }
  return false;
}

/**
 * Get event tags
 *
 * @param {string|object} event - Event entry
 * @returns {Array<string>} Array of tags
 */
export function getEventTags(event) {
  if (typeof event === 'object' && event !== null && Array.isArray(event.tags)) {
    return event.tags;
  }
  return [];
}

/**
 * Toggle event completion status
 *
 * @param {string|object} event - Event entry
 * @returns {object} Updated event object
 */
export function toggleEventCompletion(event) {
  const normalized = normalizeEvent(event);
  return {
    ...normalized,
    completed: !normalized.completed
  };
}

/**
 * Update event tags
 *
 * @param {string|object} event - Event entry
 * @param {Array<string>} tags - New tags array
 * @returns {object} Updated event object
 */
export function setEventTags(event, tags) {
  const normalized = normalizeEvent(event);
  return {
    ...normalized,
    tags: Array.isArray(tags) ? tags : []
  };
}

/**
 * Update event text
 *
 * @param {string|object} event - Event entry
 * @param {string} text - New text
 * @returns {object} Updated event object
 */
export function setEventText(event, text) {
  const normalized = normalizeEvent(event);
  return {
    ...normalized,
    text: text.trim()
  };
}
