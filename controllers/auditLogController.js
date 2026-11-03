import prisma from '../config/prisma.js';

export const listAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        user: {
          select: { first_name: true, last_name: true, email: true }
        }
      }
    });

    // Convert BigInt IDs to string safely for JSON responses
    const formattedLogs = logs.map(l => ({ 
      ...l, 
      audit_log_id: l.audit_log_id.toString() 
    }));

    res.json({ 
      success: true, 
      data: formattedLogs, 
      meta: { page: 1, limit: 20, total: formattedLogs.length, total_pages: 1 } 
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch audit logs." } });
  }
};

export const getAuditLog = async (req, res) => {
  try {
    const logId = BigInt(req.params.audit_log_id);
    const log = await prisma.auditLog.findUnique({
      where: { audit_log_id: logId },
      include: {
        user: {
          select: { first_name: true, last_name: true, email: true }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Audit log not found." } });
    }

    res.json({ 
      success: true, 
      data: { ...log, audit_log_id: log.audit_log_id.toString() } 
    });
  } catch (error) {
    console.error("Error fetching single audit log:", error);
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch audit log." } });
  }
};