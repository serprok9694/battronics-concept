import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// MapLibre 6 locates its worker relative to its own module URL, which breaks
// under Vite dependency pre-bundling and in production builds. Point it at the
// worker file explicitly; Vite emits it as a hashed asset.
setWorkerUrl(workerUrl);
