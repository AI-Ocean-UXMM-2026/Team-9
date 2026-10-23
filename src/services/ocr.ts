import { createWorker, OEM, type Worker } from 'tesseract.js';
import { parseReceiptText } from '../domain/receipt';

export interface OcrProgress {
  phase: 'loading' | 'reading';
  progress: number;
}

export async function extractReceiptLocally(
  image: File,
  language: 'eng' | 'eng+mya',
  signal: AbortSignal,
  onProgress: (value: OcrProgress) => void,
) {
  let worker: Worker | undefined;
  const canceled = () => new DOMException('Canceled', 'AbortError');
  const abort = () => {
    void worker?.terminate();
  };
  if (signal.aborted) throw canceled();
  signal.addEventListener('abort', abort, { once: true });
  const assets = new URL(
    'ocr/',
    new URL(import.meta.env.BASE_URL, document.baseURI),
  );
  try {
    worker = await createWorker(language, OEM.LSTM_ONLY, {
      workerPath: new URL('worker.min.js', assets).href,
      corePath: new URL('core/', assets).href,
      langPath: new URL('lang/', assets).href.replace(/\/$/, ''),
      workerBlobURL: false,
      cacheMethod: 'write',
      logger: ({ status, progress }) => {
        if (!signal.aborted)
          onProgress({
            phase: status === 'recognizing text' ? 'reading' : 'loading',
            progress,
          });
      },
      errorHandler: () => {
        /* The request promise reports failure to the screen. */
      },
    });
    if (signal.aborted) throw canceled();
    const { data } = await worker.recognize(image);
    if (signal.aborted) throw canceled();
    return parseReceiptText(data.text, data.confidence);
  } finally {
    signal.removeEventListener('abort', abort);
    if (worker) await worker.terminate().catch(() => undefined);
  }
}
