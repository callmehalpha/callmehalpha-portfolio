import { extractText, isSupportedCv, normaliseText } from './text-extract';

describe('CV text extraction', () => {
  it('accepts pdf, docx and markdown CVs only', () => {
    expect(isSupportedCv('cv.PDF')).toBe(true);
    expect(isSupportedCv('cv.docx')).toBe(true);
    expect(isSupportedCv('cv.md')).toBe(true);
    expect(isSupportedCv('cv.pages')).toBe(false);
    expect(isSupportedCv('cv')).toBe(false);
  });

  it('normalises whitespace but keeps paragraphs', () => {
    expect(normaliseText('  A\t\tB \r\n\r\n\r\n\r\n C  ')).toBe('A B\n\nC');
  });

  it('reads markdown CVs as text', async () => {
    expect(await extractText('cv.md', Buffer.from('# Name\n\n\n\nRole'))).toBe('# Name\n\nRole');
  });

  it('refuses unsupported formats', async () => {
    await expect(extractText('cv.pages', Buffer.from(''))).rejects.toThrow(/Unsupported CV format/);
  });
});
