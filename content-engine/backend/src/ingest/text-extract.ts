import { extname } from 'path';

export const CV_EXTENSIONS = ['.pdf', '.docx', '.md', '.markdown', '.txt'] as const;

export function isSupportedCv(filename: string): boolean {
  return (CV_EXTENSIONS as readonly string[]).includes(extname(filename).toLowerCase());
}

/** Collapses the whitespace PDF/DOCX extraction leaves behind, keeping paragraph breaks. */
export function normaliseText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractText(filename: string, data: Buffer): Promise<string> {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf': {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(data) });
      try {
        return normaliseText((await parser.getText()).text);
      } finally {
        await parser.destroy();
      }
    }
    case '.docx': {
      const mammoth = await import('mammoth');
      return normaliseText((await mammoth.extractRawText({ buffer: data })).value);
    }
    case '.md':
    case '.markdown':
    case '.txt':
      return normaliseText(data.toString('utf8'));
    default:
      throw new Error(`Unsupported CV format "${ext || filename}"`);
  }
}
