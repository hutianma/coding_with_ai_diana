// App entry point: build the demo binder and show it.
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';

const app = document.getElementById('app');

// Adding ?open to the link skips the cover (handy for testing)
const startOpen = new URLSearchParams(location.search).has('open');

mountBinder(app, createSampleBinder(), { startOpen });
