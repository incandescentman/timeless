import { normalizeEvents } from './eventUtils.js'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const TAG_REGEX = /^#([\w-]+)$/
const TIMESTAMP_COMMENT_REGEX = /^<!--\s*lastSavedTimestamp\s*:\s*([0-9]+)\s*-->$/i
const COMMENT_REGEX = /^<!--\s*([\w-]+)\s*:\s*(.*?)\s*-->$/i

export function formatCalendarAsMarkdown(calendarData = {}, timestamp = Date.now()) {
  const numericTimestamp = typeof timestamp === 'string'
    ? Number.parseInt(timestamp, 10)
    : Number(timestamp)
  const resolvedTimestamp = Number.isFinite(numericTimestamp)
    ? numericTimestamp
    : Date.now()

  const entries = Object.entries(calendarData)
    .map(([dateId, events]) => {
      const parts = dateId.split('_')
      if (parts.length !== 3) return null

      const [monthStr, dayStr, yearStr] = parts
      const month = Number(monthStr)
      const day = Number(dayStr)
      const year = Number(yearStr)

      const date = new Date(year, month, day)
      if (Number.isNaN(date.getTime())) return null

      const normalisedEvents = normalizeEvents(Array.isArray(events) ? events : [])
      const filteredEvents = normalisedEvents.filter(event => {
        const text = typeof event?.text === 'string' ? event.text.trim() : ''
        return text.length > 0
      })

      if (filteredEvents.length === 0) {
        return null
      }

      return { date, events: filteredEvents }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const lines = [`<!-- lastSavedTimestamp: ${resolvedTimestamp} -->`, '']

  let currentYear = null
  let currentMonth = null

  for (const entry of entries) {
    const { date, events } = entry
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    if (year !== currentYear) {
      currentYear = year
      currentMonth = null
      lines.push(`# ${year}`, '')
    }

    if (month !== currentMonth) {
      currentMonth = month
      lines.push(`## ${MONTH_NAMES[month]} ${year}`, '')
    }

    const monthLabel = month + 1
    lines.push(`${monthLabel}/${day}/${year}`)

    for (const event of events) {
      const text = typeof event?.text === 'string' ? event.text.trim() : ''
      if (!text) continue

      let line = `  - ${text}`

      if (event.completed) {
        line += ' [✓]'
      }

      const tags = Array.isArray(event.tags) ? event.tags.filter(Boolean) : []
      if (tags.length > 0) {
        line += ` #${tags.join(' #')}`
      }

      lines.push(line)
    }

    lines.push('')
  }

  const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
  return `${markdown}\n`
}

export function parseMarkdownDiary(raw = '') {
  const lines = String(raw ?? '').split(/\r?\n/)
  const scratchData = {}
  const metadata = {}

  let currentDateId = null
  let lastSavedTimestamp = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (line.startsWith('<!--') && line.endsWith('-->')) {
      const timestampMatch = line.match(TIMESTAMP_COMMENT_REGEX)
      if (timestampMatch) {
        const value = Number.parseInt(timestampMatch[1], 10)
        if (Number.isFinite(value)) {
          lastSavedTimestamp = value
        }
        metadata.lastSavedTimestamp = timestampMatch[1]
        continue
      }

      const metadataMatch = line.match(COMMENT_REGEX)
      if (metadataMatch) {
        const [, key, value] = metadataMatch
        if (key && value) {
          metadata[key] = value
        }
      }
      continue
    }

    if (line.startsWith('#')) {
      continue
    }

    const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dateMatch) {
      const month = Number.parseInt(dateMatch[1], 10)
      const day = Number.parseInt(dateMatch[2], 10)
      const year = Number.parseInt(dateMatch[3], 10)

      if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
        currentDateId = null
        continue
      }

      const monthIndex = month - 1
      if (monthIndex < 0 || monthIndex > 11) {
        currentDateId = null
        continue
      }

      currentDateId = `${monthIndex}_${day}_${year}`
      if (!scratchData[currentDateId]) {
        scratchData[currentDateId] = []
      }
      continue
    }

    if (!currentDateId) {
      continue
    }

    const bulletMatch = rawLine.match(/^\s*[-*]\s+(.*)$/)
    if (!bulletMatch) {
      continue
    }

    const remainder = bulletMatch[1].trim()
    if (!remainder) {
      continue
    }

    const parts = remainder.split(/\s+/)
    const tags = []
    while (parts.length > 0 && TAG_REGEX.test(parts[parts.length - 1])) {
      const match = parts.pop()
      if (!match) break
      const tag = match.replace(/^#/, '')
      if (tag) {
        tags.unshift(tag)
      }
    }

    let completed = false

    if (parts.length > 0 && parts[parts.length - 1] === '[✓]') {
      completed = true
      parts.pop()
    }

    const text = parts.join(' ').trim()
    if (!text) {
      continue
    }

    if (!scratchData[currentDateId]) {
      scratchData[currentDateId] = []
    }

    scratchData[currentDateId].push({
      text,
      completed,
      tags
    })
  }

  const calendarData = {}
  Object.entries(scratchData).forEach(([key, events]) => {
    calendarData[key] = normalizeEvents(Array.isArray(events) ? events : [])
  })

  return {
    calendarData,
    lastSavedTimestamp,
    metadata
  }
}
