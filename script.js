// Minimal Pac-Man clone (grid-based)
// Author: kvrae

const width = 15;
const gridElement = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const statusEl = document.getElementById('status');

let score = 0;
let lives = 3;
let isPowered = false;
let powerTimer = null;
let gameOver = false;

// Layout legend:
// 0 = dot (walkable)
// 1 = wall
// 2 = pacman start
// 3 = ghost start
// 4 = power pellet
// 5 = empty (walkable, no dot)
const layout = [
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,4,0,0,0,1,0,0,0,1,0,0,0,4,1,
  1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,
  1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,
  1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,
  1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,
  1,1,1,1,0,1,1,2,1,1,0,1,1,1,1,
  1,0,0,0,0,0,0,3,0,0,0,0,0,0,1,
  1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,
  1,4,0,0,0,1,0,0,0,1,0,0,0,4,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
];

const cells = [];
let pacmanIndex = layout.indexOf(2);
if (pacmanIndex === -1) pacmanIndex = (Math.floor(layout.length/2));
const ghostStarts = [];
layout.forEach((v,i) => { if (v === 3) ghostStarts.push(i); });

// directions as index offsets
const directions = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -width,
  ArrowDown: width
};

// create grid DOM
function createGrid() {
  gridElement.style.gridTemplateColumns = `repeat(${width}, var(--cell))`;
  gridElement.innerHTML = '';
    let powerPelletCount = 1; // Start a counter for the custom images

    for (let i = 0; i < layout.length; i++) {
        const div = document.createElement('div');
        div.classList.add('cell');
        // walls
        if (layout[i] === 1) div.classList.add('wall');
        // dot
        else if (layout[i] === 0) div.classList.add('dot');
        // power pellet <--- MODIFY THIS BLOCK
        else if (layout[i] === 4) {
            div.classList.add('power');
            // ADD UNIQUE CLASS HERE:
            div.classList.add(`power-${powerPelletCount}`);
            powerPelletCount++; // Increment the counter
        }
        // keep empties for walkable spaces
        gridElement.appendChild(div);
        cells.push(div);
    }
  // place pacman element
  const pac = document.createElement('div');
  pac.className = 'pacman';
  cells[pacmanIndex].appendChild(pac);

  // place ghosts
  ghosts.forEach((g, idx) => {
    const ghostEl = document.createElement('div');
    ghostEl.className = `ghost g${(idx%4)+1}`;
    ghostEl.dataset.id = idx;
    ghostEl.textContent = '';
    cells[g.index].appendChild(ghostEl);
    g.el = ghostEl;
  });
}

function updateHUD() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

function movePacman(directionKey) {
  if (gameOver) return;
  const offset = directions[directionKey];
  if (offset === undefined) return;
  const next = pacmanIndex + offset;
  // bounds checks (prevent wrapping rows)
  if (next < 0 || next >= layout.length) return;
  // row wrapping prevention
  if ((directionKey === 'ArrowLeft') && (next % width === width -1)) return;
  if ((directionKey === 'ArrowRight') && (next % width === 0)) return;
  // can't move into wall
  if (layout[next] === 1) return;

  // move DOM element
  const pacEl = document.querySelector('.pacman');
  if (pacEl) {
    cells[pacmanIndex].removeChild(pacEl);
    cells[next].appendChild(pacEl);
    // rotate pacman for feel
    const rotation = {
      ArrowLeft: 180,
      ArrowRight: 0,
      ArrowUp: 270,
      ArrowDown: 90
    }[directionKey] || 0;
    pacEl.style.transform = `rotate(${rotation}deg)`;
  }

  pacmanIndex = next;
  handleCell();
}

function handleCell() {
  const cellVal = layout[pacmanIndex];
  // eat dot
  if (cellVal === 0) {
    layout[pacmanIndex] = 5;
    cells[pacmanIndex].classList.remove('dot');
    score += 10;
  }
  // power pellet
  if (cellVal === 4) {
    layout[pacmanIndex] = 5;
    cells[pacmanIndex].classList.remove('power');
    score += 50;
    startPowerMode();
  }

  updateHUD();
  checkGhostCollision();
  checkWin();
}

function startPowerMode(){
  isPowered = true;
  // mark ghosts frightened
  ghosts.forEach(g => {
    if (!g.dead) g.state = 'frightened';
    if (g.el) g.el.classList.add('frightened');
  });
  if (powerTimer) clearTimeout(powerTimer);
  powerTimer = setTimeout(endPowerMode, 8000);
}

function endPowerMode(){
  isPowered = false;
  ghosts.forEach(g => {
    if (!g.dead) g.state = 'normal';
    if (g.el) g.el.classList.remove('frightened');
  });
  powerTimer = null;
}

