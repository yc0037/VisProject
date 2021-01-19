import { initMain } from './map.js';
import { initBottom } from './bottom.js';
// //import { initSide } from './matrix.js';
import { initDest } from './dest.js';

async function main() {
  initBottom();
  //initSide();
  initDest();
  initMain(2020.83,12.067);
}

main();