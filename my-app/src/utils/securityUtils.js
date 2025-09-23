/**
 * Security utility functions for client-side validation
 */

/**
 * Validates file uploads for security
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    allowedExtensions = ['.mp3', '.wav', '.ogg']
  } = options;
  
  const result = {
    isValid: true,
    error: null
  };
  
  // Check if file exists
  if (!file) {
    result.isValid = false;
    result.error = 'No file selected';
    return result;
  }
  
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    result.isValid = false;
    result.error = `File too large. Maximum size is ${maxSizeMB}MB.`;
    return result;
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    result.isValid = false;
    result.error = 'Invalid file type. Please upload an allowed audio format.';
    return result;
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    result.isValid = false;
    result.error = 'Invalid file extension. Please upload an allowed audio format.';
    return result;
  }
  
  return result;
};

/**
 * Sanitize error messages for user display
 * @param {Error} error - The original error
 * @returns {string} A user-friendly error message
 */
export const sanitizeErrorMessage = (error) => {
  // Generic error messages map
  const errorMap = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.',
    'storage/unauthorized': 'You don\'t have permission to access this resource.',
    'storage/quota-exceeded': 'Storage quota exceeded.',
    'default': 'An error occurred. Please try again later.'
  };
  
  // Extract error code if available
  const errorCode = error?.code || 'default';
  
  // Return mapped error or default
  return errorMap[errorCode] || errorMap['default'];
};

/**
 * Throttle function to implement rate limiting
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  let lastResult;
  
  return function(...args) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
    
    return lastResult;
  };
};
