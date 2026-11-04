import express from 'express';
import { listAuditLogs, getAuditLog } from './auditLogController.js';

const auditLogRoutes = express.Router();

auditLogRoutes.get('/', listAuditLogs);
auditLogRoutes.get('/:audit_log_id', getAuditLog);

export default auditLogRoutes;