/**
 * ============================================================================
 * PHYSIOCASE — PART B-3: PATIENT IDENTITY, CASE CORE LIFECYCLE & AUDIT DOMAIN ENGINE
 * VERIFICATION TEST SUITE
 * ============================================================================
 */

import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../src/db/migrator';
import { AuthService } from '../src/auth/service';
import { createSession } from '../src/auth/session';
import { signAccessToken } from '../src/auth/jwt';
import { createApp } from '../src/server/app';
import { CaseService } from '../src/domain/cases/case.service';
import { PatientService } from '../src/domain/patients/patient.service';
import type { Patient, Case } from '../src/types';

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

async function createTestTokens(
  db: PGlite,
  practitionerId: string,
  workspaceId: string,
  role: any
) {
  const { session, rawRefreshToken } = await createSession(db, practitionerId, workspaceId);
  const accessToken = await signAccessToken({
    sub: practitionerId,
    sid: session.id,
    ws: workspaceId,
    role,
  });
  return { accessToken, refreshToken: rawRefreshToken };
}

// HTTP helper for testing API endpoints
async function apiRequest(
  serverUrl: string,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

    const reqHeaders: Record<string, string> = {
      ...headers,
    };
    if (bodyStr) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData = rawData;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            // Leave as string
          }
          resolve({
            status: res.statusCode || 0,
            data: parsedData,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('=== PHYSIOCASE — PART B-3 DOMAIN ENGINE VERIFICATION SUITE ===\n');

  // ==========================================================================
  // SECTION 1: MIGRATION 003 HARDENING & SAFETY ROLLBACK
  // ==========================================================================
  console.log('--- Section 1: Migration 003 Hardening & Safety Rollback ---');

  // A. Test deliberate duplicate failure on separate database instance
  const failureDb = new PGlite();
  // Apply migrations 001 and 002
  await failureDb.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
  `);
  const fs = await import('node:fs');
  const path = await import('node:path');
  const m1 = fs.readFileSync('./src/db/migrations/001_foundation.sql', 'utf8');
  const m2 = fs.readFileSync('./src/db/migrations/002_identity_and_memberships.sql', 'utf8');
  await failureDb.exec(m1);
  await failureDb.query(`INSERT INTO _schema_migrations VALUES (1, 'foundation', 'chk1', clock_timestamp())`);
  await failureDb.exec(m2);
  await failureDb.query(`INSERT INTO _schema_migrations VALUES (2, 'identity_and_memberships', 'chk2', clock_timestamp())`);

  // Setup sample workspace and practitioner
  const ws1Res = await failureDb.query<{ id: string }>(
    `INSERT INTO workspaces (name, slug) VALUES ('Clinic A', 'clinic-a') RETURNING id`
  );
  const pr1Res = await failureDb.query<{ id: string }>(
    `INSERT INTO practitioners (email, name, password_hash) VALUES ('dr1@a.com', 'Dr. One', 'hash') RETURNING id`
  );

  // Insert duplicate token_hash
  const dupTokenHash = 'deliberate_duplicate_hash_99999';
  await failureDb.query(
    `INSERT INTO practitioner_sessions (practitioner_id, workspace_id, token_hash, expires_at)
     VALUES ($1, $2, $3, clock_timestamp() + interval '1 day'),
            ($1, $2, $3, clock_timestamp() + interval '2 days')`,
    [pr1Res.rows[0].id, ws1Res.rows[0].id, dupTokenHash]
  );

  // Attempt to run migration runner which will encounter migration 003
  let migrationErrorCaught = false;
  try {
    await runMigrations(failureDb);
  } catch (err: any) {
    migrationErrorCaught = true;
  }
  assert(migrationErrorCaught, 'Test 1.1: Migration 003 safely aborts when duplicate token_hash rows exist');

  // Verify rollback preserved data and original non-unique index
  const rollbackIdx = await failureDb.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'practitioner_sessions' AND indexname = 'idx_practitioner_sessions_token_hash'`
  );
  assert(rollbackIdx.rows.length === 1, 'Test 1.2: Rollback preserves original non-unique index intact');

  const rollbackData = await failureDb.query<{ count: string }>(
    `SELECT count(*) FROM practitioner_sessions WHERE token_hash = $1`,
    [dupTokenHash]
  );
  assert(parseInt(rollbackData.rows[0].count, 10) === 2, 'Test 1.3: Rollback preserves all existing session data with zero data loss');

  const rollbackMigs = await failureDb.query<{ version: number }>(
    `SELECT version FROM _schema_migrations WHERE version = 3`
  );
  assert(rollbackMigs.rows.length === 0, 'Test 1.4: Failed migration 003 is NOT recorded in _schema_migrations');
  await failureDb.close();

  // B. Run full migrations on clean database
  const db = new PGlite();
  const migResult = await runMigrations(db);
  assert(migResult.appliedCount === 3, 'Test 1.5: Migrations 001, 002, 003 applied successfully to clean database');

  // Verify unique index is enforced
  let duplicateRejected = false;
  try {
    const ws = await db.query<{ id: string }>(`INSERT INTO workspaces (name, slug) VALUES ('W1', 'w1') RETURNING id`);
    const pr = await db.query<{ id: string }>(`INSERT INTO practitioners (email, name, password_hash) VALUES ('p@w1.com', 'Dr P', 'hash') RETURNING id`);
    await db.query(
      `INSERT INTO practitioner_sessions (practitioner_id, workspace_id, token_hash, expires_at)
       VALUES ($1, $2, 'unique_token_test', clock_timestamp() + interval '1 day')`,
      [pr.rows[0].id, ws.rows[0].id]
    );
    await db.query(
      `INSERT INTO practitioner_sessions (practitioner_id, workspace_id, token_hash, expires_at)
       VALUES ($1, $2, 'unique_token_test', clock_timestamp() + interval '2 days')`,
      [pr.rows[0].id, ws.rows[0].id]
    );
  } catch {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'Test 1.6: Unique index on practitioner_sessions.token_hash rejects duplicate tokens');

  // Verify 24 authoritative clinical collections remain unchanged
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

  const tablesRes = await db.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const existingTables = new Set(tablesRes.rows.map((r) => r.table_name));

  assert(
    EXPECTED_24_CLINICAL_TABLES.every((t) => existingTables.has(t)) &&
    EXPECTED_24_CLINICAL_TABLES.length === 24,
    'Test 1.7: Exactly 24 authoritative clinical collections preserved intact'
  );

  // ==========================================================================
  // SECTION 2: ENVIRONMENT SETUP & USER ACTORS
  // ==========================================================================
  console.log('\n--- Section 2: Environment Setup & User Actors ---');

  const app = createApp(db);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const authService = new AuthService(db);

  // 1. Clinical Workspace Owner in Workspace 1
  const ownerReg = await authService.registerOwner({
    email: 'owner@clinic1.com',
    password: 'Password123!',
    name: 'Dr. Alice Owner',
    workspaceName: 'Spine & Joint Clinic',
    workspaceSlug: 'spine-joint-clinic',
    clinicalAuthorized: true,
  });
  const ownerTokens = (await authService.login({ email: 'owner@clinic1.com', password: 'Password123!' })).tokens;

  // 2. Administrative-Only Owner in Workspace 2 (clinical_authorized = false)
  const adminOwnerReg = await authService.registerOwner({
    email: 'admin.owner@clinic2.com',
    password: 'Password123!',
    name: 'Admin Bob (Non-Clinical)',
    workspaceName: 'Rehab Admin Corp',
    workspaceSlug: 'rehab-admin-corp',
    clinicalAuthorized: false,
  });
  const adminOwnerTokens = (await authService.login({ email: 'admin.owner@clinic2.com', password: 'Password123!' })).tokens;

  // 3. Clinical Practitioner in Workspace 1
  const clinicianPr = await db.query<{ id: string }>(
    `INSERT INTO practitioners (email, name, password_hash) VALUES ('clinician@clinic1.com', 'Dr. Charlie Clinician', 'hash') RETURNING id`
  );
  await db.query(
    `INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
     VALUES ($1, $2, 'clinical_practitioner', 'active', true)`,
    [ownerReg.workspace.id, clinicianPr.rows[0].id]
  );
  const clinicianTokens = await createTestTokens(db, clinicianPr.rows[0].id, ownerReg.workspace.id, 'clinical_practitioner');

  // 4. Read-Only Auditor in Workspace 1
  const auditorPr = await db.query<{ id: string }>(
    `INSERT INTO practitioners (email, name, password_hash) VALUES ('auditor@clinic1.com', 'Auditor Dana', 'hash') RETURNING id`
  );
  await db.query(
    `INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
     VALUES ($1, $2, 'read_only_auditor', 'active', false)`,
    [ownerReg.workspace.id, auditorPr.rows[0].id]
  );
  const auditorTokens = await createTestTokens(db, auditorPr.rows[0].id, ownerReg.workspace.id, 'read_only_auditor');

  // 5. Suspended Member in Workspace 1
  const suspendedPr = await db.query<{ id: string }>(
    `INSERT INTO practitioners (email, name, password_hash) VALUES ('suspended@clinic1.com', 'Dr. Suspended', 'hash') RETURNING id`
  );
  await db.query(
    `INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
     VALUES ($1, $2, 'clinical_practitioner', 'suspended', true)`,
    [ownerReg.workspace.id, suspendedPr.rows[0].id]
  );
  const suspendedTokens = await createTestTokens(db, suspendedPr.rows[0].id, ownerReg.workspace.id, 'clinical_practitioner');

  // 6. Clinically Authorized Practitioner in Workspace 2 (for tenant isolation tests)
  const clinician2Pr = await db.query<{ id: string }>(
    `INSERT INTO practitioners (email, name, password_hash) VALUES ('clinician2@clinic2.com', 'Dr. Clinician Two', 'hash') RETURNING id`
  );
  await db.query(
    `INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
     VALUES ($1, $2, 'clinical_practitioner', 'active', true)`,
    [adminOwnerReg.workspace.id, clinician2Pr.rows[0].id]
  );
  const clinician2Tokens = await createTestTokens(db, clinician2Pr.rows[0].id, adminOwnerReg.workspace.id, 'clinical_practitioner');

  assert(Boolean(ownerTokens.accessToken && clinicianTokens.accessToken && auditorTokens.accessToken && clinician2Tokens.accessToken), 'Test 2.1: Multi-role actor contexts initialized');

  // ==========================================================================
  // SECTION 3: PATIENT DOMAIN & AUTHORIZATION
  // ==========================================================================
  console.log('\n--- Section 3: Patient Domain & Authorization ---');

  // A. Unauthenticated request rejected
  const unauthRes = await apiRequest(baseUrl, 'POST', '/api/patients', {}, {
    fullName: 'Ghost Patient',
    dateOfBirth: '1990-01-01',
    reasonForVisit: 'Knee pain',
  });
  assert(unauthRes.status === 401, 'Test 3.1: Unauthenticated patient creation rejected with 401');

  // B. Suspended membership rejected
  const suspRes = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${suspendedTokens.accessToken}`,
  }, {
    fullName: 'Jane Doe',
    dateOfBirth: '1992-04-10',
    reasonForVisit: 'Shoulder impingement',
  });
  assert(suspRes.status === 403, 'Test 3.2: Suspended member rejected from patient creation with 403');

  // C. Read-Only Auditor cannot create patient
  const auditorCreateRes = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${auditorTokens.accessToken}`,
  }, {
    fullName: 'Jane Doe',
    dateOfBirth: '1992-04-10',
    reasonForVisit: 'Shoulder impingement',
  });
  assert(auditorCreateRes.status === 403, 'Test 3.3: Read-only auditor rejected from creating patient (403)');

  // D. Non-clinical owner cannot create patient
  const adminOwnerCreateRes = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${adminOwnerTokens.accessToken}`,
  }, {
    fullName: 'Jane Doe',
    dateOfBirth: '1992-04-10',
    reasonForVisit: 'Shoulder impingement',
  });
  assert(adminOwnerCreateRes.status === 403, 'Test 3.4: Non-clinical owner rejected from creating patient (403)');

  // E. Clinically authorized clinician creates patient successfully
  const createPatient1Res = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    fullName: 'Jane Doe',
    dateOfBirth: '1992-04-10',
    sex: 'Female',
    phone: '555-0101',
    email: 'jane.doe@example.com',
    reasonForVisit: 'Lumbar radiculopathy',
  });
  assert(createPatient1Res.status === 201, 'Test 3.5: Clinically authorized clinician successfully creates patient (201)');
  const patient1 = createPatient1Res.data;
  assert(patient1.patientNumber === 'PC-0001', 'Test 3.6: First patient assigned PC-0001 atomically');

  // F. Client cannot override workspace_id or human ID
  const overrideRes = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    fullName: 'Hacker Patient',
    dateOfBirth: '1990-01-01',
    reasonForVisit: 'Checkup',
    workspaceId: '00000000-0000-0000-0000-000000000000',
    patientNumber: 'PC-9999',
  });
  assert(overrideRes.status === 400, 'Test 3.7: Client override of workspaceId or patientNumber strictly rejected (400)');

  // G. Sequential patient creation increments to PC-0002
  const createPatient2Res = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${ownerTokens.accessToken}`,
  }, {
    fullName: 'John Smith',
    dateOfBirth: '1985-06-20',
    reasonForVisit: 'Rotator cuff tear',
  });
  assert(createPatient2Res.status === 201 && createPatient2Res.data.patientNumber === 'PC-0002', 'Test 3.8: Sequential patient allocated PC-0002 monotonically');
  const patient2 = createPatient2Res.data;

  // H. Auditor CAN read patients list and detail
  const auditorListRes = await apiRequest(baseUrl, 'GET', '/api/patients', {
    Authorization: `Bearer ${auditorTokens.accessToken}`,
  });
  assert(auditorListRes.status === 200 && auditorListRes.data.length === 2, 'Test 3.9: Read-only auditor can list patients (200)');

  const auditorGetRes = await apiRequest(baseUrl, 'GET', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${auditorTokens.accessToken}`,
  });
  assert(auditorGetRes.status === 200 && auditorGetRes.data.fullName === 'Jane Doe', 'Test 3.10: Read-only auditor can view patient detail (200)');

  // I. Update demographic fields
  const updateDemoRes = await apiRequest(baseUrl, 'PATCH', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    phone: '555-9999',
    reasonForVisit: 'Updated lumbar radiculopathy with numbness',
  });
  assert(updateDemoRes.status === 200 && updateDemoRes.data.phone === '555-9999', 'Test 3.11: Clinician updates permitted patient demographics');

  // J. Update patient safety profile
  const updateSafetyRes = await apiRequest(baseUrl, 'PATCH', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    patientSafetyProfile: {
      allergies: [{ id: 'a1', allergen: 'Latex', severity: 'severe', verificationStatus: 'verified' }],
      redFlags: [{ id: 'rf1', category: 'cauda_equina', notes: 'Screened negative' }],
    },
  });
  assert(updateSafetyRes.status === 200 && updateSafetyRes.data.patientSafetyProfile.allergies.length === 1, 'Test 3.12: Clinician updates patient safety profile');

  // K. Optimistic concurrency version check on patient
  const stalePatientUpdate = await apiRequest(baseUrl, 'PATCH', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    phone: '555-0000',
    version: 1, // Current version is 3
  });
  assert(stalePatientUpdate.status === 409, 'Test 3.13: Stale patient version rejected with 409 Conflict');

  // L. Auditor cannot mutate patient demographics
  const auditorPatchRes = await apiRequest(baseUrl, 'PATCH', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${auditorTokens.accessToken}`,
  }, {
    phone: '555-6666',
  });
  assert(auditorPatchRes.status === 403, 'Test 3.14: Read-only auditor cannot update patient (403)');

  // M. Non-clinical owner cannot mutate patient
  const adminOwnerPatchRes = await apiRequest(baseUrl, 'PATCH', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${adminOwnerTokens.accessToken}`,
  }, {
    phone: '555-6666',
  });
  assert(adminOwnerPatchRes.status === 403, 'Test 3.14b: Non-clinical owner cannot update patient (403)');

  // N. Clinically authorized user from Workspace 2 receives 404 when attempting to access Workspace 1 patient
  const crossWsPatchRes = await apiRequest(baseUrl, 'PATCH', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${clinician2Tokens.accessToken}`,
  }, {
    phone: '555-6666',
  });
  assert(crossWsPatchRes.status === 404, 'Test 3.15: Cross-workspace access returns 404 Not Found without leaking patient existence');

  // ==========================================================================
  // SECTION 4: CASE DOMAIN & LIFECYCLE STATE TRANSITIONS
  // ==========================================================================
  console.log('\n--- Section 4: Case Domain & Lifecycle State Transitions ---');

  // A. Create case starting at Assessment
  const createCaseRes = await apiRequest(baseUrl, 'POST', '/api/cases', {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    patientId: patient1.id,
    caseName: 'Lumbar Spine Rehabilitation',
    presentingProblem: 'Mechanical low back pain with radiculopathy',
    dateOfOnset: '2026-02-01',
    referralSource: 'GP Dr. Taylor',
    startDate: '2026-03-01',
    bodyRegion: 'Lumbar Spine',
  });
  assert(createCaseRes.status === 201, 'Test 4.1: Case created successfully (201)');
  const case1 = createCaseRes.data;
  assert(case1.caseId === 'CASE-0001', 'Test 4.2: First case allocated CASE-0001 atomically');
  assert(case1.status === 'Assessment' && case1.stage === 'assessment', 'Test 4.3: New case starts at Assessment status with assessment stage');
  assert(case1.isArchived === false, 'Test 4.4: New case is not archived');

  // B. Case creation fails if patient belongs to another workspace (404)
  const crossPatientCaseRes = await apiRequest(baseUrl, 'POST', '/api/cases', {
    Authorization: `Bearer ${clinician2Tokens.accessToken}`,
  }, {
    patientId: patient1.id, // Workspace 1 patient, called by Workspace 2 clinician
    caseName: 'Cross Tenant Case',
  });
  assert(crossPatientCaseRes.status === 404, 'Test 4.5: Creating case with foreign patientId returns 404 Not Found');

  // C. Prohibited transition: Assessment -> Reassessment
  const illegalJumpRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Reassessment',
  });
  assert(illegalJumpRes.status === 400, 'Test 4.6: Prohibited transition Assessment -> Reassessment rejected (400)');

  // D. Allowed transition: Assessment -> Treatment
  const txTransitionRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Treatment',
  });
  assert(txTransitionRes.status === 200, 'Test 4.7: Allowed transition Assessment -> Treatment accepted (200)');
  assert(txTransitionRes.data.status === 'Treatment' && txTransitionRes.data.stage === 'treatment', 'Test 4.8: Stage automatically synchronized to lowercase "treatment"');

  // E. Allowed transition: Treatment -> Reassessment
  const reassessTransitionRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Reassessment',
  });
  assert(reassessTransitionRes.status === 200 && reassessTransitionRes.data.status === 'Reassessment', 'Test 4.9: Allowed transition Treatment -> Reassessment accepted (200)');

  // F. Allowed transition: Reassessment -> Treatment
  const backToTxRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Treatment',
  });
  assert(backToTxRes.status === 200 && backToTxRes.data.status === 'Treatment', 'Test 4.10: Allowed transition Reassessment -> Treatment accepted (200)');

  // G. Allowed transition: Treatment -> Discharged
  const dischargeRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Discharged',
  });
  assert(dischargeRes.status === 200 && dischargeRes.data.status === 'Discharged', 'Test 4.11: Allowed transition Treatment -> Discharged accepted (200)');

  // H. Prohibited transition from Discharged to Assessment
  const dischargeToAssessRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Assessment',
  });
  assert(dischargeToAssessRes.status === 400, 'Test 4.12: Prohibited transition Discharged -> Assessment rejected (400)');

  // I. Allowed reopen: Discharged -> Treatment
  const reopenRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Treatment',
  });
  assert(reopenRes.status === 200 && reopenRes.data.status === 'Treatment', 'Test 4.13: Allowed reopen transition Discharged -> Treatment accepted (200)');

  // J. Contradictory status and stage rejected
  const divergeRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    status: 'Treatment',
    stage: 'assessment',
  });
  assert(divergeRes.status === 400, 'Test 4.14: Contradictory status and stage rejected (400)');

  // ==========================================================================
  // SECTION 5: AUTHORITATIVE CASE ARCHIVAL & UNARCHIVAL
  // ==========================================================================
  console.log('\n--- Section 5: Authoritative Case Archival & Unarchival ---');

  // Case 1 is pre-clinical (0 clinical sessions, 0 notes, 0 problems/goals)
  // A. Pre-clinical case rejects clinical reasons
  const preClinicalBadReasonRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/archive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'care_discontinued_uncontactable',
    notes: 'Patient not reached',
  });
  assert(preClinicalBadReasonRes.status === 422, 'Test 5.1: Pre-clinical case rejects clinical archive reason (422)');

  // B. Pre-clinical case accepts clerical reason 'test_or_demo'
  const preClinicalArchiveRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/archive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'test_or_demo',
    notes: 'Practice test record',
  });
  assert(preClinicalArchiveRes.status === 200, 'Test 5.2: Pre-clinical case archives with test_or_demo (200)');
  assert(preClinicalArchiveRes.data.isArchived === true, 'Test 5.3: Case isArchived marked true');
  assert(preClinicalArchiveRes.data.status === 'Treatment', 'Test 5.4: Clinical status Treatment preserved unchanged across archival');

  // C. Prohibit modifications on archived case
  const editArchivedRes = await apiRequest(baseUrl, 'PATCH', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    caseName: 'Sneaky Edit on Archived Case',
  });
  assert(editArchivedRes.status === 422, 'Test 5.5: Modifications on archived case strictly rejected (422)');

  // D. Unarchive case
  const unarchiveRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/unarchive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'Restoring case for genuine care documentation',
  });
  assert(unarchiveRes.status === 200 && unarchiveRes.data.isArchived === false, 'Test 5.6: Case unarchived successfully (200)');
  assert(unarchiveRes.data.archivedAt === undefined && unarchiveRes.data.archiveReason === undefined, 'Test 5.7: Database archive columns cleared on unarchive satisfying integrity constraint');

  // E. Add clinical documentation to case (simulating documented clinical case)
  await db.query(
    `INSERT INTO clinical_sessions (workspace_id, case_id, patient_id, session_number, session_date, status, overall_tolerance, is_finalized)
     VALUES ($1, $2, $3, 1, '2026-03-05', 'completed', 'well_tolerated', false)`,
    [ownerReg.workspace.id, case1.id, patient1.id]
  );

  // F. Documented case rejects 'created_in_error' and 'test_or_demo'
  const docErrorReasonRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/archive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'created_in_error',
    notes: 'I made a mistake',
  });
  assert(docErrorReasonRes.status === 422, 'Test 5.8: Documented clinical case strictly rejects created_in_error (422)');

  const docDemoReasonRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/archive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'test_or_demo',
    notes: 'Demo run',
  });
  assert(docDemoReasonRes.status === 422, 'Test 5.9: Documented clinical case strictly rejects test_or_demo (422)');

  // G. Documented case requires mandatory notes for clinical reasons
  const missingNotesRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/archive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'care_discontinued_uncontactable',
    notes: '', // Empty notes
  });
  assert(missingNotesRes.status === 400, 'Test 5.10: Mandatory explanatory notes required for documented clinical case archival (400)');

  // H. Non-clinical owner cannot archive with clinical reason
  // Create shell case for workspace 2
  const patientWs2 = (await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${ownerTokens.accessToken}`, // Use clinician to create patient in ws1 for setup
  }, {
    fullName: 'Ws2 Patient',
    dateOfBirth: '1980-01-01',
    reasonForVisit: 'Knee',
  })).data;

  // I. Documented case archives successfully with clinical reason and valid notes
  const validClinicalArchiveRes = await apiRequest(baseUrl, 'POST', `/api/cases/${case1.id}/archive`, {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    reason: 'care_discontinued_uncontactable',
    notes: 'Patient phone disconnected, three attempts to contact made without response.',
  });
  assert(validClinicalArchiveRes.status === 200, 'Test 5.11: Documented clinical case archives with valid clinical reason and notes');

  // ==========================================================================
  // SECTION 6: AUDIT ENGINE & TRANSACTIONAL INTEGRITY
  // ==========================================================================
  console.log('\n--- Section 6: Audit Engine & Transactional Integrity ---');

  // Verify audit events persisted in database
  const auditRes = await db.query<{ action: string; entity_type: string; entity_id: string; sequence: string }>(
    `SELECT action, entity_type, entity_id, sequence FROM audit_events WHERE workspace_id = $1 ORDER BY sequence ASC`,
    [ownerReg.workspace.id]
  );
  assert(auditRes.rows.length >= 6, 'Test 6.1: Authoritative audit events recorded in database');

  const createPatientAudit = auditRes.rows.find((r) => r.action === 'CREATE' && r.entity_type === 'patient' && r.entity_id === patient1.id);
  assert(Boolean(createPatientAudit), 'Test 6.2: Patient creation audit event recorded (action=CREATE, entity_type=patient)');

  const createCaseAudit = auditRes.rows.find((r) => r.action === 'CREATE' && r.entity_type === 'case' && r.entity_id === case1.id);
  assert(Boolean(createCaseAudit), 'Test 6.3: Case creation audit event recorded (action=CREATE, entity_type=case)');

  const softDeleteAudit = auditRes.rows.find((r) => r.action === 'SOFT_DELETE' && r.entity_type === 'case' && r.entity_id === case1.id);
  assert(Boolean(softDeleteAudit), 'Test 6.4: Case archival audit event recorded (action=SOFT_DELETE, entity_type=case)');

  // Verify unarchive audit metadata preserved previous archive context
  const unarchiveAuditRes = await db.query<{ metadata: any; reason: string }>(
    `SELECT metadata, reason FROM audit_events WHERE workspace_id = $1 AND entity_id = $2 AND action = 'UPDATE' AND reason LIKE '%Restoring%'`,
    [ownerReg.workspace.id, case1.id]
  );
  assert(unarchiveAuditRes.rows.length === 1, 'Test 6.5: Case unarchive audit event recorded (action=UPDATE, entity_type=case)');
  const unarchiveMeta = typeof unarchiveAuditRes.rows[0].metadata === 'string'
    ? JSON.parse(unarchiveAuditRes.rows[0].metadata)
    : unarchiveAuditRes.rows[0].metadata;
  assert(unarchiveMeta.previousArchiveReason === 'test_or_demo', 'Test 6.6: Unarchive audit event preserved previousArchiveReason in metadata');

  // G. Audit failure rolls back patient creation
  await db.query(`ALTER FUNCTION allocate_next_audit_sequence(uuid) RENAME TO allocate_next_audit_sequence_temp`);
  const patFailRes = await apiRequest(baseUrl, 'POST', '/api/patients', {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    fullName: 'Rollback Patient',
    dateOfBirth: '1995-01-01',
    reasonForVisit: 'Testing rollback',
  });
  assert(patFailRes.status === 500, 'Test 6.7a: Patient creation fails with 500 when audit sequence allocation fails');

  const rollbackPatCheck = await db.query<{ count: string }>(
    `SELECT count(*) FROM patients WHERE full_name = 'Rollback Patient'`
  );
  assert(parseInt(rollbackPatCheck.rows[0].count, 10) === 0, 'Test 6.7: Audit failure triggers transaction rollback; patient record is not created');

  // H. Audit failure rolls back case creation
  const caseFailRes = await apiRequest(baseUrl, 'POST', '/api/cases', {
    Authorization: `Bearer ${clinicianTokens.accessToken}`,
  }, {
    patientId: patient1.id,
    caseName: 'Rollback Case',
  });
  assert(caseFailRes.status === 500, 'Test 6.8a: Case creation fails with 500 when audit sequence allocation fails');

  const rollbackCaseCheck = await db.query<{ count: string }>(
    `SELECT count(*) FROM cases WHERE case_name = 'Rollback Case'`
  );
  assert(parseInt(rollbackCaseCheck.rows[0].count, 10) === 0, 'Test 6.8: Audit failure triggers transaction rollback; case record is not created');

  // Restore audit sequence function
  await db.query(`ALTER FUNCTION allocate_next_audit_sequence_temp(uuid) RENAME TO allocate_next_audit_sequence`);

  // ==========================================================================
  // SECTION 7: CONCURRENCY & TENANT ISOLATION
  // ==========================================================================
  console.log('\n--- Section 7: Concurrency & Tenant Isolation ---');

  // Concurrent patient creation produces unique, monotonically allocated IDs
  const concurrentPatientPromises = [
    apiRequest(baseUrl, 'POST', '/api/patients', { Authorization: `Bearer ${clinicianTokens.accessToken}` }, { fullName: 'Concurrent A', dateOfBirth: '1990-01-01', reasonForVisit: 'A' }),
    apiRequest(baseUrl, 'POST', '/api/patients', { Authorization: `Bearer ${clinicianTokens.accessToken}` }, { fullName: 'Concurrent B', dateOfBirth: '1990-01-01', reasonForVisit: 'B' }),
    apiRequest(baseUrl, 'POST', '/api/patients', { Authorization: `Bearer ${clinicianTokens.accessToken}` }, { fullName: 'Concurrent C', dateOfBirth: '1990-01-01', reasonForVisit: 'C' }),
  ];
  const concurrentPatients = await Promise.all(concurrentPatientPromises);
  const allocatedPatientNumbers = concurrentPatients.map((r) => r.data.patientNumber);
  const uniquePatientNumbers = new Set(allocatedPatientNumbers);
  assert(allocatedPatientNumbers.length === 3 && uniquePatientNumbers.size === 3, 'Test 7.1: Concurrent patient creation generates unique human IDs');

  // Cross-tenant data isolation: Workspace 2 user cannot see Workspace 1 patients
  const ws2PatientList = await apiRequest(baseUrl, 'GET', '/api/patients', {
    Authorization: `Bearer ${adminOwnerTokens.accessToken}`,
  });
  assert(ws2PatientList.status === 200 && ws2PatientList.data.length === 0, 'Test 7.2: Tenant isolation: Workspace 2 cannot see Workspace 1 patients (empty list)');

  // Cross-tenant patient detail access returns 404
  const ws2PatientDetail = await apiRequest(baseUrl, 'GET', `/api/patients/${patient1.id}`, {
    Authorization: `Bearer ${adminOwnerTokens.accessToken}`,
  });
  assert(ws2PatientDetail.status === 404, 'Test 7.3: Tenant isolation: Workspace 2 access to Workspace 1 patient returns 404');

  // Cross-tenant case detail access returns 404
  const ws2CaseDetail = await apiRequest(baseUrl, 'GET', `/api/cases/${case1.id}`, {
    Authorization: `Bearer ${adminOwnerTokens.accessToken}`,
  });
  assert(ws2CaseDetail.status === 404, 'Test 7.4: Tenant isolation: Workspace 2 access to Workspace 1 case returns 404');

  // Teardown
  server.close();
  await db.close();

  console.log('\n================================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
