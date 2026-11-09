// App entry point: build the demo binder and show it.
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';

const app = document.getElementById('app');

// Testing shortcuts: ?open opens at page 1, ?page=3 opens at page 3
const params = new URLSearchParams(location.search);
const startPage = Number(params.get('page')) || (params.has('open') ? 1 : 0); // rounded and kept in range by mountBinder

mountBinder(app, createSampleBinder(), { startPage });
