const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

const brushSlider = document.getElementById("brushSlider");
const sizeDisplay = document.getElementById("sizeDisplay");
const fpsSlider = document.getElementById("fpsSlider");
const fpsDisplay = document.getElementById("fpsDisplay");
const thinBtn = document.getElementById("thinBtn");
const clearBtn = document.getElementById("clearBtn");

let grid = new Uint8Array(width * height);
let brushSize = 5;
let currentFPS = 30;
let thinInterval = null;

function index(x, y) {
  return y * width + x;
}

function get(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0;
  return grid[index(x, y)];
}

function set(x, y, val) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  grid[index(x, y)] = val;
}

brushSlider.addEventListener("input", (e) => {
  brushSize = parseInt(e.target.value);
  sizeDisplay.textContent = brushSize;
});

fpsSlider.addEventListener("input", (e) => {
  currentFPS = parseInt(e.target.value);
  fpsDisplay.textContent = currentFPS;
  if (thinInterval) {
    startThinning();
  }
});

function render() {
  const imgData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = get(x, y) ? 255 : 0;
      const idx = (y * width + x) * 4;
      imgData.data[idx] = val;
      imgData.data[idx + 1] = val;
      imgData.data[idx + 2] = val;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

let isDrawing = false;
let lastX = -1;
let lastY = -1;

function getCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: Math.floor((clientX - rect.left) * (width / rect.width)),
    y: Math.floor((clientY - rect.top) * (height / rect.height)),
  };
}

function drawCircle(centerX, centerY) {
  const rSq = brushSize * brushSize;
  for (let y = centerY - brushSize; y <= centerY + brushSize; y++) {
    for (let x = centerX - brushSize; x <= centerX + brushSize; x++) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= rSq) {
        set(x, y, 1);
      }
    }
  }
}

function drawLine(x1, y1, x2, y2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    drawCircle(x, y);
  }
}

function handleStart(e) {
  isDrawing = true;
  const { x, y } = getCoords(e);
  lastX = x;
  lastY = y;
  drawCircle(x, y);
  render();
}

function handleMove(e) {
  if (!isDrawing) return;
  const { x, y } = getCoords(e);
  drawLine(lastX, lastY, x, y);
  lastX = x;
  lastY = y;
  render();
}

function handleEnd() {
  isDrawing = false;
}

canvas.addEventListener("mousedown", handleStart);
window.addEventListener("mouseup", handleEnd);
canvas.addEventListener("mousemove", handleMove);

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handleStart(e);
  },
  { passive: false },
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    handleMove(e);
  },
  { passive: false },
);

canvas.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault();
    handleEnd();
  },
  { passive: false },
);

clearBtn.onclick = () => {
  grid.fill(0);
  render();
};

function startThinning() {
  if (thinInterval) clearInterval(thinInterval);
  thinInterval = setInterval(() => {
    const pixelsChanged = thin();
    render();
    if (pixelsChanged === 0) {
      stopThinning();
    }
  }, 1000 / currentFPS);
  thinBtn.textContent = "Stop Thinning";
}

function stopThinning() {
  if (thinInterval) {
    clearInterval(thinInterval);
    thinInterval = null;
  }
  thinBtn.textContent = "Start Thinning";
}

thinBtn.addEventListener("click", () => {
  if (thinInterval) {
    stopThinning();
  } else {
    startThinning();
  }
});

function thin() {
  let pixelsChanged = 0;
  let marked = operation_1();
  pixelsChanged += marked.length;
  for (let i = 0; i < marked.length; i++) {
    set(marked[i][0], marked[i][1], 0);
  }
  marked = operation_2();
  pixelsChanged += marked.length;
  for (let i = 0; i < marked.length; i++) {
    set(marked[i][0], marked[i][1], 0);
  }
  return pixelsChanged;
}

function operation_1() {
  let marked = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let neighbors = get_neighbors(x, y);
      if (get(x, y) !== 1) continue;
      let b = neighbors.reduce((acc, curr) => acc + curr, 0);
      if (b < 2 || b > 6) continue;
      let a = 0;
      for (let z = 0; z < neighbors.length; z++) {
        if (neighbors[z] === 0 && neighbors[(z + 1) % neighbors.length] == 1)
          a += 1;
      }
      if (a !== 1) continue;
      if (neighbors[0] * neighbors[2] * neighbors[4] !== 0) continue;
      if (neighbors[2] * neighbors[4] * neighbors[6] !== 0) continue;
      marked.push([x, y]);
    }
  }
  return marked;
}

function operation_2() {
  let marked = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let neighbors = get_neighbors(x, y);
      if (get(x, y) !== 1) continue;
      let b = neighbors.reduce((acc, curr) => acc + curr, 0);
      if (b < 2 || b > 6) continue;
      let a = 0;
      for (let z = 0; z < neighbors.length; z++) {
        if (neighbors[z] === 0 && neighbors[(z + 1) % neighbors.length] == 1)
          a += 1;
      }
      if (a !== 1) continue;
      if (neighbors[0] * neighbors[2] * neighbors[6] !== 0) continue;
      if (neighbors[0] * neighbors[4] * neighbors[6] !== 0) continue;
      marked.push([x, y]);
    }
  }
  return marked;
}

function get_neighbors(x, y) {
  return [
    get(x, y - 1),
    get(x + 1, y - 1),
    get(x + 1, y),
    get(x + 1, y + 1),
    get(x, y + 1),
    get(x - 1, y + 1),
    get(x - 1, y),
    get(x - 1, y - 1),
  ];
}

render();