function checkGhostCollision(){
  ghosts.forEach(g => {
    if (g.index === pacmanIndex && !g.dead) {
      if (g.state === 'frightened') {
        // eat ghost
        score += 200;
        g.dead = true;
        // show eaten state (eyes)
        if (g.el) {
          g.el.classList.add('eaten');
          g.el.innerHTML = '';
        }
        // send back to start after short delay
        setTimeout(() => {
          g.index = g.start;
          g.dead = false;
          if (g.el) {
            g.el.classList.remove('eaten','frightened');
            g.el.style.opacity = '1';
          }
          g.state = 'normal';
        }, 3000);
      } else {
        // Pacman loses a life
        loseLife();
      }
    }
  });
}

function loseLife() {
  lives -= 1;
  updateHUD();
  statusEl.textContent = 'You died!';
  if (lives <= 0) {
    endGame(false);
    return;
  }
  // reset positions briefly
  resetPositions();
  setTimeout(() => { statusEl.textContent = ''; }, 1000);
}

function resetPositions(){
  // place pacman back to start
  const pacEl = document.querySelector('.pacman');
  if (pacEl) {
    cells[pacmanIndex].removeChild(pacEl);
    pacmanIndex = layout.indexOf(2);
    if (pacmanIndex === -1) pacmanIndex = Math.floor(layout.length/2);
    cells[pacmanIndex].appendChild(pacEl);
  }
  // reset ghosts
  ghosts.forEach((g, idx) => {
    g.index = g.start;
    g.dead = false;
    g.state = 'normal';
    if (g.el) {
      // move element
      const parent = g.el.parentElement;
      if (parent) parent.removeChild(g.el);
      cells[g.index].appendChild(g.el);
      g.el.classList.remove('frightened','eaten');
    }
  });
}

function checkWin(){
  // win when no dots or power pellets left
  const remaining = layout.some(v => v === 0 || v === 4);
  if (!remaining) {
    endGame(true);
  }
}

function endGame(won) {
  gameOver = true;
  statusEl.textContent = won ? 'You win! 🎉' : 'Game Over';
  clearInterval(ghostInterval);
  if (powerTimer) clearTimeout(powerTimer);
}

// Ghosts
const ghosts = ghostStarts.map((startIdx, n) => ({
  start: startIdx,
  index: startIdx,
  el: null,
  state: 'normal', // normal | frightened
  dead: false,
  id: n
}));

// initial create
createGrid();
updateHUD();

// move ghosts randomly at interval
function randomDirectionFor(ghost) {
  const possible = [];
  const offsets = [-1,1,-width,width];
  offsets.forEach(o => {
    const next = ghost.index + o;
    if (next < 0 || next >= layout.length) return;
    if ((o === -1) && (next % width === width -1)) return;
    if ((o === 1) && (next % width === 0)) return;
    if (layout[next] !== 1) possible.push(o);
  });
  if (possible.length === 0) return 0;
  // prefer continuing same rough direction sometimes (not tracked here)
  return possible[Math.floor(Math.random()*possible.length)];
}

function moveGhosts() {
  ghosts.forEach(g => {
    if (g.dead) return; // stationary until respawn
    const dir = randomDirectionFor(g);
    if (!dir) return;
    const next = g.index + dir;
    // move DOM
    if (g.el) {
      const parent = g.el.parentElement;
      if (parent) parent.removeChild(g.el);
      cells[next].appendChild(g.el);
    }
    g.index = next;
  });
  checkGhostCollision();
}

const ghostInterval = setInterval(() => {
  if (!gameOver) moveGhosts();
}, 450);

// input handling
window.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault();
    movePacman(e.key);
  }
});

// allow clicking on grid to restart after gameover
gridElement.addEventListener('click', () => {
  if (gameOver) {
    // reset entire game
    window.location.reload();
  }
});

// --- INPUT HANDLING (JavaScript Implementation) ---

// 1. Keyboard Input (for desktop)
window.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault();
        movePacman(e.key);
    }
});

// 2. D-Pad Input (for mobile)
// These listeners connect the D-pad buttons (styled by your selected CSS) to the game logic.
document.getElementById('dpad-up').addEventListener('click', () => movePacman('ArrowUp'));
document.getElementById('dpad-down').addEventListener('click', () => movePacman('ArrowDown'));
document.getElementById('dpad-left').addEventListener('click', () => movePacman('ArrowLeft'));
document.getElementById('dpad-right').addEventListener('click', () => movePacman('ArrowRight'));
// The center button is currently inactive, but ready for a 'pause' function.

// allow clicking on grid to restart after gameover
gridElement.addEventListener('click', () => {
    if (gameOver) {
        // reset entire game
        window.location.reload();
    }
});