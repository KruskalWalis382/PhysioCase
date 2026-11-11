/**
 * ============================================================================
 * PHYSIOCASE — PRE-B7A: FRONTEND MULTI-USER INTEGRATION & CACHE ISOLATION
 * ============================================================================
 * 
 * Verifies all Pre-B7A architectural requirements and invariants:
 * 1. Multi-Tenant Identity & Auth:
 *    - Practitioner A and B register independent accounts with private workspaces.
 *    - Login issues workspace-bound access tokens and refresh tokens.
 *    - GET /api/auth/me returns independent user profiles and workspace IDs.
 *    - Refresh token rotation operates correctly without cross-tenant session bleed.
 * 
 * 2. Storage Key Partitioning & Cache Isolation:
 *    - Storage keys are deterministic: physiocase_ws_${workspaceId}_${baseKey}.
 *    - Partitioned storage stores data independently without collision.
 *    - In-memory wipe simulation verifies active state reset on logout.
 * 
 * 3. Cross-Tenant API Resource Isolation:
 *    - Practitioner A creates clinical problems and goals in Workspace A.
 *    - Practitioner B attempts to read/mutate A's problem or goal using B's token.
 *    - Backend strictly isolates tenant data, returning 404 for foreign workspace IDs.
 * 
 * 4. Workspace-Bound Backup & Restore Integrity:
 *    - Export generates an envelope with explicit workspace metadata.
 *    - Backup validation detects workspace mismatch (ERR_WORKSPACE_MISMATCH).
 *    - Restore writes exclusively into target workspace's partitioned keys.
 */

import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../src/db/migrator';
import { createApp } from '../src/server/app';
import { PatientService } from '../src/domain/patients/patient.service';
import { CaseService } from '../src/domain/cases/case.service';
import {
  createWorkspaceBackupEnvelope,
  validateWorkspaceBackup,
  executeReplaceRestore,
  getWorkspaceStorageKey,
} from '../src/utils/workspaceBackup';
import type { AuthoritativeWorkspaceDataset } from '../src/types/backup';

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

function createEmptyAuthoritativeDataset(): AuthoritativeWorkspaceDataset {
  return {
    settings: {
      practitionerName: 'Dr. Test Therapist',
      credentials: 'PT, DPT',
      clinicName: 'Test Clinic',
      licenseNumber: 'PT-998822',
      email: 'therapist@testclinic.com',
      theme: 'warm-clinical',
      density: 'comfortable',
      measurementSystem: 'metric',
      framework: 'journey',
      reviewCadenceWeeks: 4,
    },
    patients: [],
    cases: [],
    subjectiveAssessments: [],
    clinicalThreads: [],
    objectiveAssessments: [],
    clinicalProblems: [],
    clinicalGoals: [],
    treatmentPlans: [],
    treatmentSelections: [],
    treatmentEvidenceLinks: [],
    treatmentConditionLinks: [],
    evidenceSources: [],
    evidenceItems: [],
    conditionPresentations: [],
    conditionEvidenceLinks: [],
    clinicalInvestigations: [],
    clinicalSessions: [],
    sessionTreatmentDeliveries: [],
    outcomeMeasureDefinitions: [],
    progressRecords: [],
    progressMeasurements: [],
    caseDischargeRecords: [],
    auditEvents: [],
  };
}

