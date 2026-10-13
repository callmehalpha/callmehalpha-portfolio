import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ENV, Env } from '../config/env';

/** HTML → PDF through Gotenberg's headless Chromium (a separate container, so Chromium stays out of the backend). */
@Injectable()
export class GotenbergClient {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async htmlToPdf(html: string): Promise<Buffer> {
    if (!this.env.GOTENBERG_URL) throw new ServiceUnavailableException('GOTENBERG_URL is not configured');
    const form = new FormData();
    form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
    form.append('preferCssPageSize', 'true'); // the template's @page sets A4 and the margins
    form.append('printBackground', 'true');
    form.append('emulatedMediaType', 'print');

    const res = await fetch(`${this.env.GOTENBERG_URL.replace(/\/+$/, '')}/forms/chromium/convert/html`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new ServiceUnavailableException(`Gotenberg returned HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const pdf = Buffer.from(await res.arrayBuffer());
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new ServiceUnavailableException('Gotenberg did not return a PDF');
    return pdf;
  }
}

export async function countPages(pdf: Buffer): Promise<number | null> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(pdf) });
    try {
      return (await parser.getInfo()).total;
    } finally {
      await parser.destroy();
    }
  } catch {
    return null;
  }
}
