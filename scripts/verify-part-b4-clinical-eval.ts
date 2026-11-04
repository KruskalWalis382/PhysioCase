/**
 * ============================================================================
 * PHYSIOCASE — PART B-4: CLINICAL DOCUMENTATION ENGINE VERIFICATION SUITE
 * 22 Mandatory Clinical Evaluation Scenarios
 * ============================================================================
 */

import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../src/db/migrator';
import { AuthService } from '../src/auth/service';
import { createSession } from '../src/auth/session';
import { signAccessToken } from '../src/auth/jwt';
import { createApp } from '../src/server/app';
import { PatientService } from '../src/domain/patients/patient.service';
import { CaseService } from '../src/domain/cases/case.service';
import { SubjectiveAssessmentService } from '../src/domain/assessments/subjective.service';
import { ObjectiveAssessmentService } from '../src/domain/assessments/objective.service';
import { InvestigationService } from '../src/domain/investigations/investigation.service';

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
  console.log('=== PHYSIOCASE — PART B-4 CLINICAL EVALUATION SUITE ===\n');

  // Initialize DB and run all migrations
  const db = new PGlite();
  await runMigrations(db);

  // Setup app & HTTP server
  const app = createApp(db);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const authService = new AuthService(db);
  const patientService = new PatientService(db);
  const caseService = new CaseService(db);

  // 1. Create Workspace 1 with Clinically Authorized Owner
  const owner1 = await authService.registerOwner({
    email: 'clinical.owner@clinic1.com',
    password: 'Password123!',
    name: 'Dr. Jane Clinical',
    title: 'Lead Physiotherapist',
    clinicName: 'Premier Physio',
    registrationNumber: 'PHY-1001',
    initials: 'JC',
    workspaceName: 'Premier Physio Workspace',
    workspaceSlug: 'premier-physio',
    clinicalAuthorized: true,
  });

  const { accessToken: owner1Token } = await createTestTokens(
    db,
    owner1.practitioner.id,
    owner1.workspace.id,
    'workspace_owner'
  );

  // 2. Create Non-Clinically Authorized Owner in Workspace 1
  const adminReg = await authService.registerOwner({
    email: 'admin.owner@clinic1.com',
    password: 'Password123!',
    name: 'Bob Admin',
    title: 'Practice Manager',
    clinicName: 'Premier Physio',
    initials: 'BA',
    workspaceName: 'Admin Workspace',
    workspaceSlug: 'admin-workspace',
    clinicalAuthorized: false,
  });

  const { accessToken: nonClinicalOwnerToken } = await createTestTokens(
    db,
    adminReg.practitioner.id,
    owner1.workspace.id, // linked to Workspace 1
    'workspace_owner'
  );

  // 3. Create Read-Only Auditor in Workspace 1
  const auditorMember = await authService.addWorkspaceMember(
    {
      workspace: owner1.workspace,
      membership: owner1.membership,
      practitioner: owner1.practitioner,
      sessionId: 's1',
    },
    {
      email: 'auditor@clinic1.com',
      name: 'Arthur Auditor',
      role: 'read_only_auditor',
      clinicalAuthorized: false,
    }
  );

  const { accessToken: auditorToken } = await createTestTokens(
    db,
    auditorMember.practitioner.id,
    owner1.workspace.id,
    'read_only_auditor'
  );

  // 4. Create Workspace 2 (for multi-tenant isolation tests)
  const owner2 = await authService.registerOwner({
    email: 'owner@clinic2.com',
    password: 'Password123!',
    name: 'Dr. Mark Foreign',
    title: 'Physiotherapist',
    clinicName: 'Foreign Clinic',
    initials: 'MF',
    workspaceName: 'Foreign Physio Workspace',
    workspaceSlug: 'foreign-physio',
    clinicalAuthorized: true,
  });

  const { accessToken: owner2Token } = await createTestTokens(
    db,
    owner2.practitioner.id,
    owner2.workspace.id,
    'workspace_owner'
  );

  // 5. Create a Patient & Case in Workspace 1
  const pat1 = await patientService.createPatient(
    {
      workspace: owner1.workspace,
      membership: owner1.membership,
      practitioner: owner1.practitioner,
      sessionId: 's1',
    },
    {
      fullName: 'John Doe',
      dateOfBirth: '1985-05-15',
      gender: 'male',
      reasonForVisit: 'Lumbar spine pain',
    } as any
  );

  const case1 = await caseService.createCase(
    {
      workspace: owner1.workspace,
      membership: owner1.membership,
      practitioner: owner1.practitioner,
      sessionId: 's1',
    },
    {
      patientId: pat1.id,
      caseName: 'Lumbar Radiculopathy Episode',
      presentingProblem: 'Lower back pain radiating to right leg',
      startDate: '2026-03-01',
      status: 'Assessment',
    }
  );

  console.log(`Setup complete. Primary Case: ${case1.caseId} (${case1.id})\n`);

  // ==========================================================================
  // SCENARIO 1: Side-effect-free GET returns null
  // ==========================================================================
  console.log('--- Scenario 1: Side-effect-free GET returns null ---');
  const s1Res = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` }
  );

  assert(s1Res.status === 200, 'Scenario 1.1: GET on unstarted subjective assessment returns 200');
  assert(s1Res.data === null, 'Scenario 1.2: GET returns null without auto-creating row');

  // Verify DB table and audit table are completely untouched
  const s1DbCheck = await db.query<{ count: string }>(`SELECT count(*) FROM subjective_assessments WHERE case_id = $1`, [case1.id]);
  const s1AuditCheck = await db.query<{ count: string }>(
    `SELECT count(*) FROM audit_events WHERE case_id = $1 AND entity_type = 'subjective_assessment'`,
    [case1.id]
  );
  assert(parseInt(s1DbCheck.rows[0].count, 10) === 0, 'Scenario 1.3: Zero rows created in subjective_assessments');
  assert(parseInt(s1AuditCheck.rows[0].count, 10) === 0, 'Scenario 1.4: Zero audit events recorded on GET');

  // ==========================================================================
  // SCENARIO 2: Initial save with version 1
  // ==========================================================================
  console.log('\n--- Scenario 2: Initial save with version 1 ---');
  const s2Payload = {
    patientStory: 'Patient reports acute lower back pain after heavy lifting 3 days ago.',
    symptomLocations: ['lumbar', 'right_buttock'],
    symptomDescriptions: ['sharp', 'aching'],
    painSeverity: { current: 7, best: 3, worst: 8 },
    onset: 'Sudden',
  };

  const s2Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    s2Payload
  );

  assert(s2Res.status === 200, 'Scenario 2.1: Initial PUT returns 200');
  assert(s2Res.data.status === 'in_progress', 'Scenario 2.2: Initial draft status is in_progress');
  assert(s2Res.data.isFinalized === false, 'Scenario 2.3: isFinalized is false');
  assert(s2Res.data.patientStory === s2Payload.patientStory, 'Scenario 2.4: patientStory persisted accurately');

  // Check version in DB
  const s2Db = await db.query<{ version: number }>(
    `SELECT version FROM subjective_assessments WHERE case_id = $1`,
    [case1.id]
  );
  assert(s2Db.rows[0]?.version === 1, 'Scenario 2.5: Initial database version is 1');

  // Verify CREATE audit event recorded
  const s2Audit = await db.query<{ action: string; sequence: string }>(
    `SELECT action, sequence FROM audit_events WHERE case_id = $1 AND entity_type = 'subjective_assessment' ORDER BY sequence DESC LIMIT 1`,
    [case1.id]
  );
  assert(s2Audit.rows[0]?.action === 'CREATE', 'Scenario 2.6: Audit event action is CREATE');

  // ==========================================================================
  // SCENARIO 3: Valid draft update
  // ==========================================================================
  console.log('\n--- Scenario 3: Valid draft update ---');
  const s3Payload = {
    version: 1,
    patientStory: 'Patient reports lower back pain with right leg paresthesia.',
    aggravatingFactors: ['sitting', 'forward_bending'],
    easingFactors: ['lying_supine', 'gentle_walking'],
  };

  const s3Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    s3Payload
  );

  assert(s3Res.status === 200, 'Scenario 3.1: Valid update with correct version returns 200');
  const s3Db = await db.query<{ version: number }>(
    `SELECT version FROM subjective_assessments WHERE case_id = $1`,
    [case1.id]
  );
  assert(s3Db.rows[0]?.version === 2, 'Scenario 3.2: Version incremented to 2 via trigger');

  const s3Audit = await db.query<{ action: string }>(
    `SELECT action FROM audit_events WHERE case_id = $1 AND entity_type = 'subjective_assessment' ORDER BY sequence DESC LIMIT 1`,
    [case1.id]
  );
  assert(s3Audit.rows[0]?.action === 'UPDATE', 'Scenario 3.3: Audit event action is UPDATE');

  // ==========================================================================
  // SCENARIO 4: Stale-version rejection (409)
  // ==========================================================================
  console.log('\n--- Scenario 4: Stale-version rejection (409) ---');
  const s4Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1, // Stale! DB is at version 2
      patientStory: 'Concurrent collision attempt with stale version 1',
    }
  );

  assert(s4Res.status === 409, 'Scenario 4.1: Stale version 1 correctly rejected with 409 Conflict');
  assert(s4Res.data.error.includes('Record version conflict'), 'Scenario 4.2: Error message cites version conflict');

  // Verify DB record remained at version 2
  const s4Db = await db.query<{ version: number }>(
    `SELECT version FROM subjective_assessments WHERE case_id = $1`,
    [case1.id]
  );
  assert(s4Db.rows[0]?.version === 2, 'Scenario 4.3: Database record version preserved at 2');

  // ==========================================================================
  // SCENARIO 5: Concurrent first-save collision (409)
  // ==========================================================================
  console.log('\n--- Scenario 5: Concurrent first-save collision (409) ---');
  // Attempt to save on existing record without specifying a version (simulating two first-saves)
  const s5Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      patientStory: 'Second first-save attempt without version',
    }
  );

  assert(s5Res.status === 409, 'Scenario 5.1: Second first-save attempt rejected with 409 Conflict');
  assert(s5Res.data.error.includes('Assessment already exists'), 'Scenario 5.2: Error message indicates assessment exists');

  // ==========================================================================
  // SCENARIO 6: Completed but unfinalized draft
  // ==========================================================================
  console.log('\n--- Scenario 6: Completed but unfinalized draft ---');
  const s6Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      markCompleted: true,
      patientStory: 'Completed draft of patient story and history.',
    }
  );

  assert(s6Res.status === 200, 'Scenario 6.1: Mark completed PUT returns 200');
  assert(s6Res.data.status === 'completed', 'Scenario 6.2: Status is completed');
  assert(s6Res.data.isFinalized === false, 'Scenario 6.3: isFinalized remains false (not yet signed off)');
  assert(s6Res.data.completedAt !== undefined, 'Scenario 6.4: completedAt timestamp is stamped');

  const s6Db = await db.query<{ version: number; is_finalized: boolean; status: string }>(
    `SELECT version, is_finalized, status FROM subjective_assessments WHERE case_id = $1`,
    [case1.id]
  );
  assert(s6Db.rows[0]?.status === 'completed' && s6Db.rows[0]?.is_finalized === false, 'Scenario 6.5: Database confirms completed status without finalization');

  // ==========================================================================
  // SCENARIO 7: Finalization
  // ==========================================================================
  console.log('\n--- Scenario 7: Finalization ---');
  const s7Res = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/subjective/finalize`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 3, // DB was incremented to 3 by scenario 6
    }
  );

  assert(s7Res.status === 200, 'Scenario 7.1: Finalize returns 200');
  assert(s7Res.data.isFinalized === true, 'Scenario 7.2: isFinalized is true');
  assert(s7Res.data.status === 'completed', 'Scenario 7.3: status is completed');
  assert(s7Res.data.finalizedAt !== undefined, 'Scenario 7.4: finalizedAt is recorded');
  assert(s7Res.data.finalizedBy?.name === 'Dr. Jane Clinical', 'Scenario 7.5: finalizedBy records signing clinician');

  const s7Audit = await db.query<{ action: string }>(
    `SELECT action FROM audit_events WHERE case_id = $1 AND entity_type = 'subjective_assessment' ORDER BY sequence DESC LIMIT 1`,
    [case1.id]
  );
  assert(s7Audit.rows[0]?.action === 'FINALIZE', 'Scenario 7.6: Audit event action is FINALIZE');

  // ==========================================================================
  // SCENARIO 8: Repeated finalization rejection (409)
  // ==========================================================================
  console.log('\n--- Scenario 8: Repeated finalization rejection (409) ---');
  const s8Res = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/subjective/finalize`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 4, // Current version is 4 after finalization
    }
  );

  assert(s8Res.status === 409, 'Scenario 8.1: Repeated finalization rejected with 409 Conflict');
  assert(s8Res.data.error.includes('already finalized'), 'Scenario 8.2: Error message states already finalized');

  // ==========================================================================
  // SCENARIO 9: Direct edit rejection after finalization (422)
  // ==========================================================================
  console.log('\n--- Scenario 9: Direct edit rejection after finalization (422) ---');
  const s9Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 4,
      patientStory: 'Attempting to overwrite a legally finalized medical record.',
    }
  );

  assert(s9Res.status === 422, 'Scenario 9.1: Direct modification of finalized record rejected with 422');
  assert(s9Res.data.error.includes('Finalized clinical records are legally immutable'), 'Scenario 9.2: Medical-legal immutability error returned');

  // ==========================================================================
  // SCENARIO 10: Valid amendment
  // ==========================================================================
  console.log('\n--- Scenario 10: Valid amendment ---');
  const s10Res = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/subjective/amend`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 4,
      reason: 'clinical_update',
      text: 'Patient phoned to report symptom centralization into lower back after prescribed extension exercises.',
    }
  );

  assert(s10Res.status === 200, 'Scenario 10.1: Governed amendment returns 200');
  assert(Array.isArray(s10Res.data.amendments) && s10Res.data.amendments.length === 1, 'Scenario 10.2: Amendments array contains 1 entry');
  assert(s10Res.data.amendments[0].reason === 'clinical_update', 'Scenario 10.3: Amendment reason recorded accurately');
  assert(s10Res.data.amendments[0].amendedBy?.name === 'Dr. Jane Clinical', 'Scenario 10.4: Amending actor recorded accurately');

  // Verify trigger accepted amendment and incremented version
  const s10Db = await db.query<{ version: number }>(
    `SELECT version FROM subjective_assessments WHERE case_id = $1`,
    [case1.id]
  );
  assert(s10Db.rows[0]?.version === 5, 'Scenario 10.5: Database version incremented to 5 via finalization guard trigger');

  // Verify AMEND audit event recorded
  const s10Audit = await db.query<{ action: string; reason: string }>(
    `SELECT action, reason FROM audit_events WHERE case_id = $1 AND entity_type = 'subjective_assessment' ORDER BY sequence DESC LIMIT 1`,
    [case1.id]
  );
  assert(s10Audit.rows[0]?.action === 'AMEND', 'Scenario 10.6: Audit event action is AMEND');
  assert(s10Audit.rows[0]?.reason.includes('centralization'), 'Scenario 10.7: Audit event reason contains amendment text');

  // ==========================================================================
  // SCENARIO 11: Invalid amendment reason/text rejection (400)
  // ==========================================================================
  console.log('\n--- Scenario 11: Invalid amendment reason/text rejection (400) ---');
  const s11InvalidReason = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/subjective/amend`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 5,
      reason: 'unsupported_reason',
      text: 'Valid text but invalid reason',
    }
  );
  assert(s11InvalidReason.status === 400, 'Scenario 11.1: Invalid reason rejected with 400 Bad Request');

  const s11EmptyText = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/subjective/amend`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 5,
      reason: 'correction',
      text: '   ', // empty trimmed
    }
  );
  assert(s11EmptyText.status === 400, 'Scenario 11.2: Empty amendment text rejected with 400 Bad Request');

  // ==========================================================================
  // SCENARIO 12: Amendment on unfinalized record rejection (422)
  // ==========================================================================
  console.log('\n--- Scenario 12: Amendment on unfinalized record rejection (422) ---');
  // Create a second case in Workspace 1
  const case2 = await caseService.createCase(
    {
      workspace: owner1.workspace,
      membership: owner1.membership,
      practitioner: owner1.practitioner,
      sessionId: 's1',
    },
    {
      patientId: pat1.id,
      caseName: 'Cervical Strain Episode',
      startDate: '2026-03-05',
    }
  );

  // Create unfinalized draft on Case 2
  await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case2.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    { patientStory: 'Neck pain after RTA.' }
  );

  // Attempt amendment on unfinalized draft
  const s12Res = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case2.id}/subjective/amend`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      reason: 'correction',
      text: 'Premature amendment attempt on draft.',
    }
  );

  assert(s12Res.status === 422, 'Scenario 12.1: Amendment on unfinalized record rejected with 422');
  assert(s12Res.data.error.includes('Only finalized clinical records can be amended'), 'Scenario 12.2: Explanatory error message');

  // ==========================================================================
  // SCENARIO 13: Archived-case mutation rejection (422)
  // ==========================================================================
  console.log('\n--- Scenario 13: Archived-case mutation rejection (422) ---');
  // Archive Case 2
  await caseService.archiveCase(
    {
      workspace: owner1.workspace,
      membership: owner1.membership,
      practitioner: owner1.practitioner,
      sessionId: 's1',
    },
    case2.id,
    {
      reason: 'administrative_closure',
      notes: 'Archived for testing immutability guarantees.',
    }
  );

  // Attempt subjective mutation on archived case
  const s13SubRes = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case2.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    { patientStory: 'Attempting to edit subjective on archived case.' }
  );
  assert(s13SubRes.status === 422, 'Scenario 13.1: Subjective edit on archived case rejected with 422');

  // Attempt objective mutation on archived case
  const s13ObjRes = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case2.id}/objective`,
    { Authorization: `Bearer ${owner1Token}` },
    { findings: [{ examinationArea: 'Cervical', finding: 'Spasm' }] }
  );
  assert(s13ObjRes.status === 422, 'Scenario 13.2: Objective edit on archived case rejected with 422');

  // Attempt investigation creation on archived case
  const s13InvRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case2.id}/investigations`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      name: 'C-Spine X-Ray',
      modality: 'xray',
      bodyRegion: 'Cervical',
      investigationDate: '2026-03-06',
    }
  );
  assert(s13InvRes.status === 422, 'Scenario 13.3: Investigation creation on archived case rejected with 422');

  // ==========================================================================
  // SCENARIO 14: Unauthorized mutation rejection (403)
  // ==========================================================================
  console.log('\n--- Scenario 14: Unauthorized mutation rejection (403) ---');
  // 1. Non-clinical owner attempting subjective save
  const s14NonClin = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${nonClinicalOwnerToken}` },
    { version: 5, patientStory: 'Unauthorized attempt by administrative owner.' }
  );
  assert(s14NonClin.status === 403, 'Scenario 14.1: Non-clinically authorized owner rejected with 403 Forbidden');

  // 2. Read-only auditor attempting investigation creation
  const s14Auditor = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/investigations`,
    { Authorization: `Bearer ${auditorToken}` },
    {
      name: 'Lumbar MRI',
      modality: 'mri',
      bodyRegion: 'Lumbar',
      investigationDate: '2026-03-07',
    }
  );
  assert(s14Auditor.status === 403, 'Scenario 14.2: Read-only auditor rejected with 403 Forbidden');

  // ==========================================================================
  // SCENARIO 15: Objective finding persistence with unique IDs
  // ==========================================================================
  console.log('\n--- Scenario 15: Objective finding persistence with unique IDs ---');
  const s15Payload = {
    selectedAreas: ['lumbar_spine', 'neurological'],
    findings: [
      {
        examinationArea: 'lumbar_spine',
        finding: 'Active flexion limited to 40 degrees with right buttock pain. Extension full and pain-free.',
      },
      {
        examinationArea: 'neurological',
        finding: 'Right S1 reflex diminished compared to left. SLR positive on right at 45 degrees.',
      },
    ],
    therapistNotes: 'Consistent with L5/S1 nerve root irritation.',
  };

  const s15Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/objective`,
    { Authorization: `Bearer ${owner1Token}` },
    s15Payload
  );

  assert(s15Res.status === 200, 'Scenario 15.1: Objective initial save returns 200');
  assert(s15Res.data.findings.length === 2, 'Scenario 15.2: Exactly 2 findings stored');
  assert(Boolean(s15Res.data.findings[0].id) && Boolean(s15Res.data.findings[1].id), 'Scenario 15.3: Unique finding IDs generated');
  assert(s15Res.data.findings[0].id !== s15Res.data.findings[1].id, 'Scenario 15.4: Finding IDs are distinct');

  const s15Audit = await db.query<{ action: string }>(
    `SELECT action FROM audit_events WHERE case_id = $1 AND entity_type = 'objective_assessment' ORDER BY sequence DESC LIMIT 1`,
    [case1.id]
  );
  assert(s15Audit.rows[0]?.action === 'CREATE', 'Scenario 15.5: Objective CREATE audit event emitted');

  // ==========================================================================
  // SCENARIO 16: Objective finalization & amendment protections
  // ==========================================================================
  console.log('\n--- Scenario 16: Objective finalization & amendment protections ---');
  // Finalize objective assessment (version is 1)
  const s16FinalRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/objective/finalize`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1 }
  );
  assert(s16FinalRes.status === 200, 'Scenario 16.1: Objective finalization returns 200');
  assert(s16FinalRes.data.isFinalized === true, 'Scenario 16.2: Objective isFinalized is true');

  // Attempt direct PUT on finalized objective assessment
  const s16DirectPut = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/objective`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 2, therapistNotes: 'Direct edit overwrite attempt.' }
  );
  assert(s16DirectPut.status === 422, 'Scenario 16.3: Direct PUT on finalized objective rejected with 422');

  // Amend finalized objective assessment
  const s16Amend = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/objective/amend`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      reason: 'late_entry',
      text: 'Re-checked myotomes: Hallux extension (L5) 5/5 bilateral, Plantarflexion (S1) 4+/5 right vs 5/5 left.',
    }
  );
  assert(s16Amend.status === 200, 'Scenario 16.4: Objective amendment returns 200');
  assert(s16Amend.data.amendments.length === 1, 'Scenario 16.5: Objective amendments array updated');

  // ==========================================================================
  // SCENARIO 17: Investigation creation & retrieval
  // ==========================================================================
  console.log('\n--- Scenario 17: Investigation creation & retrieval ---');
  const s17Payload = {
    category: 'radiological',
    modality: 'mri',
    name: 'Lumbar Spine MRI',
    bodyRegion: 'Lumbar Spine',
    investigationDate: '2026-03-04',
    indication: 'Right lower extremity radicular symptoms',
    findings: 'L5-S1 right paracentral disc protrusion compressing traversing S1 nerve root.',
    impression: 'Right S1 radiculopathy secondary to L5-S1 disc protrusion.',
    sourceType: 'radiology_clinic',
    sourceName: 'Metro Radiology',
    clinicianRelevance: 'Confirms clinical hypothesis of mechanical S1 nerve root irritation.',
  };

  const s17CreateRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/investigations`,
    { Authorization: `Bearer ${owner1Token}` },
    s17Payload
  );

  assert(s17CreateRes.status === 201, 'Scenario 17.1: Investigation creation returns 201');
  const invId = s17CreateRes.data.id;
  assert(Boolean(invId), 'Scenario 17.2: Investigation received generated UUID');
  assert(s17CreateRes.data.name === s17Payload.name, 'Scenario 17.3: Investigation name matches');

  // List investigations
  const s17ListRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/investigations`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(s17ListRes.status === 200, 'Scenario 17.4: List investigations returns 200');
  assert(s17ListRes.data.length === 1, 'Scenario 17.5: Investigation listed in case');

  // Get by ID
  const s17GetRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/investigations/${invId}`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(s17GetRes.status === 200, 'Scenario 17.6: Get investigation by ID returns 200');
  assert(s17GetRes.data.id === invId, 'Scenario 17.7: Retrieved ID matches');

  // Update investigation
  const s17UpdateRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/investigations/${invId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      clinicianRelevance: 'Updated clinical relevance: Disc protrusion matches S1 dermatome deficits.',
    }
  );
  assert(s17UpdateRes.status === 200, 'Scenario 17.8: Investigation PATCH update returns 200');

  // ==========================================================================
  // SCENARIO 18: Investigation archival with reason & audit SOFT_DELETE
  // ==========================================================================
  console.log('\n--- Scenario 18: Investigation archival with reason & audit SOFT_DELETE ---');
  const s18Res = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/investigations/${invId}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Duplicate report scanned from referral pack' }
  );

  assert(s18Res.status === 200, 'Scenario 18.1: Investigation archive returns 200');
  assert(s18Res.data.isArchived === true, 'Scenario 18.2: isArchived is true');
  assert(s18Res.data.archiveReason === 'Duplicate report scanned from referral pack', 'Scenario 18.3: archiveReason stored');

  // Verify excluded from default list query
  const s18ActiveList = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/investigations`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(s18ActiveList.data.length === 0, 'Scenario 18.4: Excluded from default active investigations list');

  // Verify included when includeArchived=true
  const s18AllList = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/investigations?includeArchived=true`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(s18AllList.data.length === 1, 'Scenario 18.5: Returned when includeArchived=true');

  // Verify SOFT_DELETE audit event recorded
  const s18Audit = await db.query<{ action: string; reason: string }>(
    `SELECT action, reason FROM audit_events WHERE case_id = $1 AND entity_type = 'clinical_investigation' ORDER BY sequence DESC LIMIT 1`,
    [case1.id]
  );
  assert(s18Audit.rows[0]?.action === 'SOFT_DELETE', 'Scenario 18.6: Audit event action is SOFT_DELETE');
  assert(s18Audit.rows[0]?.reason.includes('Duplicate report'), 'Scenario 18.7: Audit event reason contains archive reason');

  // ==========================================================================
  // SCENARIO 19: Repeated investigation archive rejection (400)
  // ==========================================================================
  console.log('\n--- Scenario 19: Repeated investigation archive rejection (400) ---');
  const s19Res = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/investigations/${invId}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Second archive attempt' }
  );

  assert(s19Res.status === 400, 'Scenario 19.1: Repeated archive rejected with 400 Bad Request');
  assert(s19Res.data.error.includes('already archived'), 'Scenario 19.2: Error message indicates already archived');

  // ==========================================================================
  // SCENARIO 20: Cross-workspace isolation (404)
  // ==========================================================================
  console.log('\n--- Scenario 20: Cross-workspace isolation (404) ---');
  // Foreign owner (Workspace 2) attempts to access Workspace 1 case assessments
  const s20SubGet = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner2Token}` }
  );
  assert(s20SubGet.status === 404, 'Scenario 20.1: Cross-workspace subjective GET returns 404 Not Found');

  const s20SubPut = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case1.id}/subjective`,
    { Authorization: `Bearer ${owner2Token}` },
    { patientStory: 'Foreign tenant intrusion' }
  );
  assert(s20SubPut.status === 404, 'Scenario 20.2: Cross-workspace subjective PUT returns 404 Not Found');

  const s20InvGet = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/investigations/${invId}`,
    { Authorization: `Bearer ${owner2Token}` }
  );
  assert(s20InvGet.status === 404, 'Scenario 20.3: Cross-workspace investigation GET returns 404 Not Found');

  // ==========================================================================
  // SCENARIO 21: Audit failure rollback on save
  // ==========================================================================
  console.log('\n--- Scenario 21: Audit failure rollback on save ---');
  // Create a third case in Workspace 1
  const case3 = await caseService.createCase(
    {
      workspace: owner1.workspace,
      membership: owner1.membership,
      practitioner: owner1.practitioner,
      sessionId: 's1',
    },
    {
      patientId: pat1.id,
      caseName: 'Audit Failure Test Case',
      startDate: '2026-03-10',
    }
  );

  // Install a temporary trigger that blocks audit insert for case3
  await db.exec(`
    CREATE OR REPLACE FUNCTION trigger_fail_case3_audit()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.case_id = '${case3.id}'::uuid THEN
        RAISE EXCEPTION 'SIMULATED_AUDIT_FAILURE_ON_SAVE';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_test_fail_audit
      BEFORE INSERT ON audit_events
      FOR EACH ROW EXECUTE FUNCTION trigger_fail_case3_audit();
  `);

  const s21Res = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case3.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    { patientStory: 'This must roll back if audit fails.' }
  );

  assert(s21Res.status === 500, 'Scenario 21.1: Request returns 500 when audit write fails');

  // Verify rollback: zero subjective rows exist for case3!
  const s21DbCheck = await db.query<{ count: string }>(
    `SELECT count(*) FROM subjective_assessments WHERE case_id = $1`,
    [case3.id]
  );
  assert(parseInt(s21DbCheck.rows[0].count, 10) === 0, 'Scenario 21.2: Subjective assessment completely rolled back (0 rows)');

  // Remove the temporary trigger
  await db.exec(`DROP TRIGGER trg_test_fail_audit ON audit_events; DROP FUNCTION trigger_fail_case3_audit;`);

  // ==========================================================================
  // SCENARIO 22: Audit failure rollback on finalization
  // ==========================================================================
  console.log('\n--- Scenario 22: Audit failure rollback on finalization ---');
  // Now successfully create draft on case3
  const s22Draft = await apiRequest(
    baseUrl,
    'PUT',
    `/api/cases/${case3.id}/subjective`,
    { Authorization: `Bearer ${owner1Token}` },
    { patientStory: 'Draft for finalization rollback test.' }
  );
  assert(s22Draft.status === 200, 'Scenario 22.1: Initial draft save succeeded');

  // Re-install failure trigger only for FINALIZE action on case3
  await db.exec(`
    CREATE OR REPLACE FUNCTION trigger_fail_finalize_audit()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.case_id = '${case3.id}'::uuid AND NEW.action = 'FINALIZE' THEN
        RAISE EXCEPTION 'SIMULATED_AUDIT_FAILURE_ON_FINALIZE';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_test_fail_finalize_audit
      BEFORE INSERT ON audit_events
      FOR EACH ROW EXECUTE FUNCTION trigger_fail_finalize_audit();
  `);

  const s22FinalRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case3.id}/subjective/finalize`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1 }
  );

  assert(s22FinalRes.status === 500, 'Scenario 22.2: Finalization returns 500 when audit write fails');

  // Verify record remains unfinalized in DB!
  const s22DbCheck = await db.query<{ is_finalized: boolean; version: number }>(
    `SELECT is_finalized, version FROM subjective_assessments WHERE case_id = $1`,
    [case3.id]
  );
  assert(s22DbCheck.rows[0]?.is_finalized === false, 'Scenario 22.3: Record remains is_finalized = false after rollback');
  assert(s22DbCheck.rows[0]?.version === 1, 'Scenario 22.4: Version remains 1 after rollback');

  // Clean up trigger
  await db.exec(`DROP TRIGGER trg_test_fail_finalize_audit ON audit_events; DROP FUNCTION trigger_fail_finalize_audit;`);

  // Close server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n================================================================');
  console.log(`B-4 EVALUATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
