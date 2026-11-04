export const sendResponse = (res, statusCode, data = null, meta = null, message = null) => {
  const isSuccess = statusCode >= 200 && statusCode < 300;
  const response = {
    success: isSuccess
  };

  if (message) {
    response.message = message;
  }

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const sort = query.sort || '-created_at';
  const q = query.q ? String(query.q).trim() : null;

  return { page, limit, skip, sort, q };
};

export const parseSort = (sortStr, allowedFields = ['created_at', 'updated_at', 'letter_date']) => {
  if (!sortStr) return { created_at: 'desc' };
  const isDesc = sortStr.startsWith('-');
  const field = isDesc ? sortStr.substring(1) : sortStr;
  const direction = isDesc ? 'desc' : 'asc';

  if (allowedFields.includes(field)) {
    return { [field]: direction };
  }
  return { created_at: 'desc' };
};

export const generateTrackingNumber = (letterId) => {
  const year = new Date().getFullYear();
  const idStr = String(letterId).padStart(6, '0');
  return `LTR-${year}-${idStr}`;
};