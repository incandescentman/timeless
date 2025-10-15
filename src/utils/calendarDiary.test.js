import { describe, it, expect } from 'vitest';
import { formatCalendarAsMarkdown, parseMarkdownDiary } from './calendarDiary.js';

const realisticDiaryContent = `
# 2024
## October 2024
10/15/2024
  - A regular event
  - A completed event [✓]
  - An event with tags #tags #multiple-tags

<!-- lastSavedTimestamp: 1678886400000 -->

## November 2024
11/1/2024
  - Another event #project-alpha
`;

const parsedRealisticDiary = {
  calendarData: {
    '9_15_2024': [
      { id: expect.any(String), text: 'A regular event', completed: false, tags: [] },
      { id: expect.any(String), text: 'A completed event', completed: true, tags: [] },
      { id: expect.any(String), text: 'An event with tags', completed: false, tags: ['tags', 'multiple-tags'] }
    ],
    '10_1_2024': [
      { id: expect.any(String), text: 'Another event', completed: false, tags: ['project-alpha'] }
    ]
  },
  lastSavedTimestamp: 1678886400000,
  metadata: { lastSavedTimestamp: '1678886400000' }
};

// The `normalizeEvents` function adds a unique `id` to each event.
// When we do a round-trip test, the IDs won't match exactly if they are regenerated.
// This helper removes the `id` for comparison purposes.
const stripEventIds = (calendarData) => {
  const newCalendarData = {};
  for (const date in calendarData) {
    newCalendarData[date] = calendarData[date].map(({ id, ...rest }) => rest);
  }
  return newCalendarData;
};


describe('calendarDiary', () => {
  describe('parseMarkdownDiary', () => {
    it('should parse a realistic diary with mixed content', () => {
      const { calendarData, lastSavedTimestamp, metadata } = parseMarkdownDiary(realisticDiaryContent);
      const calendarDataWithoutIds = stripEventIds(calendarData);
      const expectedCalendarDataWithoutIds = stripEventIds(parsedRealisticDiary.calendarData);


      expect(calendarDataWithoutIds['9_15_2024']).toEqual(expect.arrayContaining(expectedCalendarDataWithoutIds['9_15_2024']));
      expect(calendarDataWithoutIds['10_1_2024']).toEqual(expect.arrayContaining(expectedCalendarDataWithoutIds['10_1_2024']));
      expect(lastSavedTimestamp).toBe(parsedRealisticDiary.lastSavedTimestamp);
      expect(metadata).toEqual(parsedRealisticDiary.metadata);
    });

    it('should handle empty input', () => {
      const { calendarData, lastSavedTimestamp } = parseMarkdownDiary('');
      expect(Object.keys(calendarData).length).toBe(0);
      expect(lastSavedTimestamp).toBe(0);
    });

    it('should handle input with no events', () => {
        const diaryContent = `# 2024

## October 2024

<!-- lastSavedTimestamp: 1678886400000 -->
`;
        const { calendarData, lastSavedTimestamp } = parseMarkdownDiary(diaryContent);
        expect(Object.keys(calendarData).length).toBe(0);
        expect(lastSavedTimestamp).toBe(1678886400000);
    });

    it('should ignore malformed lines', () => {
        const diaryContent = `
This is not a valid line.
10/15/2024
  - Valid event
  This is also not a valid event line.
`;
        const { calendarData } = parseMarkdownDiary(diaryContent);
        expect(calendarData['9_15_2024'].length).toBe(1);
        expect(calendarData['9_15_2024'][0].text).toBe('Valid event');
    });

    it('should handle various whitespace', () => {
        const diaryContent = `
  10/15/2024

    -   Event with weird spacing   [✓]   #tag1  
`;
        const { calendarData } = parseMarkdownDiary(diaryContent);
        expect(calendarData['9_15_2024'][0]).toEqual(expect.objectContaining({
            text: 'Event with weird spacing',
            completed: true,
            tags: ['tag1']
        }));
    });
  });

  describe('formatCalendarAsMarkdown', () => {
    it('should format calendar data into a markdown string', () => {
        const calendarData = {
            '9_15_2024': [
                { text: 'A regular event', completed: false, tags: [] },
                { text: 'A completed event', completed: true, tags: [] },
            ],
            '10_1_2024': [
                { text: 'Another event', completed: false, tags: ['project-alpha'] }
            ]
        };
        const timestamp = 1678886400000;
        const markdown = formatCalendarAsMarkdown(calendarData, timestamp);

        expect(markdown).toContain('<!-- lastSavedTimestamp: 1678886400000 -->');
        expect(markdown).toContain('# 2024');
        expect(markdown).toContain('## October 2024');
        expect(markdown).toContain('10/15/2024');
        expect(markdown).toContain('  - A regular event');
        expect(markdown).toContain('  - A completed event [✓]');
        expect(markdown).toContain('## November 2024');
        expect(markdown).toContain('11/1/2024');
        expect(markdown).toContain('  - Another event #project-alpha');
    });

    it('should handle empty calendar data', () => {
        const markdown = formatCalendarAsMarkdown({}, 123);
        expect(markdown).toBe('<!-- lastSavedTimestamp: 123 -->\n');
    });
  });

  describe('Round-trip', () => {
    it('should return the same data after format and parse', () => {
        const originalCalendarData = {
            '9_15_2024': [
                { text: 'A regular event', completed: false, tags: [] },
                { text: 'A completed event with tags', completed: true, tags: ['tag1'] },
                { text: 'Event with tags', completed: false, tags: ['tag1', 'tag2-more'] },
            ],
        };
        const timestamp = 1678886400000;

        const markdown = formatCalendarAsMarkdown(originalCalendarData, timestamp);
        const { calendarData: parsedCalendarData, lastSavedTimestamp } = parseMarkdownDiary(markdown);
        
        const originalDataWithoutIds = stripEventIds(originalCalendarData);
        const parsedDataWithoutIds = stripEventIds(parsedCalendarData);

        expect(parsedDataWithoutIds).toEqual(originalDataWithoutIds);
        expect(lastSavedTimestamp).toEqual(timestamp);
    });
  });
});
