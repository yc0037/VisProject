import { initMain } from './map.js';
import { initBottom } from './bottom.js';
import { initSide } from './matrix.js';

async function main() {
  initBottom();
  initSide();
  initMain();
}

main();