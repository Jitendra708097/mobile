/**
 * @module faceService
 * @description Face detection and quality validation using
 *              @react-native-ml-kit/face-detection (replaces deprecated expo-face-detector).
 *
 *   Key API differences from expo-face-detector:
 *     face.frame        → { width, height, top, left }  (flat, not nested)
 *     face.yawAngle     → face.rotationY
 *     face.rollAngle    → face.rotationZ
 *     FaceDetectorMode  → options.performanceMode: 'fast' | 'accurate'
 *     isTrackingEnabled → trackingEnabled
 *
 *   Detection runs on static image URIs — no live frame callback.
 *   Screens call detectFacesInImage() on periodic camera snapshots.
 *
 *   Called by: FaceEnrollScreen, LivenessChallenge screen.
 */

import FaceDetection from '@react-native-ml-kit/face-detection';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { ACCURATE_OPTIONS, FAST_OPTIONS } from '../utils/constants';

const EMBEDDING_OPTIONS = {
  performanceMode: 'accurate',
  landmarkMode: 'all',
  contourMode: 'all',
  classificationMode: 'all',
  minFaceSize: 0.15,
  trackingEnabled: false,
};

const LANDMARK_ORDER = [
  'leftEar',
  'rightEar',
  'leftEye',
  'rightEye',
  'noseBase',
  'leftCheek',
  'rightCheek',
  'mouthLeft',
  'mouthRight',
  'mouthBottom',
];

const CONTOUR_SPECS = [
  ['face', 12],
  ['leftEye', 4],
  ['rightEye', 4],
  ['noseBridge', 4],
  ['noseBottom', 4],
  ['upperLipTop', 4],
  ['lowerLipBottom', 4],
  ['leftEyebrowTop', 3],
  ['rightEyebrowTop', 3],
  ['leftEyebrowBottom', 3],
  ['rightEyebrowBottom', 3],
  ['upperLipBottom', 3],
  ['lowerLipTop', 3],
];

const roundEmbeddingValue = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(6));
};

const normalizePoint = (point, frame) => {
  if (!point || !frame?.width || !frame?.height) {
    return [0, 0];
  }

  const x = (Number(point.x) - Number(frame.left || 0)) / Number(frame.width);
  const y = (Number(point.y) - Number(frame.top || 0)) / Number(frame.height);

  return [roundEmbeddingValue(x), roundEmbeddingValue(y)];
};

const sampleContourPoints = (points = [], targetCount = 0) => {
  if (targetCount <= 0) {
    return [];
  }

  if (!Array.isArray(points) || points.length === 0) {
    return Array.from({ length: targetCount }, () => null);
  }

  if (points.length === 1) {
    return Array.from({ length: targetCount }, () => points[0]);
  }

  return Array.from({ length: targetCount }, (_, index) => {
    const ratio = targetCount === 1 ? 0 : index / (targetCount - 1);
    const sampledIndex = Math.min(
      points.length - 1,
      Math.max(0, Math.round(ratio * (points.length - 1)))
    );

    return points[sampledIndex];
  });
};

export const buildFaceEmbedding = (face) => {
  const frame = face?.frame;

  if (!frame?.width || !frame?.height) {
    return null;
  }

  const embedding = [];

  LANDMARK_ORDER.forEach((landmarkType) => {
    const point = face?.landmarks?.[landmarkType]?.position || null;
    embedding.push(...normalizePoint(point, frame));
  });

  CONTOUR_SPECS.forEach(([contourType, sampleCount]) => {
    const contourPoints = face?.contours?.[contourType]?.points || [];
    const sampled = sampleContourPoints(contourPoints, sampleCount);

    sampled.forEach((point) => {
      embedding.push(...normalizePoint(point, frame));
    });
  });

  if (embedding.length !== 128) {
    return null;
  }

  return embedding;
};

export const extractFaceEmbedding = async (imageUri) => {
  try {
    const faces = await FaceDetection.detect(imageUri, EMBEDDING_OPTIONS);

    if (!faces || faces.length !== 1) {
      return null;
    }

    return buildFaceEmbedding(faces[0]);
  } catch {
    return null;
  }
};

/**
 * Detect all faces in a local image URI.
 * @param {string}  imageUri - local file URI from expo-camera takePictureAsync
 * @param {boolean} [fast]   - use fast mode (for liveness polling snapshots)
 * @returns {Promise<import('@react-native-ml-kit/face-detection').Face[]>}
 */
export const detectFacesInImage = async (imageUri, fast = false) => {
  return FaceDetection.detect(imageUri, fast ? FAST_OPTIONS : ACCURATE_OPTIONS);
};

