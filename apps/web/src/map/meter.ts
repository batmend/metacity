/**
 * Өгөгдлийн хэмжүүр: газрын зургийн tile, фонт, өгөгдлийн хүсэлтээр
 * татсан байтыг тоолно. Хэрэглэгчид "хэдийг татав" гэдгийг ил харуулах,
 * мөн "хот томроход дата өсөхгүй" зарчмыг хэмжих зорилготой.
 */
import { dataBytes } from '../state/store';

const COUNTED = ['/tiles/', '/fonts/', '/data/'];

export function installDataMeter(): void {
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await original(input, init);
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (COUNTED.some((p) => url.includes(p))) {
        const len = Number(res.headers.get('content-length') ?? 0);
        if (len > 0) dataBytes.value += len;
        else {
          // content-length байхгүй бол clone-оор уншиж тоолно
          res
            .clone()
            .arrayBuffer()
            .then((b) => {
              dataBytes.value += b.byteLength;
            })
            .catch(() => {});
        }
      }
    } catch {
      /* тоолох алдаа хүсэлтэд нөлөөлөхгүй */
    }
    return res;
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
