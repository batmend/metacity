import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './ui/App';
import { installDataMeter } from './map/meter';
import { installPrompt } from './state/store';

installDataMeter();

// PWA: суулгах санал (Chrome/Edge/Android)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  const ev = e as Event & { prompt: () => Promise<void> };
  installPrompt.value = async () => {
    await ev.prompt();
    installPrompt.value = null;
  };
});

registerSW({ immediate: true });

render(<App />, document.getElementById('app')!);
