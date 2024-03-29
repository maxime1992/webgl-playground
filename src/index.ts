import { startGame } from './game/game';
import { startGame2 } from './game/game2';
import { startGame3 } from './game/game3';
import { startGame4 } from './game/game4';

export { Shape } from './game/shapes.enum';

declare const module;

// avoid hot reload with Parcel
// https://github.com/parcel-bundler/parcel/issues/289#issuecomment-393106708
if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // startGame();
  // startGame2();
  // startGame3();
  startGame4();
});