/**
 * Validate face quality from a captured photo URI.
 * Checks: presence, count, size, centering (yaw), phone tilt (roll), eyes open.
 *
 * @param {string} photoUri - local file URI
 * @returns {Promise<{ valid: boolean, reason: string, face?: Face }>}
 */
export const validateFaceQuality = async (photoUri) => {
  const faces = await detectFacesInImage(photoUri, false);

  if (!faces || faces.length === 0) {
    return { valid: false, reason: 'No face detected. Please look directly at the camera.' };
  }
  if (faces.length > 1) {
    return { valid: false, reason: 'Multiple faces detected. Only you should be in frame.' };
  }

  const face = faces[0];

  // face.frame = { width, height, top, left }
  const area = face.frame.width * face.frame.height;
  if (area < 8000) {
    return { valid: false, reason: 'Too far away. Please move closer to the camera.' };
  }

  // rotationY = yaw (left/right head turn)
  const yaw = face.rotationY ?? 0;
  if (Math.abs(yaw) > 25) {
    return { valid: false, reason: 'Please face the camera directly. Do not turn your head.' };
  }

  // rotationZ = roll (phone or head tilt)
  const roll = face.rotationZ ?? 0;
  if (Math.abs(roll) > 20) {
    return { valid: false, reason: 'Please hold your phone upright.' };
  }

  const leftOpen  = face.leftEyeOpenProbability  ?? 1;
  const rightOpen = face.rightEyeOpenProbability ?? 1;
  if (leftOpen < 0.4 || rightOpen < 0.4) {
    return { valid: false, reason: 'Please keep your eyes open.' };
  }

  return { valid: true, reason: '', face };
};

/**
 * Run a quick liveness quality check on a detection snapshot.
 * Returns structured quality info without throwing — safe to call in a tight loop.
 *
 * @param {string} imageUri
 * @returns {Promise<{
 *   valid: boolean,
 *   reason: string,
 *   face?: Face
 * }>}
 */
export const quickFaceCheck = async (imageUri) => {
  try {
    const faces = await detectFacesInImage(imageUri, true); // fast mode

    if (!faces || faces.length === 0) return { valid: false, reason: 'No face detected. Please look at camera.' };
    if (faces.length > 1)            return { valid: false, reason: 'Multiple faces. Only you should be in frame.' };

    const face = faces[0];
    const area = face.frame.width * face.frame.height;

    if (area < 8000) return { valid: false, reason: 'Too far — move closer.' };

    const leftOpen  = face.leftEyeOpenProbability  ?? 1;
    const rightOpen = face.rightEyeOpenProbability ?? 1;
    if (leftOpen < 0.4 || rightOpen < 0.4) return { valid: false, reason: 'Keep your eyes open.' };

    return { valid: true, reason: '', face };
  } catch {
    return { valid: false, reason: '' }; // silent — polling will retry
  }
};

/**
 * Detect whether a liveness challenge has been completed by a detected face.
 * Called per-snapshot during LivenessChallenge polling loop.
 *
 * @param {Face}   face      - Single ML Kit face object
 * @param {string} challenge - 'blink' | 'turn_left' | 'turn_right' | 'smile'
 * @returns {{ completed: boolean }}
 */
export const detectChallengeCompletion = (face, challenge) => {
  if (!face) return { completed: false };

  switch (challenge) {
    case 'blink': {
      const leftClosed  = (face.leftEyeOpenProbability  ?? 1) < 0.3;
      const rightClosed = (face.rightEyeOpenProbability ?? 1) < 0.3;
      return { completed: leftClosed && rightClosed };
    }
    case 'turn_left': {
      // rotationY positive = head turned left on front camera
      return { completed: (face.rotationY ?? 0) > 20 };
    }
    case 'turn_right': {
      // rotationY negative = head turned right on front camera
      return { completed: (face.rotationY ?? 0) < -20 };
    }
    case 'smile': {
      return { completed: (face.smilingProbability ?? 0) > 0.7 };
    }
    default:
      return { completed: false };
  }
};

/**
 * Compress a selfie image for API upload.
 * Target: max 800px wide, 70 % quality JPEG, base64 encoded.
 *
 * @param {string} uri - local photo URI
 * @returns {Promise<{ uri: string, base64: string }>}
 */

export const compressSelfie = async (uri) => {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: 800 });

  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  return { uri: result.uri, base64: result.base64 };
};


/**
 * Delete a temporary detection snapshot from the device filesystem.
 * Call after each polling snapshot to prevent storage accumulation.
 *
 * @param {string} uri - local file URI to delete
 */

export const deleteTempImage = async (uri) => {
  try {
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // non-critical — OS will clean up eventually
  }
};
