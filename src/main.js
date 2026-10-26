// App entry point: build the demo binder and show it.
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';

const app = document.getElementById('app');

// Testing shortcuts: ?open skips the cover, ?page=3 opens at page 3
const params = new URLSearchParams(location.search);
const startOpen = params.has('open') || params.has('page');
const startPage = Number(params.get('page')) || 1;

mountBinder(app, createSampleBinder(), { startOpen, startPage });
