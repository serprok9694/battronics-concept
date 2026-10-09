import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './app/global.css';
import { Providers } from './app/providers';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
