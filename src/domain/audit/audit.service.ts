/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: SERVER-AUTHORITATIVE AUDIT LOGGING ENGINE
 * ============================================================================
 */

import type { PGlite } from '@electric-sql/pglite';
import type { AuthContext } from '../../types/auth';
import type { AuditActionType, AuditableEntityType, AuditActor } from '../../types/audit';

export interface RecordAuditEventParams {
  workspaceId: string;
  actor: AuditActor;
  action: AuditActionType;
  entityType: AuditableEntityType;
  entityId: string;
  patientId?: string | null;
  caseId?: string | null;
  changedFields?: string[] | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Builds an authoritative AuditActor from verified AuthContext.
 * Never accepts actor claims from client requests.
 */
export function buildAuditActor(context: AuthContext): AuditActor {
  return {
    id: context.practitioner.id,
    name: context.practitioner.name,
    role: context.membership.role,
    source: 'authenticated_session',
  };
}

/**
 * Inserts an authoritative audit event inside an ongoing database transaction.
 * Allocates sequence atomically via allocate_next_audit_sequence(workspace_id).
 * Guaranteed to roll back if the transaction fails.
 */
export async function recordAuditEvent(
  tx: PGlite,
  params: RecordAuditEventParams
): Promise<bigint> {
  const seqRes = await tx.query<{ allocate_next_audit_sequence: string }>(
    `SELECT allocate_next_audit_sequence($1)`,
    [params.workspaceId]
  );

  if (seqRes.rows.length === 0 || !seqRes.rows[0].allocate_next_audit_sequence) {
    throw new Error('Failed to allocate audit sequence number');
  }

  const sequence = BigInt(seqRes.rows[0].allocate_next_audit_sequence);

  await tx.query(
    `INSERT INTO audit_events (
      workspace_id,
      sequence,
      occurred_at,
      actor,
      action,
      entity_type,
      entity_id,
      patient_id,
      case_id,
      changed_fields,
      reason,
      metadata
    ) VALUES (
      $1,
      $2,
      clock_timestamp(),
      $3::jsonb,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9::jsonb,
      $10,
      $11::jsonb
    )`,
    [
      params.workspaceId,
      sequence.toString(),
      JSON.stringify(params.actor),
      params.action,
      params.entityType,
      params.entityId,
      params.patientId || null,
      params.caseId || null,
      params.changedFields ? JSON.stringify(params.changedFields) : null,
      params.reason || null,
      JSON.stringify(params.metadata || {}),
    ]
  );

  return sequence;
}
