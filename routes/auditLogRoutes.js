import express from 'express';
import { listAuditLogs, getAuditLog } from '../controllers/auditLogController.js';

const router = express.Router();

router.get('/', listAuditLogs);
router.get('/:audit_log_id', getAuditLog);

export default router;