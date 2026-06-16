/**
 * Formats a number as IDR currency
 * @param {number} value
 * @returns {string} 
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Formats a number with commas separator
 * @param {number} value 
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('id-ID').format(value);
};

/**
 * Formats a Date object or ISO string to standard text format
 * @param {string|Date} dateString 
 * @returns {string} e.g. "20 Feb 2026, 14:30"
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '';
  
  const options = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

/**
 * Determines text color based on stock level thresholds
 */
export const getStockColorClass = (current, min) => {
  if (current === 0) return 'text-danger font-bold';
  if (current <= min) return 'text-warning font-bold';
  return 'text-success font-medium';
};

/**
 * Map API error response details reliably
 */
export const extractErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return typeof error.response.data.detail === 'string' 
      ? error.response.data.detail 
      : JSON.stringify(error.response.data.detail);
  }
  return error.message || 'An unexpected error occurred';
};
