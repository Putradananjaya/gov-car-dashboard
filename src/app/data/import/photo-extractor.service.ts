import { Injectable, signal } from '@angular/core';
import { ExtractedPhoto, ExtractRequest, WorkerResponse } from './photo-extractor.worker';

@Injectable({ providedIn: 'root' })
export class PhotoExtractorService {
  public progressDone = signal(0);
  public progressTotal = signal(0);

  /** Ekstrak & kompres semua foto tertanam di berkas .xlsx lewat Web Worker. */
  public extractPhotos(buffer: ArrayBuffer): Promise<ExtractedPhoto[]> {
    this.progressDone.set(0);
    this.progressTotal.set(0);

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./photo-extractor.worker', import.meta.url), { type: 'module' });

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.type === 'progress') {
          this.progressDone.set(message.done);
          this.progressTotal.set(message.total);
        } else if (message.type === 'result') {
          worker.terminate();
          resolve(message.photos);
        } else if (message.type === 'error') {
          worker.terminate();
          reject(new Error(message.message));
        }
      };

      worker.onerror = (event) => {
        worker.terminate();
        reject(new Error(event.message || 'Worker ekstraksi foto gagal.'));
      };

      // Kirim salinan supaya buffer asli (dipakai parseEbmdWorkbook di
      // langkah sebelumnya) tidak ikut ter-detach oleh transfer.
      const bufferCopy = buffer.slice(0);
      const request: ExtractRequest = { type: 'extract', buffer: bufferCopy };
      worker.postMessage(request, [bufferCopy]);
    });
  }
}
