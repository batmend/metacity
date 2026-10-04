import { dataBytes, mapReady, mode, pickingLocation } from '../state/store';
import { formatBytes } from '../map/meter';

export function StatusBar() {
  return (
    <div class="statusbar">
      {pickingLocation.value ? (
        <span class="hint">📍 Газрын зураг дээр байршлаа дарж сонгоно уу</span>
      ) : (
        <>
          <span>{mapReady.value ? (mode.value === '3d' ? '3D горим' : '2D горим') : 'Ачаалж байна…'}</span>
          <span class="sep">·</span>
          <span title="Газрын зураг, фонт, өгөгдлийн хүсэлтээр татсан нийт хэмжээ">Татсан: {formatBytes(dataBytes.value)}</span>
          <span class="sep where">·</span>
          <span class="muted where">Сүхбаатарын талбай (демо)</span>
        </>
      )}
    </div>
  );
}