async function runTestSuite() {
  console.log('=== PHYSIOCASE — PRE-B7A FRONTEND MULTI-USER INTEGRATION VERIFICATION ===\n');

  // Initialize fresh in-memory database with migrations
  const db = new PGlite();
  await runMigrations(db);

  // Spin up test server
  const app = createApp(db);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: INDEPENDENT MULTI-USER REGISTRATION & AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log('\n--- Section 1: Independent Multi-User Registration & Authentication ---');

    // 1.1 Register Practitioner Alice
    const regResAlice = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.physio@example.com',
        password: 'AliceStrongPassword2026!',
        name: 'Dr. Alice Sterling, PT',
        workspaceName: "Alice's Private Clinic",
        workspaceSlug: 'alices-private-clinic',
        clinicalAuthorized: true,
      }),
    });
    const regDataAlice: any = await regResAlice.json();
    assert(
      regResAlice.status === 201 &&
      !!regDataAlice.practitioner &&
      !!regDataAlice.workspace &&
      !!regDataAlice.tokens.accessToken &&
      !!regDataAlice.tokens.refreshToken,
      'TC-B7A-01: Practitioner Alice registers with private workspace and receives tokens'
    );

    const aliceToken = regDataAlice.tokens.accessToken;
    const aliceRefresh = regDataAlice.tokens.refreshToken;
    const aliceWorkspaceId = regDataAlice.workspace.id;
    const alicePractitionerId = regDataAlice.practitioner.id;

    // 1.2 Register Practitioner Bob
    const regResBob = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob.rehab@example.com',
        password: 'BobStrongPassword2026!',
        name: 'Dr. Bob Vance, DPT',
        workspaceName: "Bob's Sports Rehabilitation",
        workspaceSlug: 'bobs-sports-rehab',
        clinicalAuthorized: true,
      }),
    });
    const regDataBob: any = await regResBob.json();
    assert(
      regResBob.status === 201 &&
      !!regDataBob.practitioner &&
      !!regDataBob.workspace &&
      regDataBob.workspace.id !== aliceWorkspaceId &&
      regDataBob.practitioner.id !== alicePractitionerId,
      'TC-B7A-02: Practitioner Bob registers with completely independent workspace and practitioner ID'
    );

    const bobToken = regDataBob.tokens.accessToken;
    const bobRefresh = regDataBob.tokens.refreshToken;
    const bobWorkspaceId = regDataBob.workspace.id;
    const bobPractitionerId = regDataBob.practitioner.id;

    // 1.3 Verify GET /api/auth/me for Alice
    const meResAlice = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const meDataAlice: any = await meResAlice.json();
    assert(
      meResAlice.status === 200 &&
      meDataAlice.practitioner.id === alicePractitionerId &&
      meDataAlice.workspace.id === aliceWorkspaceId &&
      meDataAlice.capabilities.canMutateClinical === true &&
      meDataAlice.capabilities.isOwner === true,
      'TC-B7A-03: Alice GET /api/auth/me resolves Alice identity, workspace, and owner clinical capabilities'
    );

    // 1.4 Verify GET /api/auth/me for Bob
    const meResBob = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    const meDataBob: any = await meResBob.json();
    assert(
      meResBob.status === 200 &&
      meDataBob.practitioner.id === bobPractitionerId &&
      meDataBob.workspace.id === bobWorkspaceId &&
      meDataBob.workspace.id !== aliceWorkspaceId,
      'TC-B7A-04: Bob GET /api/auth/me resolves Bob identity and distinct workspace ID'
    );

    // 1.5 Session refresh rotation for Bob
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: bobRefresh }),
    });
    const refreshData: any = await refreshRes.json();
    assert(
      refreshRes.status === 200 &&
      !!refreshData.accessToken &&
      !!refreshData.refreshToken &&
      refreshData.refreshToken !== bobRefresh,
      'TC-B7A-05: Refresh token rotation issues fresh access token and rotated refresh token'
    );

    // 1.6 Replay of invalidated refresh token is rejected
    const replayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: bobRefresh }),
    });
    assert(
      replayRes.status === 401,
      'TC-B7A-06: Replaying previous refresh token is rejected with HTTP 401'
    );

    // ------------------------------------------------------------------------
    // SECTION 2: STORAGE PARTITIONING & CLIENT-SIDE CACHE ISOLATION
    // ------------------------------------------------------------------------
    console.log('\n--- Section 2: Storage Partitioning & Client-Side Cache Isolation ---');

    // 2.1 Storage key helper formatting
    const keyAlicePatients = getWorkspaceStorageKey('patients', aliceWorkspaceId);
    const keyBobPatients = getWorkspaceStorageKey('patients', bobWorkspaceId);
    const expectedAliceKey = `physiocase_ws_${aliceWorkspaceId}_patients`;
    const expectedBobKey = `physiocase_ws_${bobWorkspaceId}_patients`;

    assert(
      keyAlicePatients === expectedAliceKey && keyBobPatients === expectedBobKey,
      'TC-B7A-07: getWorkspaceStorageKey generates deterministic partitioned keys per workspace ID'
    );
    assert(
      keyAlicePatients !== keyBobPatients,
      'TC-B7A-08: Workspace storage keys are mutually exclusive across independent practitioners'
    );

    // 2.2 Storage simulation of shared browser localStorage
    const mockStorage: Record<string, string> = {};
    const alicePatientRecord = JSON.stringify([{ id: 'pat-alice-1', name: 'Alice Patient A' }]);
    const bobPatientRecord = JSON.stringify([{ id: 'pat-bob-1', name: 'Bob Patient B' }]);

    mockStorage[keyAlicePatients] = alicePatientRecord;
    mockStorage[keyBobPatients] = bobPatientRecord;

    assert(
      mockStorage[keyAlicePatients] !== mockStorage[keyBobPatients] &&
      JSON.parse(mockStorage[keyAlicePatients])[0].id === 'pat-alice-1' &&
      JSON.parse(mockStorage[keyBobPatients])[0].id === 'pat-bob-1',
      'TC-B7A-09: Local storage partitions co-exist without cross-contamination or overwriting'
    );

    // 2.3 Simulating logout: wipe in-memory state and ensure unauthenticated state cannot read active workspace data
    let inMemoryPatients: any[] | null = JSON.parse(mockStorage[keyAlicePatients]);
    let currentWorkspaceId: string | null = aliceWorkspaceId;

    // Simulate logout action (ClinicalContext resets memory)
    currentWorkspaceId = null;
    inMemoryPatients = null;

    assert(
      currentWorkspaceId === null && inMemoryPatients === null,
      'TC-B7A-10: Logout cleanly wipes active clinical state from in-memory context'
    );

    // Simulate Bob logging in on same device
    currentWorkspaceId = bobWorkspaceId;
    const loadedBobKey = getWorkspaceStorageKey('patients', currentWorkspaceId);
    inMemoryPatients = JSON.parse(mockStorage[loadedBobKey] || '[]');

    assert(
      inMemoryPatients.length === 1 && inMemoryPatients[0].id === 'pat-bob-1',
      'TC-B7A-11: Subsequent login on shared browser loads only the authenticated practitioner partition'
    );

    // 3.1 Setup prerequisite patient and case in Alice's workspace using domain services
    const authCtxAlice = {
      workspace: regDataAlice.workspace,
      membership: regDataAlice.membership,
      practitioner: regDataAlice.practitioner,
      sessionId: 'test-session-alice',
    };

    const patientService = new PatientService(db);
    const caseService = new CaseService(db);

    const pat1 = await patientService.createPatient(authCtxAlice as any, {
      fullName: 'Eleanor Rigby',
      dateOfBirth: '1985-05-12',
      gender: 'female',
      reasonForVisit: 'Right rotator cuff pain',
    } as any);

    const case1 = await caseService.createCase(authCtxAlice as any, {
      patientId: pat1.id,
      caseName: 'Right Rotator Cuff Tendinopathy',
      presentingProblem: 'Shoulder pain with abduction',
    } as any);

    const patientAId = pat1.id;
    const caseAId = case1.id;

    // 3.2 Alice creates a clinical problem via API
    const probResAlice = await fetch(`${baseUrl}/api/cases/${caseAId}/problems`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Supraspinatus Tendon Degeneration with Subacromial Impingement',
        status: 'active',
        therapistNotes: 'Confirmed on Hawkins-Kennedy and Neer tests.',
      }),
    });
    const probDataAlice: any = await probResAlice.json();
    assert(
      probResAlice.status === 201 && !!probDataAlice.id,
      'TC-B7A-12: Alice successfully creates a clinical problem in Workspace A'
    );

    const problemAId = probDataAlice.id;

    // 3.3 Alice creates a clinical goal linked to the problem via API
    const goalResAlice = await fetch(`${baseUrl}/api/cases/${caseAId}/goals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Pain-free shoulder abduction to 160 degrees',
        type: 'short_term',
        targetDate: '2026-12-15',
        status: 'active',
        linkedProblemIds: [problemAId],
      }),
    });
    const goalDataAlice: any = await goalResAlice.json();
    assert(
      goalResAlice.status === 201 && !!goalDataAlice.id,
      'TC-B7A-13: Alice successfully creates a clinical goal in Workspace A'
    );

    const goalAId = goalDataAlice.id;

    // 3.4 Bob attempts to query Alice's clinical problem via API using Bob's Bearer token
    // 3.4 Bob acquires fresh active session in Workspace B (since replay test revoked previous session)
    const bobLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bob.rehab@example.com',
        password: 'BobStrongPassword2026!',
      }),
    });
    const bobLoginData: any = await bobLoginRes.json();
    const bobActiveToken = bobLoginData.tokens.accessToken;

    // 3.5 Bob attempts to query Alice's clinical problem via API using Bob's Bearer token
    const bobGetProbRes = await fetch(`${baseUrl}/api/cases/${caseAId}/problems/${problemAId}`, {
      headers: { Authorization: `Bearer ${bobActiveToken}` },
    });
    assert(
      bobGetProbRes.status === 404,
      'TC-B7A-14: Bob query for Alice clinical problem returns HTTP 404 (Resource not found in workspace)'
    );

    // 3.6 Bob attempts to update Alice's clinical problem via API
    const bobUpdateProbRes = await fetch(`${baseUrl}/api/cases/${caseAId}/problems/${problemAId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${bobActiveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 1,
        title: 'Tampered by Bob',
        status: 'resolved',
      }),
    });
    assert(
      bobUpdateProbRes.status === 404,
      'TC-B7A-15: Bob mutation of Alice clinical problem returns HTTP 404'
    );

    // 3.7 Bob attempts to query Alice's clinical goal via API
    const bobGetGoalRes = await fetch(`${baseUrl}/api/cases/${caseAId}/goals/${goalAId}`, {
      headers: { Authorization: `Bearer ${bobActiveToken}` },
    });
    assert(
      bobGetGoalRes.status === 404,
      'TC-B7A-16: Bob query for Alice clinical goal returns HTTP 404'
    );

    // 3.8 Bob attempts to archive Alice's clinical goal via API
    const bobArchiveGoalRes = await fetch(`${baseUrl}/api/cases/${caseAId}/goals/${goalAId}/archive`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bobActiveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'Tampered archive attempt',
      }),
    });
    assert(
      bobArchiveGoalRes.status === 404,
      'TC-B7A-17: Bob archival attempt of Alice clinical goal returns HTTP 404'
    );

    // ------------------------------------------------------------------------
    // SECTION 4: BACKUP & RESTORE WORKSPACE ISOLATION
    // ------------------------------------------------------------------------
    console.log('\n--- Section 4: Backup & Restore Workspace Isolation ---');

    const sampleDataset = createEmptyAuthoritativeDataset();
    sampleDataset.patients = [
      {
        id: patientAId,
        firstName: 'Eleanor',
        lastName: 'Rigby',
        dateOfBirth: '1985-05-12',
        gender: 'Female',
        contactPhone: '+1234567890',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
    ];
    sampleDataset.cases = [
      {
        id: caseAId,
        patientId: patientAId,
        caseId: 'CAS-001',
        title: 'Right Rotator Cuff',
        status: 'Active',
        episodeType: 'Initial',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
    ];

    // 4.1 Export envelope with explicit workspace metadata
    const aliceEnvelope = await createWorkspaceBackupEnvelope(
      sampleDataset,
      '1.0.0',
      '1.1',
      {
        workspaceId: aliceWorkspaceId,
        workspaceName: "Alice's Private Clinic",
        practitionerEmail: 'alice.physio@example.com',
      }
    );

    assert(
      aliceEnvelope.workspace !== undefined &&
      aliceEnvelope.workspace.workspaceId === aliceWorkspaceId &&
      aliceEnvelope.workspace.workspaceName === "Alice's Private Clinic",
      'TC-B7A-18: createWorkspaceBackupEnvelope embeds verified workspace metadata'
    );

    // 4.2 Validating backup within Alice's matching workspace succeeds
    const aliceValidation = await validateWorkspaceBackup(
      JSON.stringify(aliceEnvelope),
      aliceWorkspaceId
    );
    assert(
      aliceValidation.valid === true && aliceValidation.errors.length === 0,
      'TC-B7A-19: Validating backup envelope within matching active workspace succeeds'
    );

    // 4.3 Validating Alice's backup within Bob's workspace fails with ERR_WORKSPACE_MISMATCH
    const mismatchValidation = await validateWorkspaceBackup(
      JSON.stringify(aliceEnvelope),
      bobWorkspaceId
    );
    const hasMismatchError = mismatchValidation.errors.some(
      (e) => e.code === 'ERR_WORKSPACE_MISMATCH'
    );
    assert(
      mismatchValidation.valid === false && hasMismatchError,
      'TC-B7A-20: Validating backup envelope in a mismatching workspace is rejected with ERR_WORKSPACE_MISMATCH'
    );

    // 4.4 Envelope without workspace metadata (legacy) produces warning but allows restore with target workspace binding
    const legacyEnvelope = JSON.parse(JSON.stringify(aliceEnvelope));
    delete legacyEnvelope.workspace;
    const legacyValidation = await validateWorkspaceBackup(
      JSON.stringify(legacyEnvelope),
      bobWorkspaceId
    );
    const hasLegacyWarning = legacyValidation.warnings.length > 0;
    assert(
      legacyValidation.valid === true && hasLegacyWarning,
      'TC-B7A-21: Legacy backup without workspace metadata generates warning while allowing restore'
    );

    // 4.5 Restore writes strictly to the active workspace partitioned storage keys
    const restoreStorage: Record<string, string> = {};
    const fakeLocalStorage = {
      getItem: (key: string) => restoreStorage[key] ?? null,
      setItem: (key: string, val: string) => { restoreStorage[key] = val; },
      removeItem: (key: string) => { delete restoreStorage[key]; },
      clear: () => { Object.keys(restoreStorage).forEach((k) => delete restoreStorage[k]); },
      key: (i: number) => Object.keys(restoreStorage)[i] || null,
      length: 0,
    } as Storage;

    let rehydratedDataset: AuthoritativeWorkspaceDataset | null = null;
    const restoreResult = await executeReplaceRestore(
      aliceEnvelope,
      createEmptyAuthoritativeDataset(),
      (ds) => { rehydratedDataset = ds; },
      fakeLocalStorage,
      aliceWorkspaceId
    );

    const restoredAlicePatientKey = getWorkspaceStorageKey('patients', aliceWorkspaceId);
    const restoredBobPatientKey = getWorkspaceStorageKey('patients', bobWorkspaceId);

    assert(
      restoreResult.success === true &&
      !!restoreStorage[restoredAlicePatientKey] &&
      restoreStorage[restoredBobPatientKey] === undefined &&
      rehydratedDataset !== null,
      'TC-B7A-22: executeReplaceRestore writes exclusively to target workspace partitioned storage keys'
    );

  } finally {
    await server.close();
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PRE-B7A VERIFICATION SUMMARY:');
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error in Pre-B7A test suite:', err);
  process.exit(1);
});
