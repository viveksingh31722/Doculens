import mammoth from 'mammoth';

export interface ParsedSection {
  ordinal: number;
  heading: string | null;
  content: string;
  charStart: number;
  charEnd: number;
}

export async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // TXT or MD
  return buffer.toString('utf-8');
}

export function sectionText(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const normalizedText = text.replace(/\r\n/g, '\n');

  // Check if there are markdown headings (e.g., # Heading)
  const hasMdHeadings = /(?:^|\n)#{1,6}\s+.+/.test(normalizedText);

  if (hasMdHeadings) {
    const regex = /(?:^|\n)(#{1,6}\s+.+)/g;
    const parts = normalizedText.split(regex);
    let ordinal = 1;

    // If the first part before any heading has text, save it as Introduction
    if (parts[0] && parts[0].trim()) {
      const content = parts[0].trim();
      const start = normalizedText.indexOf(content);
      sections.push({
        ordinal: ordinal++,
        heading: 'Introduction',
        content,
        charStart: start,
        charEnd: start + content.length,
      });
    }

    let searchOffset = 0;
    for (let i = 1; i < parts.length; i += 2) {
      const headingLine = parts[i].trim();
      const heading = headingLine.replace(/^#+\s+/, '');
      const content = parts[i + 1] ? parts[i + 1].trim() : '';

      if (content) {
        const start = normalizedText.indexOf(headingLine, searchOffset);
        const end = start + headingLine.length + 1 + content.length;
        searchOffset = end;

        sections.push({
          ordinal: ordinal++,
          heading,
          content,
          charStart: start,
          charEnd: end,
        });
      }
    }
  }

  // If no markdown headings were processed, chunk text by size
  if (sections.length === 0) {
    const targetSize = 1750; // midpoint of 1500-2000
    let ordinal = 1;
    let index = 0;

    while (index < normalizedText.length) {
      let chunkEnd = index + targetSize;
      if (chunkEnd >= normalizedText.length) {
        chunkEnd = normalizedText.length;
      } else {
        // Try to find a good split point in the last 200 characters of the target size
        const searchRange = normalizedText.substring(chunkEnd - 200, chunkEnd);
        const lastDoubleNewline = searchRange.lastIndexOf('\n\n');
        const lastNewline = searchRange.lastIndexOf('\n');
        const lastPeriod = searchRange.lastIndexOf('. ');

        if (lastDoubleNewline !== -1) {
          chunkEnd = chunkEnd - 200 + lastDoubleNewline + 2;
        } else if (lastNewline !== -1) {
          chunkEnd = chunkEnd - 200 + lastNewline + 1;
        } else if (lastPeriod !== -1) {
          chunkEnd = chunkEnd - 200 + lastPeriod + 2;
        }
      }

      const content = normalizedText.substring(index, chunkEnd).trim();
      if (content) {
        sections.push({
          ordinal: ordinal++,
          heading: `Section ${ordinal - 1}`,
          content,
          charStart: index,
          charEnd: index + content.length,
        });
      }
      index = chunkEnd;
    }
  }

  return sections;
}
