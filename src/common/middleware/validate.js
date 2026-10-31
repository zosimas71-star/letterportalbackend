import { AppError } from '../errors/app-error.js';
/**
 * validate(z.object({ params, query, body })) - any of the three keys is optional.
 * Parsed (coerced / trimmed / defaulted) output is stored on req.valid; read it with getValid().
 *
 * Query problems -> 400 INVALID_QUERY_PARAMETER. Body/params problems -> 422 VALIDATION_ERROR.
 */
export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({ body: req.body ?? {}, query: req.query, params: req.params });
  if (!result.success) {
    const issues = result.error.issues;
    const queryOnly = issues.every((i) => i.path[0] === 'query');
    const details = issues.map((i) => ({
      field: i.path.slice(1).join('.') || String(i.path[0]),
      in: String(i.path[0]),
      message: i.message,
    }));
    if (queryOnly) {
      throw new AppError('INVALID_QUERY_PARAMETER', {
        message: `Invalid query parameter: ${details[0]?.field} - ${details[0]?.message}`,
        details,
      });
    }
    throw new AppError('VALIDATION_ERROR', { details });
  }
  req.valid = result.data;
  next();
};
/** What validate(schema) parsed: { params, query, body }. */
export const getValid = (req) => req.valid;
