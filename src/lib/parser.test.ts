import { describe, expect, it, vi } from 'vitest';
import { extractText, sectionText } from './parser';
import mammoth from 'mammoth';

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({ value: 'Extracted DOCX Content' }),
  },
}));

describe('Parser and Sectioner', () => {
  describe('extractText', () => {
    it('extracts plain text for txt and md extension', async () => {
      const buffer = Buffer.from('Hello Plain Text');
      const text = await extractText(buffer, 'text/plain', 'test.txt');
      expect(text).toBe('Hello Plain Text');
    });

    it('extracts docx content using mammoth', async () => {
      const buffer = Buffer.from('dummy docx buffer');
      const text = await extractText(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'test.docx');
      expect(text).toBe('Extracted DOCX Content');
      expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
    });
  });

  describe('sectionText', () => {
    it('sections markdown correctly by headings', () => {
      const mdContent = `# First Heading
This is content under first heading.

## Second Heading
Some other content.
`;
      const sections = sectionText(mdContent);
      expect(sections.length).toBe(2);
      expect(sections[0].heading).toBe('First Heading');
      expect(sections[0].content).toContain('This is content under first heading.');
      expect(sections[0].ordinal).toBe(1);
      
      expect(sections[1].heading).toBe('Second Heading');
      expect(sections[1].content).toContain('Some other content.');
      expect(sections[1].ordinal).toBe(2);
    });

    it('sections plain text by size chunks if no headings are present', () => {
      const textContent = 'A'.repeat(4000); // 4000 chars, should split into at least 2 sections
      const sections = sectionText(textContent);
      expect(sections.length).toBeGreaterThan(1);
      expect(sections[0].heading).toBe('Section 1');
      expect(sections[0].content.length).toBeLessThanOrEqual(2000);
    });
  });
});
