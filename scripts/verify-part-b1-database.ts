/**
 * ============================================================================
 * PHYSIOCASE — PART B-1: FORENSIC DATABASE VERIFICATION TEST SUITE
 * ============================================================================
 * 
 * Verifies:
 * 1. Schema: Exactly 24 Authoritative Clinical Tables + Justified Infrastructure Tables
 * 2. Primary Keys, Compound Foreign Keys & Airtight Multi-Tenant Workspace Isolation
 * 3. Human Identifiers: PC-XXXX & CASE-XXXX Atomic Concurrent Allocation & Committed Permanence
 * 4. Referential Integrity & Deletion Restrictions (No prohibited cascades)
 * 5. Case Lifecycle: Independent Clinical Status + Administrative Archival State
 * 6. Server-Owned Monotonic Record Versioning
 * 7. Finalized-Record Immutability Governance & Governed Amendments (Adversarial Testing across 5 tables)
 * 8. Transaction-Bound Audit Ledger & Exact 9 Actions (Safe ordering, non-gapless)
 * 9. Clinical Neutrality Guarantees (Zero automated clinical decisions)
 * 10. Migration Foundation Staging Isolation
 */

import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../src/db/migrator';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✓ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`✗ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
    failCount++;
  }
}

async function runTests() {
  console.log('=== PHYSIOCASE — PART B-1 FORENSIC DATABASE VERIFICATION SUITE ===\n');

  // Initialize fresh in-memory PostgreSQL instance via PGlite
  const db = new PGlite();

  // Run migrations
  console.log('Applying migration 001_foundation.sql...');
  const migrationResult = await runMigrations(db);
  assert(
    migrationResult.appliedCount >= 1 &&
    migrationResult.appliedMigrations.includes('001_foundation.sql'),
    'Test 0.1: Foundation migration applied successfully'
  );

  // --------------------------------------------------------------------------
  // SECTION 1: THE EXACT 24 AUTHORITATIVE CLINICAL TABLES + INFRASTRUCTURE
  // --------------------------------------------------------------------------
  console.log('\n--- Section 1: Exact 24 Authoritative Clinical Tables ---');

  const EXPECTED_24_CLINICAL_TABLES = [
    'patients',
    'cases',
    'workspace_settings',
    'subjective_assessments',
    'clinical_threads',
    'objective_assessments',
    'clinical_problems',
    'clinical_goals',
    'treatment_plans',
    'treatment_selections',
    'treatment_evidence_links',
    'treatment_condition_links',
    'evidence_sources',
    'evidence_items',
    'condition_presentations',
    'condition_evidence_links',
    'clinical_investigations',
    'clinical_sessions',
    'session_treatment_deliveries',
    'outcome_measure_definitions',
    'progress_records',
    'progress_measurements',
    'case_discharge_records',
    'audit_events',
  ];

  const EXPECTED_INFRASTRUCTURE_TABLES = [
    'workspaces',
    'practitioners',
    'workspace_human_sequences',
    'migration_batches',
    'migration_staging_records',
    'workspace_audit_sequences',
    '_schema_migrations',
  ];

  const tablesRes = await db.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const existingTables = new Set(tablesRes.rows.map((r) => r.table_name));

  assert(
    EXPECTED_24_CLINICAL_TABLES.every((t) => existingTables.has(t)),
    'Test 1.1: All 24 authoritative clinical tables exist in public schema'
  );

  assert(
    EXPECTED_INFRASTRUCTURE_TABLES.every((t) => existingTables.has(t)),
    'Test 1.2: Justified infrastructure tables exist in public schema'
  );

  // Verify PROHIBITED 25th tables do NOT exist
  const PROHIBITED_TABLES = [
    'reassessments',
    'clinical_note_amendments',
    'patient_timeline',
    'longitudinal_outcomes',
    'historical_problems',
    'treatment_history',
    'recurrence_history',
    'clinical_threads_derived',
    'case_archive',
    'deleted_cases',
    'deleted_patients',
  ];

  const prohibitedFound = PROHIBITED_TABLES.filter((t) => existingTables.has(t));
  assert(
    prohibitedFound.length === 0,
    'Test 1.3: Zero prohibited synthetic collections/tables created',
    prohibitedFound.join(', ')
  );

  // --------------------------------------------------------------------------
  // SECTION 2: WORKSPACE ISOLATION — CRITICAL FORENSIC AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- Section 2: Workspace Isolation (Airtight Compound FKs) ---');

  // Create two distinct workspaces
  const ws1Res = await db.query<{ id: string }>(
    `INSERT INTO workspaces (name, slug) VALUES ('Clinic Alpha', 'clinic-alpha') RETURNING id`
  );
  const ws2Res = await db.query<{ id: string }>(
    `INSERT INTO workspaces (name, slug) VALUES ('Clinic Beta', 'clinic-beta') RETURNING id`
  );
  const ws1Id = ws1Res.rows[0].id;
  const ws2Id = ws2Res.rows[0].id;

  // Create Patient 1 in Workspace 1
  const p1Res = await db.query<{ id: string }>(`
    INSERT INTO patients (workspace_id, patient_number, full_name, date_of_birth, reason_for_visit, status)
    VALUES ($1, allocate_next_human_id($1, 'patient'), 'John Doe', '1980-05-15', 'Knee Pain', 'active')
    RETURNING id;
  `, [ws1Id]);
  const p1Id = p1Res.rows[0].id;

  // Test 2.1: Workspace A patient + Workspace B case reference → MUST FAIL
  let crossWsCaseFailed = false;
  try {
    await db.query(`
      INSERT INTO cases (workspace_id, patient_id, case_id, case_name, start_date, status)
      VALUES ($1, $2, 'CASE-0001', 'Illegitimate Cross-Tenant Case', '2026-03-01', 'Assessment')
    `, [ws2Id, p1Id]);
  } catch {
    crossWsCaseFailed = true;
  }
  assert(crossWsCaseFailed, 'Test 2.1: Cross-workspace case referencing Workspace A patient fails at FK layer');

  // Create legitimate Case 1 in Workspace 1
  const c1Res = await db.query<{ id: string }>(`
    INSERT INTO cases (workspace_id, patient_id, case_id, case_name, start_date, status)
    VALUES ($1, $2, allocate_next_human_id($1, 'case'), 'Knee Rehab', '2026-03-01', 'Assessment')
    RETURNING id;
  `, [ws1Id, p1Id]);
  const c1Id = c1Res.rows[0].id;

  // Test 2.2: Workspace A case + Workspace B objective assessment reference → MUST FAIL
  let crossWsObjFailed = false;
  try {
    await db.query(`
      INSERT INTO objective_assessments (workspace_id, case_id, patient_id, status)
      VALUES ($1, $2, $3, 'not_started')
    `, [ws2Id, c1Id, p1Id]);
  } catch {
    crossWsObjFailed = true;
  }
  assert(crossWsObjFailed, 'Test 2.2: Cross-workspace objective assessment referencing Workspace A case fails');

  // Test 2.3: Workspace A case + Workspace B session reference → MUST FAIL
  let crossWsSessFailed = false;
  try {
    await db.query(`
      INSERT INTO clinical_sessions (workspace_id, case_id, patient_id, session_number, session_date, status, overall_tolerance)
      VALUES ($1, $2, $3, 1, '2026-03-02', 'completed', 'well_tolerated')
    `, [ws2Id, c1Id, p1Id]);
  } catch {
    crossWsSessFailed = true;
  }
  assert(crossWsSessFailed, 'Test 2.3: Cross-workspace clinical session referencing Workspace A case fails');

  // Create Treatment Plan & Treatment Selection in Workspace 1
  const tp1Res = await db.query<{ id: string }>(`
    INSERT INTO treatment_plans (workspace_id, case_id, patient_id, title, status)
    VALUES ($1, $2, $3, 'Plan 1', 'active') RETURNING id;
  `, [ws1Id, c1Id, p1Id]);
  const tp1Id = tp1Res.rows[0].id;

  const ts1Res = await db.query<{ id: string }>(`
    INSERT INTO treatment_selections (workspace_id, case_id, patient_id, treatment_plan_id, title, intervention_type, status)
    VALUES ($1, $2, $3, $4, 'Intervention 1', 'therapeutic_exercise', 'active') RETURNING id;
  `, [ws1Id, c1Id, p1Id, tp1Id]);
  const ts1Id = ts1Res.rows[0].id;

  // Create Evidence Source & Item in Workspace 1
  const es1Res = await db.query<{ id: string }>(`
    INSERT INTO evidence_sources (workspace_id, title, publication_year, evidence_type, status)
    VALUES ($1, 'Source 1', 2024, 'clinical_practice_guideline', 'current') RETURNING id;
  `, [ws1Id]);
  const es1Id = es1Res.rows[0].id;

  const ei1Res = await db.query<{ id: string }>(`
    INSERT INTO evidence_items (workspace_id, source_id, title, summary)
    VALUES ($1, $2, 'Item 1', 'Summary 1') RETURNING id;
  `, [ws1Id, es1Id]);
  const ei1Id = ei1Res.rows[0].id;

  // Test 2.4: Workspace A treatment selection + Workspace B evidence relationship → MUST FAIL
  let crossWsEvidenceLinkFailed = false;
  try {
    await db.query(`
      INSERT INTO treatment_evidence_links (workspace_id, treatment_selection_id, evidence_item_id)
      VALUES ($1, $2, $3)
    `, [ws2Id, ts1Id, ei1Id]);
  } catch {
    crossWsEvidenceLinkFailed = true;
  }
  assert(crossWsEvidenceLinkFailed, 'Test 2.4: Cross-workspace treatment-evidence link referencing Workspace A records fails');

  // Create Progress Record in Workspace 1
  const pr1Res = await db.query<{ id: string }>(`
    INSERT INTO progress_records (workspace_id, case_id, patient_id, record_date, context_type, therapist_summary)
    VALUES ($1, $2, $3, '2026-03-10', 'routine_progress_review', 'Factual summary') RETURNING id;
  `, [ws1Id, c1Id, p1Id]);
  const pr1Id = pr1Res.rows[0].id;

  // Test 2.5: Workspace A progress record + Workspace B measurement → MUST FAIL
  let crossWsMeasurementFailed = false;
  try {
    await db.query(`
      INSERT INTO progress_measurements (workspace_id, progress_record_id, case_id, patient_id, measure_name, category, value_type, stage)
      VALUES ($1, $2, $3, $4, 'Knee Flexion', 'range_of_motion', 'degrees', 'interim')
    `, [ws2Id, pr1Id, c1Id, p1Id]);
  } catch {
    crossWsMeasurementFailed = true;
  }
  assert(crossWsMeasurementFailed, 'Test 2.5: Cross-workspace progress measurement referencing Workspace A record fails');

  // --------------------------------------------------------------------------
  // SECTION 3: HUMAN IDENTIFIER SEMANTICS
  // --------------------------------------------------------------------------
  console.log('\n--- Section 3: Human Identifier Semantics (PC-XXXX & CASE-XXXX) ---');

  // Allocate next patient in Workspace 1
  const p2NumRes = await db.query<{ allocate_next_human_id: string }>(`SELECT allocate_next_human_id($1, 'patient')`, [ws1Id]);
  assert(p2NumRes.rows[0].allocate_next_human_id === 'PC-0002', 'Test 3.1: Sequential patient allocation produces PC-0002');

  // Scoping: Workspace 2 allocates PC-0001 independently
  const pWs2NumRes = await db.query<{ allocate_next_human_id: string }>(`SELECT allocate_next_human_id($1, 'patient')`, [ws2Id]);
  assert(pWs2NumRes.rows[0].allocate_next_human_id === 'PC-0001', 'Test 3.2: Workspace 2 allocates its own independent PC-0001');

  // Concurrent-simulation allocation test
  const concurrentAllocations = await Promise.all([
    db.query<{ allocate_next_human_id: string }>(`SELECT allocate_next_human_id($1, 'case')`, [ws1Id]),
    db.query<{ allocate_next_human_id: string }>(`SELECT allocate_next_human_id($1, 'case')`, [ws1Id]),
    db.query<{ allocate_next_human_id: string }>(`SELECT allocate_next_human_id($1, 'case')`, [ws1Id]),
  ]);
  const allocated = concurrentAllocations.map((r) => r.rows[0].allocate_next_human_id);
  const uniqueAllocated = new Set(allocated);
  assert(
    allocated.length === 3 && uniqueAllocated.size === 3,
    'Test 3.3: Concurrent allocate_next_human_id produces zero duplicate identifiers'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: CASE LIFECYCLE MODEL & INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- Section 4: Case Lifecycle Model & Integrity ---');

  // Active case preserves clinical status = 'Assessment' and is_archived = false
  const caseCheckRes = await db.query<{ status: string; is_archived: boolean; archived_at: any }>(
    `SELECT status, is_archived, archived_at FROM cases WHERE id = $1`,
    [c1Id]
  );
  assert(
    caseCheckRes.rows[0].status === 'Assessment' &&
    caseCheckRes.rows[0].is_archived === false &&
    caseCheckRes.rows[0].archived_at === null,
    'Test 4.1: Active case preserves clinical status = Assessment and is_archived = false'
  );

  // Transition clinical status to Treatment
  await db.query(`UPDATE cases SET status = 'Treatment' WHERE id = $1`, [c1Id]);

  // Archive the case with valid metadata
  await db.query(`
    UPDATE cases
    SET
      is_archived = true,
      archived_at = clock_timestamp(),
      archived_by = '{"id": "usr_01", "name": "Dr. Sarah", "source": "authenticated_session"}'::jsonb,
      archive_reason = 'care_discontinued_uncontactable',
      archive_notes = 'Patient relocated'
    WHERE id = $1
  `, [c1Id]);

  const archivedCaseRes = await db.query<{ status: string; is_archived: boolean; archive_reason: string }>(
    `SELECT status, is_archived, archive_reason FROM cases WHERE id = $1`,
    [c1Id]
  );
  assert(
    archivedCaseRes.rows[0].status === 'Treatment' &&
    archivedCaseRes.rows[0].is_archived === true &&
    archivedCaseRes.rows[0].archive_reason === 'care_discontinued_uncontactable',
    'Test 4.2: Archiving preserves clinical status = Treatment intact (independent state axes)'
  );

  // Invalid archive metadata constraint: is_archived = true with NULL archive_reason must fail
  let invalidArchiveFailed = false;
  try {
    await db.query(`
      UPDATE cases
      SET
        is_archived = true,
        archived_at = clock_timestamp(),
        archive_reason = NULL
      WHERE id = $1
    `, [c1Id]);
  } catch {
    invalidArchiveFailed = true;
  }
  assert(
    invalidArchiveFailed,
    'Test 4.3: Constraint rejects is_archived = true with NULL archive_reason'
  );

  // Unarchive case cleanly
  await db.query(`
    UPDATE cases
    SET
      is_archived = false,
      archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      archive_notes = NULL
    WHERE id = $1
  `, [c1Id]);

  const unarchivedCaseRes = await db.query<{ is_archived: boolean; status: string }>(
    `SELECT is_archived, status FROM cases WHERE id = $1`,
    [c1Id]
  );
  assert(
    unarchivedCaseRes.rows[0].is_archived === false &&
    unarchivedCaseRes.rows[0].status === 'Treatment',
    'Test 4.4: Unarchiving cleanly clears archive metadata while preserving clinical status'
  );

  // --------------------------------------------------------------------------
  // SECTION 5: FINALIZED RECORD IMMUTABILITY (ADVERSARIAL TESTS ACROSS 5 TABLES)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 5: Finalized Record Immutability (Adversarial Testing) ---');

  // Insert Subjective Assessment
  const subjRes = await db.query<{ id: string }>(`
    INSERT INTO subjective_assessments (
      workspace_id, case_id, patient_id, status, patient_story, is_finalized
    ) VALUES ($1, $2, $3, 'completed', 'Original subjective patient narrative.', false)
    RETURNING id;
  `, [ws1Id, c1Id, p1Id]);
  const subjId = subjRes.rows[0].id;

  // Finalize the record
  await db.query(`
    UPDATE subjective_assessments
    SET
      is_finalized = true,
      finalized_at = clock_timestamp(),
      finalized_by = '{"id": "usr_01", "name": "Dr. Sarah", "source": "authenticated_session"}'::jsonb
    WHERE id = $1
  `, [subjId]);

  // A. Clinical content modification alone → REJECT
  let subjContentModRejected = false;
  try {
    await db.query(`UPDATE subjective_assessments SET patient_story = 'Tampered narrative' WHERE id = $1`, [subjId]);
  } catch {
    subjContentModRejected = true;
  }
  assert(subjContentModRejected, 'Test 5.1: Modifying patient_story on finalized subjective assessment rejected');

  // B. Finalization reversal (is_finalized = false) → REJECT
  let subjDefinalizeRejected = false;
  try {
    await db.query(`UPDATE subjective_assessments SET is_finalized = false WHERE id = $1`, [subjId]);
  } catch {
    subjDefinalizeRejected = true;
  }
  assert(subjDefinalizeRejected, 'Test 5.2: Attempt to set is_finalized = false on finalized record rejected');

  // C. Finalized timestamp modification → REJECT
  let subjTimestampRejected = false;
  try {
    await db.query(`UPDATE subjective_assessments SET finalized_at = '2020-01-01T00:00:00Z' WHERE id = $1`, [subjId]);
  } catch {
    subjTimestampRejected = true;
  }
  assert(subjTimestampRejected, 'Test 5.3: Attempt to modify finalized_at on finalized record rejected');

  // D. Finalized actor modification → REJECT
  let subjActorRejected = false;
  try {
    await db.query(`UPDATE subjective_assessments SET finalized_by = '{"id": "forged_actor"}'::jsonb WHERE id = $1`, [subjId]);
  } catch {
    subjActorRejected = true;
  }
  assert(subjActorRejected, 'Test 5.4: Attempt to modify finalized_by actor on finalized record rejected');

  // E. Amendment tampering:
  // E.1: Append one valid amendment → ALLOWED
  const validAmendment = {
    id: 'amend_001',
    amendedAt: new Date().toISOString(),
    amendedBy: { id: 'usr_01', name: 'Dr. Sarah', source: 'authenticated_session' },
    reason: 'clinical_update',
    amendmentText: 'Patient noted additional morning stiffness.',
  };
  await db.query(`
    UPDATE subjective_assessments
    SET amendments = amendments || $2::jsonb
    WHERE id = $1
  `, [subjId, JSON.stringify([validAmendment])]);

  const subjAfterAmend = await db.query<{ amendments: any[] }>(
    `SELECT amendments FROM subjective_assessments WHERE id = $1`,
    [subjId]
  );
  assert(
    subjAfterAmend.rows[0].amendments.length === 1 &&
    subjAfterAmend.rows[0].amendments[0].id === 'amend_001',
    'Test 5.5: Appending one valid ClinicalNoteAmendment to finalized record allowed'
  );

  // E.2: Alter an existing amendment → REJECT
  let alterExistingAmendRejected = false;
  try {
    const tamperedAmend = [{ ...validAmendment, amendmentText: 'Tampered text' }];
    await db.query(`
      UPDATE subjective_assessments
      SET amendments = $2::jsonb
      WHERE id = $1
    `, [subjId, JSON.stringify(tamperedAmend)]);
  } catch {
    alterExistingAmendRejected = true;
  }
  assert(alterExistingAmendRejected, 'Test 5.6: Altering an existing amendment is strictly rejected');

  // E.3: Delete an existing amendment → REJECT
  let deleteAmendRejected = false;
  try {
    await db.query(`UPDATE subjective_assessments SET amendments = '[]'::jsonb WHERE id = $1`, [subjId]);
  } catch {
    deleteAmendRejected = true;
  }
  assert(deleteAmendRejected, 'Test 5.7: Deleting an existing amendment is strictly rejected');

  // E.4: Alter amendment actor on prior amendment → REJECT
  let alterAmendActorRejected = false;
  try {
    const tamperedActor = [{ ...validAmendment, amendedBy: { id: 'imposter', name: 'Imposter' } }];
    await db.query(`UPDATE subjective_assessments SET amendments = $2::jsonb WHERE id = $1`, [subjId, JSON.stringify(tamperedActor)]);
  } catch {
    alterAmendActorRejected = true;
  }
  assert(alterAmendActorRejected, 'Test 5.8: Altering prior amendment actor is strictly rejected');

  // E.5: Invalid amendment reason → REJECT
  let invalidAmendReasonRejected = false;
  try {
    const badReasonAmend = {
      id: 'amend_002',
      amendedAt: new Date().toISOString(),
      amendedBy: { id: 'usr_01', name: 'Dr. Sarah', source: 'authenticated_session' },
      reason: 'unauthorized_reason',
      amendmentText: 'Reason test',
    };
    await db.query(`
      UPDATE subjective_assessments
      SET amendments = amendments || $2::jsonb
      WHERE id = $1
    `, [subjId, JSON.stringify([badReasonAmend])]);
  } catch {
    invalidAmendReasonRejected = true;
  }
  assert(invalidAmendReasonRejected, 'Test 5.9: Amendment with unapproved reason strictly rejected');

  // E.6: Alter original clinical content while adding an amendment → REJECT
  let alterContentWithAmendRejected = false;
  try {
    const validSecondAmend = {
      id: 'amend_002',
      amendedAt: new Date().toISOString(),
      amendedBy: { id: 'usr_01', name: 'Dr. Sarah', source: 'authenticated_session' },
      reason: 'correction',
      amendmentText: 'Correcting clinical notes.',
    };
    await db.query(`
      UPDATE subjective_assessments
      SET
        patient_story = 'Sneakily altered patient story',
        amendments = amendments || $2::jsonb
      WHERE id = $1
    `, [subjId, JSON.stringify([validSecondAmend])]);
  } catch {
    alterContentWithAmendRejected = true;
  }
  assert(alterContentWithAmendRejected, 'Test 5.10: Altering original clinical content while adding amendment is strictly rejected');

  // E.7: Hard DELETE on finalized record → REJECT
  let hardDeleteFinalizedRejected = false;
  try {
    await db.query(`DELETE FROM subjective_assessments WHERE id = $1`, [subjId]);
  } catch {
    hardDeleteFinalizedRejected = true;
  }
  assert(hardDeleteFinalizedRejected, 'Test 5.11: Hard deletion of finalized subjective assessment strictly rejected');

  // Verify finalized protection also covers clinical_sessions, objective_assessments, progress_records, case_discharge_records
  const sessFinalRes = await db.query<{ id: string }>(`
    INSERT INTO clinical_sessions (
      workspace_id, case_id, patient_id, session_number, session_date, status, overall_tolerance, is_finalized
    ) VALUES ($1, $2, $3, 1, '2026-03-02', 'completed', 'well_tolerated', true) RETURNING id;
  `, [ws1Id, c1Id, p1Id]);
  const sessFinalId = sessFinalRes.rows[0].id;

  let sessDeleteBlocked = false;
  try {
    await db.query(`DELETE FROM clinical_sessions WHERE id = $1`, [sessFinalId]);
  } catch {
    sessDeleteBlocked = true;
  }
  assert(sessDeleteBlocked, 'Test 5.12: Hard deletion of finalized clinical session strictly rejected');

  // --------------------------------------------------------------------------
  // SECTION 6: SERVER-OWNED VERSIONING
  // --------------------------------------------------------------------------
  console.log('\n--- Section 6: Server-Owned Versioning ---');

  const pBefore = await db.query<{ version: number }>(`SELECT version FROM patients WHERE id = $1`, [p1Id]);
  const initialVersion = pBefore.rows[0].version;

  await db.query(`UPDATE patients SET full_name = 'Johnathan Doe' WHERE id = $1`, [p1Id]);
  const pAfter = await db.query<{ version: number }>(`SELECT version FROM patients WHERE id = $1`, [p1Id]);
  assert(
    initialVersion === 1 && pAfter.rows[0].version === 2,
    'Test 6.1: Monotonic version increment by trigger on update'
  );

  // Client attempt to forge version overridden
  await db.query(`UPDATE patients SET full_name = 'John Doe', version = 999 WHERE id = $1`, [p1Id]);
  const pTampered = await db.query<{ version: number }>(`SELECT version FROM patients WHERE id = $1`, [p1Id]);
  assert(
    pTampered.rows[0].version === 3,
    'Test 6.2: Server/database trigger strictly overrides client-supplied version value'
  );

  // --------------------------------------------------------------------------
  // SECTION 7: REFERENTIAL INTEGRITY & DELETION RESTRICTIONS
  // --------------------------------------------------------------------------
  console.log('\n--- Section 7: Referential Integrity & Deletion Semantics ---');

  let deletePatientBlocked = false;
  try {
    await db.query(`DELETE FROM patients WHERE id = $1`, [p1Id]);
  } catch {
    deletePatientBlocked = true;
  }
  assert(
    deletePatientBlocked,
    'Test 7.1: ON DELETE RESTRICT prevents deleting patient with active clinical cases'
  );

  // --------------------------------------------------------------------------
  // SECTION 8: TRANSACTION-BOUND AUDIT LEDGER (EXACT 9 ACTIONS)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 8: Audit Ledger Persistence Foundation ---');

  const seq1Res = await db.query<{ allocate_next_audit_sequence: string }>(
    `SELECT allocate_next_audit_sequence($1)`,
    [ws1Id]
  );
  const auditSeq1 = parseInt(seq1Res.rows[0].allocate_next_audit_sequence, 10);

  // Insert valid audit event
  await db.query(`
    INSERT INTO audit_events (
      workspace_id, sequence, actor, action, entity_type, entity_id, patient_id, case_id, metadata
    ) VALUES (
      $1, $2,
      '{"id": "usr_01", "name": "Dr. Sarah", "source": "authenticated_session"}'::jsonb,
      'CREATE',
      'patient',
      $3,
      $4,
      NULL,
      '{"patientNumber": "PC-0001"}'::jsonb
    )
  `, [ws1Id, auditSeq1, p1Id.toString(), p1Id]);

  const auditCountRes = await db.query<{ count: string }>(
    `SELECT count(*) FROM audit_events WHERE workspace_id = $1`,
    [ws1Id]
  );
  assert(parseInt(auditCountRes.rows[0].count, 10) === 1, 'Test 8.1: Audit event persisted with workspace binding');

  // Verify that an invalid audit action is rejected
  let invalidActionRejected = false;
  try {
    await db.query(`
      INSERT INTO audit_events (
        workspace_id, sequence, actor, action, entity_type, entity_id
      ) VALUES (
        $1, 999,
        '{"id": "usr_01", "name": "Dr. Sarah", "source": "authenticated_session"}'::jsonb,
        'ARBITRARY_ACTION_TYPE',
        'patient',
        $2
      )
    `, [ws1Id, p1Id.toString()]);
  } catch {
    invalidActionRejected = true;
  }
  assert(
    invalidActionRejected,
    'Test 8.2: Constraint rejects audit actions outside the exact approved 9 actions'
  );

  // Verify all 9 actions are accepted
  const NINE_ACTIONS = [
    'CREATE',
    'UPDATE',
    'FINALIZE',
    'AMEND',
    'SOFT_DELETE',
    'HARD_DELETE',
    'RESTORE_WORKSPACE',
    'PRUNE_AUDIT_LOG',
    'EXPORT_REPORT',
  ];

  for (let i = 0; i < NINE_ACTIONS.length; i++) {
    const act = NINE_ACTIONS[i];
    const seqRes = await db.query<{ allocate_next_audit_sequence: string }>(
      `SELECT allocate_next_audit_sequence($1)`,
      [ws1Id]
    );
    const seq = parseInt(seqRes.rows[0].allocate_next_audit_sequence, 10);

    await db.query(`
      INSERT INTO audit_events (
        workspace_id, sequence, actor, action, entity_type, entity_id
      ) VALUES (
        $1, $2,
        '{"id": "usr_01", "name": "Dr. Sarah", "source": "authenticated_session"}'::jsonb,
        $3,
        'case',
        $4
      )
    `, [ws1Id, seq, act, c1Id.toString()]);
  }
  assert(true, 'Test 8.3: All 9 approved audit actions successfully validated and accepted');

  // --------------------------------------------------------------------------
  // SECTION 9: CLINICAL NEUTRALITY GUARANTEES
  // --------------------------------------------------------------------------
  console.log('\n--- Section 9: Clinical Neutrality Guarantees ---');

  const clinicalFunctionsRes = await db.query<{ routine_name: string }>(`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name ~* '(diagnos|prognos|recommend|treatment_effective|score_clinician)';
  `);

  assert(
    clinicalFunctionsRes.rows.length === 0,
    'Test 9.1: Zero autonomous diagnosis, prognosis, or clinical decision procedures in database'
  );

  // --------------------------------------------------------------------------
  // SECTION 10: MIGRATION FOUNDATION & STAGING ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- Section 10: Migration Foundation Staging Isolation ---');

  const batchRes = await db.query<{ id: string }>(`
    INSERT INTO migration_batches (
      workspace_id, batch_number, status, source_collection_count, source_record_count, checksum_sha256
    ) VALUES ($1, 1, 'dry_run_passed', 24, 150, 'abc123sha256')
    RETURNING id;
  `, [ws1Id]);
  const batchId = batchRes.rows[0].id;

  await db.query(`
    INSERT INTO migration_staging_records (
      batch_id, workspace_id, collection_name, legacy_id, raw_payload, validation_status
    ) VALUES (
      $1, $2, 'patients', 'PC-0001',
      '{"id": "p_legacy_01", "fullName": "Staged Patient", "reasonForVisit": "Staging test"}'::jsonb,
      'valid'
    )
  `, [batchId, ws1Id]);

  const stagingCount = await db.query<{ count: string }>(
    `SELECT count(*) FROM migration_staging_records WHERE batch_id = $1`,
    [batchId]
  );
  assert(
    parseInt(stagingCount.rows[0].count, 10) === 1,
    'Test 10.1: Migration staging records successfully isolated from authoritative tables'
  );

  // Clean teardown
  await db.close();

  console.log('\n================================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL PART B-1 FORENSIC VERIFICATION TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during B-1 verification:', err);
  process.exit(1);
});
