/** Node орчинд PMTiles архив унших Source-ууд (pmtiles lib-ийн Source интерфейс). */
import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import type { Source, RangeResponse } from 'pmtiles';

export class MemorySource implements Source {
  constructor(private readonly bytes: Uint8Array) {}
  getKey(): string {
    return 'memory';
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const slice = this.bytes.slice(offset, offset + length);
    return { data: slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength) as ArrayBuffer };
  }
}

export class NodeFileSource implements Source {
  private readonly fd: number;
  readonly size: number;
  constructor(private readonly path: string) {
    this.fd = openSync(path, 'r');
    this.size = fstatSync(this.fd).size;
  }
  getKey(): string {
    return this.path;
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const buf = new Uint8Array(Math.min(length, Math.max(0, this.size - offset)));
    readSync(this.fd, buf, 0, buf.length, offset);
    return { data: buf.buffer as ArrayBuffer };
  }
  close(): void {
    closeSync(this.fd);
  }
}
