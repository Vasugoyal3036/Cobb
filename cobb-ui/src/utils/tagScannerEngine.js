/**
 * Advanced Multi-Modal Tag Scanner Engine
 * 1. Hardware-accelerated native BarcodeDetector (instant ~10ms 60 FPS barcode decoding)
 * 2. html5-qrcode cross-platform fallback
 * 3. Tag Number OCR (extracts printed human-readable barcode numbers & article codes right beneath the barcode lines)
 */

let cachedWorker = null;
let isWorkerInitializing = false;

/**
 * Checks whether native BarcodeDetector API is supported in the current browser
 */
export const isNativeBarcodeDetectorSupported = () => {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
};

/**
 * Creates or gets native BarcodeDetector instance configured for retail apparel barcodes
 */
export const getNativeBarcodeDetector = () => {
  if (!isNativeBarcodeDetectorSupported()) return null;
  try {
    return new window.BarcodeDetector({
      formats: [
        'code_128',
        'ean_13',
        'ean_8',
        'code_39',
        'upc_a',
        'upc_e',
        'qr_code'
      ]
    });
  } catch (err) {
    console.warn('[TagScanner] Native BarcodeDetector instantiation failed:', err);
    return null;
  }
};

/**
 * Parse raw text / OCR result to extract 10-digit Cobb item code, 13-digit EAN, or article code
 */
export const parseTagNumbers = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.replace(/[\r\n\t]/g, ' ').toUpperCase();

  // 1. Look for 10-14 digit numeric strings (Cobb Product Code or EAN)
  const numericMatches = clean.match(/\b\d{8,14}\b/g);
  if (numericMatches && numericMatches.length > 0) {
    // Prefer 10 (Cobb internal) or 13 (EAN-13) digit barcodes
    const best = numericMatches.find(m => m.length === 10 || m.length === 13) || numericMatches[0];
    return { type: 'barcode', value: best };
  }

  // 2. Look for Cobb article codes like FSRE4214, CS-4029, BLZ-102, CAS2021
  const articleMatches = clean.match(/\b[A-Z]{2,6}-?[0-9]{2,6}\b/g);
  if (articleMatches && articleMatches.length > 0) {
    return { type: 'article', value: articleMatches[0].replace(/-/g, '') };
  }

  // 3. Fallback: Any sequence of 6+ digits
  const fallbackDigits = clean.match(/\b\d{6,7}\b/g);
  if (fallbackDigits && fallbackDigits.length > 0) {
    return { type: 'barcode', value: fallbackDigits[0] };
  }

  return null;
};

/**
 * Preprocess and crop video frame onto an off-screen canvas for high-accuracy OCR
 */
export const cropAndPreprocessFrame = (videoElement, cropRatio = { x: 0.1, y: 0.25, width: 0.8, height: 0.5 }) => {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;

  const sx = Math.floor(vw * cropRatio.x);
  const sy = Math.floor(vh * cropRatio.y);
  const sw = Math.floor(vw * cropRatio.width);
  const sh = Math.floor(vh * cropRatio.height);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Draw cropped frame
  ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, sw, sh);

  // Apply high-contrast binarization for crisp dark numbers on white tags
  try {
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      // Grayscale
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Contrast stretch
      const val = gray < 130 ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    // Non-fatal, use raw frame
  }

  return canvas;
};

/**
 * Lazy initialize Tesseract worker in the background
 */
export const getOcrWorker = async () => {
  if (cachedWorker) return cachedWorker;
  if (isWorkerInitializing) {
    // Wait briefly for in-progress initialization
    await new Promise(r => setTimeout(r, 200));
    return cachedWorker;
  }

  try {
    isWorkerInitializing = true;
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-',
      tessedit_pageseg_mode: '7' // Single text line / single block
    });
    cachedWorker = worker;
    return cachedWorker;
  } catch (err) {
    console.warn('[TagScanner] Failed to initialize Tesseract worker:', err);
    return null;
  } finally {
    isWorkerInitializing = false;
  }
};

/**
 * Recognize printed barcode numbers or article codes from a video element
 */
export const recognizeNumbersFromVideo = async (videoElement) => {
  if (!videoElement) return null;

  // 1. Try native experimental TextDetector if present in Chromium
  if (typeof window !== 'undefined' && 'TextDetector' in window) {
    try {
      const textDetector = new window.TextDetector();
      const detected = await textDetector.detect(videoElement);
      if (detected && detected.length > 0) {
        for (const item of detected) {
          const parsed = parseTagNumbers(item.rawValue);
          if (parsed) return parsed;
        }
      }
    } catch {}
  }

  // 2. Crop and process target reticle area
  const canvas = cropAndPreprocessFrame(videoElement);
  if (!canvas) return null;

  // 3. Run OCR on cropped frame
  const worker = await getOcrWorker();
  if (!worker) return null;

  try {
    const res = await worker.recognize(canvas);
    if (res?.data?.text) {
      return parseTagNumbers(res.data.text);
    }
  } catch (ocrErr) {
    console.warn('[TagScanner OCR Error]', ocrErr);
  }

  return null;
};

/**
 * Terminate background OCR worker on unmount
 */
export const terminateOcrWorker = async () => {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {}
    cachedWorker = null;
  }
};
