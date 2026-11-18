// extension/offscreen.js
// 100% Offline in-extension ONNX Captcha Solver for Student Portal
// Zero external network requests, zero backend dependency.

let onnxSessionPromise = null;
let charsetsCache = null;

async function getCharsets() {
  if (!charsetsCache) {
    const res = await fetch(chrome.runtime.getURL('lib/onnx/charsets.json'));
    charsetsCache = await res.json();
  }
  return charsetsCache;
}

async function getOnnxSession() {
  if (!onnxSessionPromise) {
    onnxSessionPromise = (async () => {
      // Point wasm paths to extension bundled wasm binaries
      ort.env.wasm.wasmPaths = chrome.runtime.getURL('lib/onnx/');
      ort.env.wasm.numThreads = 1;

      const modelUrl = chrome.runtime.getURL('lib/onnx/common_old.onnx');
      const response = await fetch(modelUrl);
      const modelBuffer = await response.arrayBuffer();

      const session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm']
      });
      console.log('[Unfugly Offscreen] In-extension ONNX session initialized successfully');
      return session;
    })().catch((err) => {
      onnxSessionPromise = null;
      console.error('[Unfugly Offscreen] Failed to initialize ONNX session:', err);
      throw err;
    });
  }
  return onnxSessionPromise;
}

// Preprocessing: Bilinear resize to height 64 and normalize to grayscale Float32Array [1, 1, 64, targetWidth]
function preprocessImage(img, targetHeight = 64) {
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;
  const targetWidth = Math.max(1, Math.floor(origWidth * (targetHeight / origHeight)));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
  const tensorData = new Float32Array(targetHeight * targetWidth);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3] / 255.0;
      const gray = (0.299 * r + 0.587 * g + 0.114 * b) * a + 255 * (1 - a);
      tensorData[y * targetWidth + x] = gray / 255.0;
    }
  }

  return { tensorData, targetWidth, targetHeight };
}

// Greedy CTC collapse decoding
function ctcDecode(outputData, dims, charsets) {
  const seqLen = dims[0] === 1 ? dims[1] : dims[0];
  const numClasses = dims[dims.length - 1];

  const predictedIndices = [];
  for (let t = 0; t < seqLen; t++) {
    let maxVal = -Infinity;
    let maxIdx = 0;
    const offset = t * numClasses;
    for (let c = 0; c < numClasses; c++) {
      const val = outputData[offset + c];
      if (val > maxVal) {
        maxVal = val;
        maxIdx = c;
      }
    }
    predictedIndices.push(maxIdx);
  }

  const decoded = [];
  let prev = null;
  for (const idx of predictedIndices) {
    if (idx !== prev) {
      if (idx !== 0 && idx < charsets.length) {
        decoded.push(charsets[idx]);
      }
    }
    prev = idx;
  }

  return decoded.join('');
}

async function solveCaptchaLocal(imageBase64) {
  const startTime = Date.now();
  const session = await getOnnxSession();
  const charsets = await getCharsets();

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageBase64;
  });

  const { tensorData, targetWidth, targetHeight } = preprocessImage(img, 64);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 1, targetHeight, targetWidth]);

  const results = await session.run({ input1: inputTensor });
  const outputTensor = results[387] || Object.values(results)[0];

  const rawText = ctcDecode(outputTensor.data, outputTensor.dims, charsets);
  const clean = (rawText || '').replace(/[^a-zA-Z0-9]/g, '').trim();
  const duration = `${Date.now() - startTime}ms`;

  console.log(`[Unfugly Offscreen] Solved captcha: "${clean}" in ${duration}`);
  return { success: true, text: clean, duration };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'offscreen' && request.action === 'solve_sp_captcha_local') {
    solveCaptchaLocal(request.imageBase64)
      .then((res) => sendResponse(res))
      .catch((err) => {
        console.error('[Unfugly Offscreen] Solve error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }
});
