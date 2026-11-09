// App entry point: build the demo binder and show it.
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';

const app = document.getElementById('app');

// Testing shortcuts: ?open opens at page 1, ?page=3 opens at page 3
const params = new URLSearchParams(location.search);
// (rounded and kept in range by mountBinder)
let startPage = 0;
if (params.has('page')) startPage = Number(params.get('page')) || 1;
else if (params.has('open')) startPage = 1;

mountBinder(app, createSampleBinder(), { startPage });
