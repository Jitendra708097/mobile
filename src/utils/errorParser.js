/**
 * @module errorParser
 * @description Maps backend error codes to human-readable messages.
 *              Used in all store actions and screen error handlers.
 *              Falls back to backend message, then generic fallback.
 *              Called by: all store actions, all screen error displays.
 * 
 *              Enhanced 2026-04-14: Added error logging and recovery helpers.
 */

// Error log storage (in-memory, cleared on app restart)
const ERROR_LOG = [];
const MAX_ERROR_LOG_SIZE = 50; // Keep last 50 errors

const ERROR_MESSAGES = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  AUTH_001: 'Invalid email or password. Please try again.',
  AUTH_002: 'Your account has been deactivated. Contact your admin.',
  AUTH_003: 'Session expired. Please log in again.',
  AUTH_004: 'Invalid or expired token. Please log in again.',
  AUTH_005: 'Access denied. You do not have permission for this action.',
  AUTH_006: 'Your account has been suspended. Contact your admin.',
  AUTH_007: 'Too many login attempts. Please wait 15 minutes.',
  AUTH_008: 'Password must be changed on first login.',
  AUTH_009: 'This device is not registered. Contact your admin to approve this device.',
  AUTH_012: 'Please enter your email address to continue.',
  AUTH_013: 'Please enter a valid OTP and a new password.',
  AUTH_014: 'The OTP is invalid or expired. Request a new code and try again.',
  AUTH_015: 'Password reset email is not configured on the server.',
  AUTH_016: 'Too many reset requests. Please wait a few minutes and try again.',
  AUTH_017: 'Too many reset attempts. Please wait a few minutes and try again.',
  AUTH_018: 'Please wait a minute before requesting another OTP.',

  // ─── Validation ────────────────────────────────────────────────────────────
  VAL_001: 'Please fill in all required fields.',
  VAL_002: 'One or more fields have invalid values.',
  VAL_003: 'File size is too large. Maximum 5MB allowed.',

  // ─── Employee ──────────────────────────────────────────────────────────────
  EMP_001: 'Employee not found.',
  EMP_002: 'Employee already exists with this email.',
  EMP_003: 'Face not yet enrolled. Please complete face enrollment.',
  EMP_004: 'Cannot perform this action on your own account.',

  // ─── Attendance ────────────────────────────────────────────────────────────
  ATT_001: 'No active shift found for today.',
  ATT_002: 'Unable to complete attendance action. Please refresh and try again.',
  ATT_003: 'You already have an open session. Please check out first.',
  ATT_004: 'Please wait for the cooldown period to finish before checking in again.',
  ATT_005: 'No open session found. Please check in first.',
  ATT_006: 'No checkout is available to undo.',
  ATT_007: 'Undo window has expired. Checkout is final.',
  ATT_008: 'Challenge expired. Please start the check-in process again.',
  ATT_009: 'Invalid challenge token. Please try again.',
  ATT_010: 'Challenge timed out. Please try again.',
  ATT_011: 'Request timestamp is invalid. Please check your phone clock.',
  ATT_012: 'Undo window has expired. Checkout is final.',
  ATT_013: 'Invalid challenge token. Please start again.',

  // ─── Face ──────────────────────────────────────────────────────────────────
  FACE_001: 'Face verification failed. Please try again in good lighting.',
  FACE_002: 'No face detected in the image. Please look at camera.',
  FACE_003: 'Multiple faces detected. Only you should be in frame.',
  FACE_004: 'Image quality too low. Please try in better lighting.',
  FACE_005: 'Face enrollment failed. Please try again.',
  FACE_006: 'Flat surface detected. Please use your real face.',
  FACE_007: 'Liveness check failed. Please complete the challenge fully.',

  // ─── Geo-fence ─────────────────────────────────────────────────────────────
  GEO_001: 'No geo-fence set for this branch. Contact your admin.',
  GEO_002: 'Location permission denied. Please enable in settings.',
  GEO_003: 'You are outside your office premises. Please move closer.',
  GEO_004: 'Mock location detected. Please disable fake GPS apps and try again.',

  // ─── Leave ─────────────────────────────────────────────────────────────────
  LEV_001: 'Insufficient leave balance for this request.',
  LEV_002: 'Leave request overlaps with an existing approved leave.',
  LEV_003: 'Leave request not found.',
  LEV_004: 'Cannot modify an approved leave request.',
  LEV_005: 'Invalid date range. Please check your from and to dates.',

  // ─── General ───────────────────────────────────────────────────────────────
  GEN_001: 'Something went wrong. Please try again.',
  GEN_002: 'Service temporarily unavailable. Please try again later.',
  GEN_003: 'Network error. Please check your internet connection.',
  GEN_004: 'Request timed out. Please try again.',
  GEN_005: 'Unsupported file type.',
};

/**
 * Logs an error to in-memory storage for debugging
 * @param {string} code - Error code (e.g., AUTH_001)
 * @param {Error} error - Original error object
 * @param {Object} context - Additional context {action, screen, timestamp}
 */
export const logError = (code, error, context = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    code,
    message: error?.message || ERROR_MESSAGES[code] || 'Unknown error',
    status: error?.response?.status || null,
    endpoint: error?.config?.url || null,
    ...context,
  };

  ERROR_LOG.push(logEntry);
  
  // Keep log size manageable
  if (ERROR_LOG.length > MAX_ERROR_LOG_SIZE) {
    ERROR_LOG.shift();
  }

  // Log to console in dev mode
  if (__DEV__) {
    console.warn(`[${code}] ${logEntry.message}`, {
      endpoint: logEntry.endpoint,
      status: logEntry.status,
      context,
    });
  }
};

/**
 * Gets the error log (for debugging/reporting)
 * @returns {Array} Array of error log entries
 */
export const getErrorLog = () => {
  return ERROR_LOG.slice();
};

/**
 * Clears the error log
 */
export const clearErrorLog = () => {
  ERROR_LOG.length = 0;
};

/**
 * Parses an Axios error into a user-friendly string.
 * @param {Error} error - Axios error object
 * @returns {string} Human-readable error message
 */
export const parseError = (error) => {
  // No response — network / timeout
  if (!error.response) {
    if (error.message?.includes('timeout')) return ERROR_MESSAGES.GEN_004;
    return ERROR_MESSAGES.GEN_003;
  }

  const code = error.response?.data?.error?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];

  // Fall back to backend message if present
  const backendMessage = error.response?.data?.error?.message;
  if (backendMessage) return backendMessage;

  return ERROR_MESSAGES.GEN_001;
};

/**
 * Parses error and logs it with context
 * @param {Error} error - Error object
 * @param {Object} context - Context {action, screen}
 * @returns {string} Parsed error message
 */
export const parseAndLogError = (error, context = {}) => {
  const code = getErrorCode(error);
  const message = parseError(error);
  
  logError(code || 'UNKNOWN', error, context);
  
  return message;
};

/**
 * Returns the raw error code from an Axios error.
 * Useful for conditional logic based on specific codes.
 * @param {Error} error
 * @returns {string|null}
 */
export const getErrorCode = (error) => {
  return error?.response?.data?.error?.code || null;
};
