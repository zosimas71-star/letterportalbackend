import { AppError } from "../errors/app-error.js";

/**
 * Check if the authenticated user has one of the allowed roles
 * or has specific permissions.
 */
export const authorize = (allowedRoles = [], requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('User context not established');
      }

      // System Admin has global access override
      if (req.user.active_role === 'System Admin') {
        return next();
      }

      // Check role
      if (allowedRoles.length > 0) {
        const hasRole = allowedRoles.includes(req.user.active_role);
        if (!hasRole) {
          throw new AppError(`Access denied. Allowed roles: ${allowedRoles.join(', ')}`);
        }
      }

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every((perm) =>
          req.user.permissions.includes(perm)
        );
        if (!hasAllPermissions) {
          throw new AppError('Insufficient permissions for this operation');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Directory Clearance check: Officers have exclusive access to their own specific directories
 * and cannot cross-post or manage other departmental letters unless routed to them or approved.
 */
export const checkDirectoryClearance = (req, res, next) => {
  try {
    const { active_role, active_directory_id } = req.user;

    // Dept Head and System Admin have broad clearance
    if (active_role === 'System Admin' || active_role === 'Department Head') {
      return next();
    }

    const targetDirectoryId = req.params.directoryId || req.body.directory_id || req.body.owning_directory_id;
    if (targetDirectoryId && parseInt(targetDirectoryId, 10) !== active_directory_id) {
      throw new AppError('Directory boundary violation: Officers have access only within their assigned directory');
    }

    next();
  } catch (error) {
    next(error);
  }
};