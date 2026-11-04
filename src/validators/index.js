import { AppError } from '../common/errors/app-error.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies
    });

    if (!parsed.success) {
      // zod v3 uses `.errors`; zod v4 only has `.issues` (also present in v3)
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.slice(1).join('.'),
        message: issue.message
      }));
      throw new AppError('VALIDATION_ERROR', { message: 'Validation failed.', details });
    }

    // Assign sanitized / coerced values back to req
    if (parsed.data.body) req.body = parsed.data.body;
    if (parsed.data.query) req.query = parsed.data.query;
    if (parsed.data.params) req.params = parsed.data.params;

    next();
  } catch (error) {
    next(error);
  }
};