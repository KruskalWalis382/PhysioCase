/**
 * ============================================================================
 * PHYSIOCASE — PART B-6: CLINICAL GOAL SERVICE & API VERIFICATION SUITE
 * Complete Verification for Clinical Goals, Validation, Concurrency, Linkages,
 * Multi-Tenancy, Authorization, Lifecycle, and Injected Audit Integrity.
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
import { ProblemService } from '../src/domain/problems/problem.service';

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
            // Keep raw string
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
  console.log('=== PHYSIOCASE — PART B-6 CLINICAL GOAL VERIFICATION SUITE ===\n');

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
  const problemService = new ProblemService(db);

  // 1. Setup Workspace 1 with Clinically Authorized Owner
  const owner1 = await authService.registerOwner({
    email: 'sarah.mitchell@physiomaster.com',
    password: 'Password123!',
    name: 'Dr. Sarah Mitchell',
    title: 'Senior Physical Therapist',
    clinicName: 'Spine & Motion Clinic',
    registrationNumber: 'PHY-1029',
    initials: 'SM',
    workspaceName: 'Spine Motion Primary',
    workspaceSlug: 'spine-motion-primary',
    clinicalAuthorized: true,
  });

  const { accessToken: owner1Token } = await createTestTokens(
    db,
    owner1.practitioner.id,
    owner1.workspace.id,
    'workspace_owner'
  );

  const authCtxOwner1 = {
    workspace: owner1.workspace,
    membership: owner1.membership,
    practitioner: owner1.practitioner,
    sessionId: 'test-session-1',
  };

  // 2. Setup Non-Clinically Authorized Member in Workspace 1
  const nonClinicalMember = await authService.addWorkspaceMember(authCtxOwner1, {
    email: 'admin.clark@physiomaster.com',
    name: 'Michael Clark',
    role: 'clinical_practitioner',
    clinicalAuthorized: false,
    title: 'Practice Coordinator',
    initials: 'MC',
  });

  const { accessToken: nonClinicalToken } = await createTestTokens(
    db,
    nonClinicalMember.practitioner.id,
    owner1.workspace.id,
    'clinical_practitioner'
  );

  // 3. Setup Read-Only Auditor in Workspace 1
  const auditorMember = await authService.addWorkspaceMember(authCtxOwner1, {
    email: 'auditor.frank@compliance.org',
    name: 'Frank Auditor',
    role: 'read_only_auditor',
    clinicalAuthorized: false,
    title: 'External Auditor',
    initials: 'FA',
  });

  const { accessToken: auditorToken } = await createTestTokens(
    db,
    auditorMember.practitioner.id,
    owner1.workspace.id,
    'read_only_auditor'
  );

  // 4. Setup Workspace 2 with Clinically Authorized Owner (Multi-tenancy isolation)
  const owner2 = await authService.registerOwner({
    email: 'robert.foreign@foreignclinic.com',
    password: 'Password123!',
    name: 'Dr. Robert Foreign',
    title: 'Physiotherapist',
    clinicName: 'Foreign Clinic',
    registrationNumber: 'PHY-9999',
    initials: 'RF',
    workspaceName: 'Foreign Physio Clinic',
    workspaceSlug: 'foreign-physio-clinic',
    clinicalAuthorized: true,
  });

  const { accessToken: owner2Token } = await createTestTokens(
    db,
    owner2.practitioner.id,
    owner2.workspace.id,
    'workspace_owner'
  );

  const authCtxOwner2 = {
    workspace: owner2.workspace,
    membership: owner2.membership,
    practitioner: owner2.practitioner,
    sessionId: 'test-session-2',
  };

  // 5. Create Patient & Active Case in Workspace 1
  const pat1 = await patientService.createPatient(authCtxOwner1, {
    fullName: 'Eleanor Vance',
    dateOfBirth: '1984-03-15',
    gender: 'female',
    reasonForVisit: 'Subacromial impingement with rotator cuff tendinopathy',
  } as any);

  const case1 = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Right Shoulder Rehabilitation',
    presentingProblem: 'Painful arc with supraspinatus weakness',
    startDate: new Date().toISOString().split('T')[0],
  });

  // 6. Formulate Clinical Problems in Case 1 (Using B-5 service)
  const prob1 = await problemService.createProblem(authCtxOwner1, case1.id, {
    title: 'Supraspinatus Tendinopathy with Painful Arc',
    status: 'active',
  });

  const prob2 = await problemService.createProblem(authCtxOwner1, case1.id, {
    title: 'Scapular Dyskinesis with Upward Rotation Deficit',
    status: 'active',
  });

  const probToArchive = await problemService.createProblem(authCtxOwner1, case1.id, {
    title: 'Cervical Radiculopathy Rule-Out Problem',
    status: 'active',
  });
  await problemService.archiveProblem(authCtxOwner1, case1.id, probToArchive.id, {
    reason: 'Ruled out following normal cervical spine assessment',
  });

  // 7. Setup Patient, Case, and Problem in Workspace 2
  const pat2 = await patientService.createPatient(authCtxOwner2, {
    fullName: 'Foreign Patient',
    dateOfBirth: '1992-06-10',
    gender: 'male',
    reasonForVisit: 'Ankle instability',
  } as any);

  const case2 = await caseService.createCase(authCtxOwner2, {
    patientId: pat2.id,
    caseName: 'Foreign Case',
    startDate: new Date().toISOString().split('T')[0],
  });

  const probForeign = await problemService.createProblem(authCtxOwner2, case2.id, {
    title: 'Lateral Ankle Ligament Laxity',
    status: 'active',
  });

  // 8. Create an Archived Case in Workspace 1
  const caseArchived = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Archived Case for Governance Tests',
    startDate: new Date().toISOString().split('T')[0],
  });
  await caseService.archiveCase(authCtxOwner1, caseArchived.id, {
    reason: 'test_or_demo',
    notes: 'Case closed for archival testing',
  });

  console.log('--- CATEGORY A: CRUD & INPUT VALIDATION ---');

  // TC01: Valid goal creation with defaults
  const createRes1 = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Achieve 160 degrees pain-free shoulder abduction',
      status: 'active',
    }
  );
  assert(
    createRes1.status === 201 &&
      createRes1.data.id &&
      createRes1.data.caseId === case1.id &&
      createRes1.data.patientId === pat1.id &&
      createRes1.data.title === 'Achieve 160 degrees pain-free shoulder abduction' &&
      createRes1.data.type === 'short_term' &&
      createRes1.data.status === 'active' &&
      createRes1.data.version === 1 &&
      createRes1.data.isArchived === false &&
      createRes1.data.achievedAt === undefined,
    'TC01: Valid goal creation returns 201 with default short_term type, version 1, active status'
  );
  const goal1Id = createRes1.data.id;

  // TC02: Valid goal creation with custom values
  const createResCustom = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Return to overhead swimming training (1500m)',
      type: 'long_term',
      description: 'Continuous freestyle with zero post-session pain',
      targetValue: '1500m freestyle',
      targetDate: '2026-08-30',
      therapistNotes: 'Gradual volume progression once rotator cuff strength ratio is >= 0.8',
    }
  );
  assert(
    createResCustom.status === 201 &&
      createResCustom.data.type === 'long_term' &&
      createResCustom.data.targetValue === '1500m freestyle' &&
      createResCustom.data.targetDate === '2026-08-30' &&
      createResCustom.data.description === 'Continuous freestyle with zero post-session pain',
    'TC02: Valid goal creation with custom long_term type, targetValue, targetDate, and notes'
  );
  const goalCustomId = createResCustom.data.id;

  // TC03: Empty title rejection (400)
  const createResNoTitle = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: '   ', type: 'short_term' }
  );
  assert(
    createResNoTitle.status === 400 && createResNoTitle.data.error.includes('title'),
    'TC03: Goal creation with empty title is rejected with 400 Bad Request'
  );

  // TC04: Invalid status rejection (400)
  const createResBadStatus = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Valid Title', status: 'invalid_status_enum' }
  );
  assert(
    createResBadStatus.status === 400 && createResBadStatus.data.error.includes('status'),
    'TC04: Goal creation with invalid status is rejected with 400 Bad Request'
  );

  // TC05: Invalid type rejection (400)
  const createResBadType = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Valid Title', type: 'ultra_long_term' }
  );
  assert(
    createResBadType.status === 400 && createResBadType.data.error.includes('type'),
    'TC05: Goal creation with invalid type is rejected with 400 Bad Request'
  );

  // TC06: Disallowed client-controlled fields rejected (400)
  const createResInject = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Disallowed Injections',
      isArchived: true,
      achievedAt: '2025-01-01T00:00:00Z',
      version: 99,
      workspaceId: owner2.workspace.id,
      patientId: pat2.id,
    }
  );
  assert(
    createResInject.status === 400 && createResInject.data.error.includes('Disallowed client-supplied field'),
    'TC06: Disallowed client-controlled fields (isArchived, achievedAt, version, workspaceId) are rejected with 400'
  );

  // TC07: Listing goals returns 200 containing created goals
  const listRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listRes.status === 200 &&
      Array.isArray(listRes.data) &&
      listRes.data.some((g: any) => g.id === goal1Id) &&
      listRes.data.some((g: any) => g.id === goalCustomId),
    'TC07: Listing goals returns 200 containing created goals'
  );

  // TC08: Goal listing with type filter
  const listTypeRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals?type=long_term`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listTypeRes.status === 200 &&
      listTypeRes.data.length >= 1 &&
      listTypeRes.data.every((g: any) => g.type === 'long_term'),
    'TC08: Listing goals with type=long_term filters correctly'
  );

  // TC09: Goal listing with status filter
  const listStatusRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals?status=met`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listStatusRes.status === 200 && listStatusRes.data.length === 0,
    'TC09: Listing goals with status=met returns empty list when no goals are met'
  );

  // TC10: Individual goal retrieval by ID
  const getRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getRes.status === 200 &&
      getRes.data.id === goal1Id &&
      getRes.data.title === 'Achieve 160 degrees pain-free shoulder abduction',
    'TC10: Getting goal by ID returns 200 with full record payload'
  );

  // TC11: Non-existent goal retrieval returns 404
  const getResNotFound = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals/00000000-0000-0000-0000-000000000000`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getResNotFound.status === 404,
    'TC11: Getting non-existent goal ID returns 404 Not Found'
  );

  // TC12: Valid goal update with version auto-increment
  const updateRes1 = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      title: 'Achieve 170 degrees pain-free shoulder abduction (Updated)',
      therapistNotes: 'Increased target from 160 to 170 based on contralateral side',
    }
  );
  assert(
    updateRes1.status === 200 &&
      updateRes1.data.title === 'Achieve 170 degrees pain-free shoulder abduction (Updated)' &&
      updateRes1.data.version === 2,
    'TC12: Valid goal update returns 200 with version auto-incremented to 2 by DB trigger'
  );

  // TC13: Explicit clearing of optional fields (setting description: null, targetValue: null)
  const updateClearRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goalCustomId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      description: null,
      targetValue: null,
    }
  );
  assert(
    updateClearRes.status === 200 &&
      updateClearRes.data.description === undefined &&
      updateClearRes.data.targetValue === undefined &&
      updateClearRes.data.targetDate === '2026-08-30', // targetDate was omitted, preserved!
    'TC13: Explicitly clearing optional fields (null) updates database and maps to undefined'
  );

  // TC14: Omitted fields remain unchanged in database
  const getPreservedRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals/${goalCustomId}`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getPreservedRes.status === 200 &&
      getPreservedRes.data.targetDate === '2026-08-30' &&
      getPreservedRes.data.type === 'long_term',
    'TC14: Omitted fields in PATCH remain preserved in database'
  );

  // TC15: Missing version on update rejected (400)
  const updateNoVersion = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'No version supplied' }
  );
  assert(
    updateNoVersion.status === 400 && updateNoVersion.data.error.includes('version'),
    'TC15: Missing version in update payload is rejected with 400 Bad Request'
  );

  // TC16: Non-existent goal update returns 404
  const updateNotFound = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/00000000-0000-0000-0000-000000000000`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1, title: 'Non-existent' }
  );
  assert(
    updateNotFound.status === 404,
    'TC16: Updating non-existent goal returns 404 Not Found'
  );

  console.log('--- CATEGORY B: CLINICAL LINKAGE ---');

  // TC17: Single valid problem linkage
  const createLinkSingle = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Improve supraspinatus strength to Grade 5',
      type: 'short_term',
      linkedProblemIds: [prob1.id],
    }
  );
  assert(
    createLinkSingle.status === 201 &&
      createLinkSingle.data.linkedProblemIds.includes(prob1.id),
    'TC17: Linking single valid clinical problem returns 201'
  );
  const goalLinkedId = createLinkSingle.data.id;

  // TC18: Multiple valid problem linkages
  const createLinkMulti = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Full functional scapulohumeral rhythm during reach',
      type: 'long_term',
      linkedProblemIds: [prob1.id, prob2.id],
    }
  );
  assert(
    createLinkMulti.status === 201 &&
      createLinkMulti.data.linkedProblemIds.length === 2 &&
      createLinkMulti.data.linkedProblemIds.includes(prob1.id) &&
      createLinkMulti.data.linkedProblemIds.includes(prob2.id),
    'TC18: Linking multiple valid clinical problems returns 201'
  );
  const goalMultiLinkId = createLinkMulti.data.id;

  // TC19: Duplicate problem IDs in request are de-duplicated
  const createLinkDup = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'De-duplicate problem IDs',
      linkedProblemIds: [prob1.id, prob1.id, prob1.id],
    }
  );
  assert(
    createLinkDup.status === 201 &&
      createLinkDup.data.linkedProblemIds.length === 1 &&
      createLinkDup.data.linkedProblemIds[0] === prob1.id,
    'TC19: Duplicate linked problem IDs are de-duplicated upon submission'
  );

  // TC20: Non-existent problem rejection (400)
  const createBadProblem = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Fake Problem Linkage',
      linkedProblemIds: ['00000000-0000-0000-0000-000000000000'],
    }
  );
  assert(
    createBadProblem.status === 400 && createBadProblem.data.error.includes('Invalid linked problem ID'),
    'TC20: Linking non-existent problem ID is rejected with 400 Bad Request'
  );

  // TC21: Cross-case problem rejection (400)
  const caseOther = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Other Case in Workspace 1',
    startDate: new Date().toISOString().split('T')[0],
  });
  const probOtherCase = await problemService.createProblem(authCtxOwner1, caseOther.id, {
    title: 'Other Case Problem',
    status: 'active',
  });

  const createCrossCaseProb = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Cross Case Linkage Attempt',
      linkedProblemIds: [probOtherCase.id],
    }
  );
  assert(
    createCrossCaseProb.status === 400 && createCrossCaseProb.data.error.includes('Invalid linked problem ID'),
    'TC21: Linking problem from another case in same workspace is rejected with 400'
  );

  // TC22: Cross-workspace problem rejection (400)
  const createCrossWsProb = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Cross Workspace Linkage Attempt',
      linkedProblemIds: [probForeign.id],
    }
  );
  assert(
    createCrossWsProb.status === 400 && createCrossWsProb.data.error.includes('Invalid linked problem ID'),
    'TC22: Linking problem from another workspace is rejected with 400'
  );

  // TC23: Archived problem rejection for new linkage (400)
  const createArchivedProbLink = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Attempt link to archived problem',
      linkedProblemIds: [probToArchive.id],
    }
  );
  assert(
    createArchivedProbLink.status === 400 && createArchivedProbLink.data.error.includes('Cannot link archived clinical problem'),
    'TC23: Newly linking an archived problem is rejected with 400 Bad Request'
  );

  // TC24: Clearing existing problem linkages (PATCH linkedProblemIds: [])
  const updateClearLinks = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goalLinkedId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      linkedProblemIds: [],
    }
  );
  assert(
    updateClearLinks.status === 200 &&
      updateClearLinks.data.linkedProblemIds.length === 0 &&
      updateClearLinks.data.version === 2,
    'TC24: Updating goal to clear linkedProblemIds succeeds and increments version'
  );

  // TC25: Preserving existing historical links after a problem is archived
  // First link a problem that is active, then archive the problem, then verify the goal still has the link
  const probToBeArchivedLater = await problemService.createProblem(authCtxOwner1, case1.id, {
    title: 'Temporary Joint Stiffness Problem',
    status: 'active',
  });
  const goalWithHistoricalLink = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Normalize Glenohumeral Joint Play',
      linkedProblemIds: [probToBeArchivedLater.id],
    }
  );
  // Archive the problem
  await problemService.archiveProblem(authCtxOwner1, case1.id, probToBeArchivedLater.id, {
    reason: 'Transient symptom resolved without separate clinical treatment',
  });
  // Retrieve the goal
  const getHistoricalGoal = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals/${goalWithHistoricalLink.data.id}`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getHistoricalGoal.status === 200 &&
      getHistoricalGoal.data.linkedProblemIds.includes(probToBeArchivedLater.id),
    'TC25: Archiving a linked problem does NOT silently rewrite or drop the link on existing goals'
  );

  // TC26 & TC27: Preserving links after problem is resolved + No automatic goal status change
  const probToResolve = await problemService.createProblem(authCtxOwner1, case1.id, {
    title: 'Resting Pain at Night',
    status: 'active',
  });
  const goalForNightPain = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Sleep 7 hours continuously without waking from shoulder pain',
      linkedProblemIds: [probToResolve.id],
      status: 'active',
    }
  );
  // Resolve the problem
  await problemService.updateProblem(authCtxOwner1, case1.id, probToResolve.id, {
    version: 1,
    status: 'resolved',
  });
  // Re-fetch goal
  const getGoalAfterProbResolved = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals/${goalForNightPain.data.id}`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getGoalAfterProbResolved.status === 200 &&
      getGoalAfterProbResolved.data.linkedProblemIds.includes(probToResolve.id),
    'TC26: Resolving a linked problem preserves the problem link on the goal'
  );
  assert(
    getGoalAfterProbResolved.data.status === 'active' &&
      getGoalAfterProbResolved.data.achievedAt === undefined,
    'TC27: Resolving a problem does NOT automatically transition goal to met (clinician judgment preserved)'
  );

  console.log('--- CATEGORY C: CONCURRENCY ---');

  // TC28: Correct version update succeeds and increments version via DB trigger
  const updateV2toV3 = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      therapistNotes: 'Version 2 to 3 note',
    }
  );
  assert(
    updateV2toV3.status === 200 && updateV2toV3.data.version === 3,
    'TC28: Supplying expected version 2 updates record to version 3'
  );

  // TC29: Stale version update rejected with 409 Conflict
  const updateStale = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2, // Current is 3!
      title: 'Stale Version Write',
    }
  );
  assert(
    updateStale.status === 409 && updateStale.data.error.includes('Record version conflict'),
    'TC29: Updating with stale version (2 vs 3) is rejected with 409 Conflict'
  );

  // TC30: Two genuinely concurrent updates (Promise.all) result in exactly one 200 and one 409
  const [resA, resB] = await Promise.all([
    apiRequest(
      baseUrl,
      'PATCH',
      `/api/cases/${case1.id}/goals/${goal1Id}`,
      { Authorization: `Bearer ${owner1Token}` },
      { version: 3, title: 'Concurrent Race Winner A' }
    ),
    apiRequest(
      baseUrl,
      'PATCH',
      `/api/cases/${case1.id}/goals/${goal1Id}`,
      { Authorization: `Bearer ${owner1Token}` },
      { version: 3, title: 'Concurrent Race Loser B' }
    ),
  ]);
  const statuses = [resA.status, resB.status].sort();
  assert(
    statuses[0] === 200 && statuses[1] === 409,
    'TC30: Race condition between two concurrent version 3 updates results in exactly one 200 and one 409'
  );

  console.log('--- CATEGORY D: AUTHORIZATION & TENANCY ---');

  // TC31: Unauthenticated request returns 401 Unauthorized
  const unauthRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals`
  );
  assert(
    unauthRes.status === 401,
    'TC31: Unauthenticated request is rejected with 401 Unauthorized'
  );

  // TC32: Non-clinically authorized member cannot create goals (403 Forbidden)
  const nonClinicalCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${nonClinicalToken}` },
    { title: 'Non-Clinical Goal Creation Attempt' }
  );
  assert(
    nonClinicalCreate.status === 403 && nonClinicalCreate.data.error.includes('Clinical authorization capability required'),
    'TC32: Non-clinically authorized member cannot create clinical goals (403 Forbidden)'
  );

  // TC33: Non-clinically authorized member cannot update goals (403 Forbidden)
  const nonClinicalUpdate = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${nonClinicalToken}` },
    { version: 4, title: 'Non-Clinical Update Attempt' }
  );
  assert(
    nonClinicalUpdate.status === 403 && nonClinicalUpdate.data.error.includes('Clinical authorization capability required'),
    'TC33: Non-clinically authorized member cannot update clinical goals (403 Forbidden)'
  );

  // TC34: Non-clinically authorized member cannot archive goals (403 Forbidden)
  const nonClinicalArchive = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals/${goal1Id}/archive`,
    { Authorization: `Bearer ${nonClinicalToken}` },
    { reason: 'Non-clinical archive attempt' }
  );
  assert(
    nonClinicalArchive.status === 403 && nonClinicalArchive.data.error.includes('Clinical authorization capability required'),
    'TC34: Non-clinically authorized member cannot archive clinical goals (403 Forbidden)'
  );

  // TC35: Auditor can read goals (200 OK)
  const auditorList = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${auditorToken}` }
  );
  assert(
    auditorList.status === 200 && Array.isArray(auditorList.data),
    'TC35: Read-only auditor has read access to goal list (200 OK)'
  );

  // TC36: Auditor cannot create, update or archive goals (403 Forbidden)
  const auditorCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${auditorToken}` },
    { title: 'Auditor create goal attempt' }
  );
  assert(
    auditorCreate.status === 403 && auditorCreate.data.error.includes('Clinical authorization capability required'),
    'TC36: Read-only auditor cannot mutate clinical goals (403 Forbidden)'
  );

  // TC37: Cross-workspace goal retrieval returns 404 Not Found
  const crossWsGet = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals/${goal1Id}`,
    { Authorization: `Bearer ${owner2Token}` }
  );
  assert(
    crossWsGet.status === 404,
    'TC37: Cross-workspace goal retrieval returns 404 Not Found (Zero tenant leakage)'
  );

  // TC38: Cross-workspace goal creation targeting foreign case returns 404 Not Found
  const crossWsCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner2Token}` },
    { title: 'Cross workspace injection' }
  );
  assert(
    crossWsCreate.status === 404,
    'TC38: Cross-workspace goal creation targeting foreign case ID returns 404'
  );

  // TC39: Archived parent case rejects goal creation with 422
  const archivedCaseCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${caseArchived.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Goal on archived case' }
  );
  assert(
    archivedCaseCreate.status === 422 && archivedCaseCreate.data.error.includes('Case is archived and read-only'),
    'TC39: Creating a goal on an archived parent case is rejected with 422'
  );

  // TC40 & TC41: Archived parent case rejects update and archive
  // Setup case to be archived with goal
  const caseToArchiveWithGoal = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Case to archive with goal',
    startDate: new Date().toISOString().split('T')[0],
  });
  const goalOnCaseToArchive = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${caseToArchiveWithGoal.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Goal before case archive' }
  );
  await caseService.archiveCase(authCtxOwner1, caseToArchiveWithGoal.id, {
    reason: 'administrative_closure',
    notes: 'Case archived for goal immutability testing',
  });

  const updateOnArchivedCase = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${caseToArchiveWithGoal.id}/goals/${goalOnCaseToArchive.data.id}`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1, title: 'Attempt edit on archived case' }
  );
  assert(
    updateOnArchivedCase.status === 422 && updateOnArchivedCase.data.error.includes('Case is archived'),
    'TC40: Updating a goal on an archived parent case is rejected with 422'
  );

  const archiveOnArchivedCase = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${caseToArchiveWithGoal.id}/goals/${goalOnCaseToArchive.data.id}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Attempt archive under archived case' }
  );
  assert(
    archiveOnArchivedCase.status === 422 && archiveOnArchivedCase.data.error.includes('Case is archived'),
    'TC41: Archiving a goal on an archived parent case is rejected with 422'
  );

  console.log('--- CATEGORY E: CLINICAL LIFECYCLE & ARCHIVAL ---');

  // TC42: New active goal has achievedAt = undefined and isArchived = false
  const lifeGoal = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Tolerate 5kg suitcase lift without compensatory hitch',
      status: 'active',
    }
  );
  const lifeGoalId = lifeGoal.data.id;
  assert(
    lifeGoal.data.status === 'active' &&
      lifeGoal.data.achievedAt === undefined &&
      lifeGoal.data.isArchived === false,
    'TC42: New active goal has achievedAt undefined and isArchived false'
  );

  // TC43: Transition to 'met' automatically stamps server-generated achievedAt
  const metRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${lifeGoalId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      status: 'met',
      therapistNotes: 'Successfully performed 10 reps in clinic without hitch',
    }
  );
  const originalAchievedAt = metRes.data.achievedAt;
  assert(
    metRes.status === 200 &&
      metRes.data.status === 'met' &&
      typeof originalAchievedAt === 'string' &&
      originalAchievedAt.length > 0 &&
      metRes.data.isArchived === false,
    'TC43: Transition to met stamps achievedAt ISO string while keeping isArchived false'
  );

  // TC44: Unrelated update while remaining 'met' preserves existing achievedAt timestamp
  const editWhileMet = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${lifeGoalId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      therapistNotes: 'Maintenance advice: continue twice-weekly home resistance',
    }
  );
  assert(
    editWhileMet.status === 200 &&
      editWhileMet.data.status === 'met' &&
      editWhileMet.data.achievedAt === originalAchievedAt,
    'TC44: Unrelated edit while remaining met strictly preserves original achievedAt timestamp'
  );

  // TC45: Transition out of 'met' (back to 'active') clears achievedAt
  const reactivateGoal = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${lifeGoalId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 3,
      status: 'active',
      therapistNotes: 'Slight hitch re-appeared when testing with 7kg load',
    }
  );
  assert(
    reactivateGoal.status === 200 &&
      reactivateGoal.data.status === 'active' &&
      reactivateGoal.data.achievedAt === undefined,
    'TC45: Transition out of met back to active clears achievedAt to undefined'
  );

  // TC46: Goal resolution (met) and goal archival remain distinct
  const goalToArchiveLater = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Goal for resolution vs archival distinction test', status: 'active' }
  );
  const metDistinctRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goalToArchiveLater.data.id}`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1, status: 'met' }
  );
  assert(
    metDistinctRes.status === 200 &&
      metDistinctRes.data.status === 'met' &&
      metDistinctRes.data.isArchived === false,
    'TC46: Marking a goal as met does not archive it (isArchived remains false)'
  );

  // TC47: Archival requires non-empty reason
  const archiveEmptyReason = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals/${goalToArchiveLater.data.id}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: '   ' }
  );
  assert(
    archiveEmptyReason.status === 400 && archiveEmptyReason.data.error.includes('reason'),
    'TC47: Archiving a goal with empty reason is rejected with 400 Bad Request'
  );

  // TC48: Archival sets isArchived=true, archivedAt, archivedBy, and archiveReason
  const archiveSuccess = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals/${goalToArchiveLater.data.id}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Formulated in error - patient prioritized swimming rather than suitcase carry' }
  );
  assert(
    archiveSuccess.status === 200 &&
      archiveSuccess.data.isArchived === true &&
      archiveSuccess.data.archiveReason === 'Formulated in error - patient prioritized swimming rather than suitcase carry' &&
      archiveSuccess.data.archivedAt !== undefined &&
      archiveSuccess.data.archivedBy.name === 'Dr. Sarah Mitchell',
    'TC48: Archival populates isArchived=true, archivedAt, archivedBy audit actor, and archiveReason'
  );

  // TC49: Archived goals are excluded from default listing
  const listAfterArchive = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listAfterArchive.status === 200 &&
      !listAfterArchive.data.some((g: any) => g.id === goalToArchiveLater.data.id),
    'TC49: Archived goal is omitted from standard listGoals response'
  );

  // TC50: Archived goals appear with includeArchived=true
  const listIncludeArchived = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/goals?includeArchived=true`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listIncludeArchived.status === 200 &&
      listIncludeArchived.data.some((g: any) => g.id === goalToArchiveLater.data.id && g.isArchived === true),
    'TC50: Archived goal is returned when includeArchived=true is specified'
  );

  // TC51: Repeated archival returns 400 Bad Request
  const repeatArchive = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals/${goalToArchiveLater.data.id}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Second archival attempt' }
  );
  assert(
    repeatArchive.status === 400 && repeatArchive.data.error.includes('already archived'),
    'TC51: Repeated archival on an already archived goal is rejected with 400'
  );

  // TC52: Archived goals cannot be updated through ordinary PATCH (422)
  const patchArchived = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${goalToArchiveLater.data.id}`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 2, title: 'Attempt edit on archived goal' }
  );
  assert(
    patchArchived.status === 422 && patchArchived.data.error.includes('Cannot modify archived goal'),
    'TC52: Attempting to update an archived goal via PATCH is rejected with 422 Unprocessable Entity'
  );

  console.log('--- CATEGORY F: AUDIT & INTEGRITY ---');

  // Query audit_events directly for goalToArchiveLater.data.id
  const auditEventsRes = await db.query<{
    action: string;
    entity_type: string;
    entity_id: string;
    changed_fields: any;
    reason: string | null;
  }>(
    `SELECT action, entity_type, entity_id, changed_fields, reason
     FROM audit_events
     WHERE entity_id = $1 AND workspace_id = $2
     ORDER BY sequence ASC`,
    [goalToArchiveLater.data.id, owner1.workspace.id]
  );

  // TC53: CREATE audit event
  const createEvent = auditEventsRes.rows.find((e) => e.action === 'CREATE');
  assert(
    !!createEvent &&
      createEvent.entity_type === 'clinical_goal' &&
      createEvent.entity_id === goalToArchiveLater.data.id,
    'TC53: Audit event for CREATE is recorded with entity_type clinical_goal and correct entity ID'
  );

  // TC54: UPDATE audit event with changed_fields
  const updateEvent = auditEventsRes.rows.find((e) => e.action === 'UPDATE');
  assert(
    !!updateEvent &&
      updateEvent.entity_type === 'clinical_goal' &&
      Array.isArray(typeof updateEvent.changed_fields === 'string' ? JSON.parse(updateEvent.changed_fields) : updateEvent.changed_fields),
    'TC54: Audit event for UPDATE is recorded with changed_fields array'
  );

  // TC55: SOFT_DELETE audit event with reason
  const deleteEvent = auditEventsRes.rows.find((e) => e.action === 'SOFT_DELETE');
  assert(
    !!deleteEvent &&
      deleteEvent.entity_type === 'clinical_goal' &&
      deleteEvent.reason === 'Formulated in error - patient prioritized swimming rather than suitcase carry',
    'TC55: Audit event for SOFT_DELETE is recorded with mandatory archive reason'
  );

  // TC56: Monotonic audit sequence allocation
  const seqRes = await db.query<{ sequence: string | number }>(
    `SELECT sequence FROM audit_events WHERE workspace_id = $1 ORDER BY sequence ASC`,
    [owner1.workspace.id]
  );
  let isStrictlyIncreasing = true;
  for (let i = 1; i < seqRes.rows.length; i++) {
    if (BigInt(seqRes.rows[i].sequence) <= BigInt(seqRes.rows[i - 1].sequence)) {
      isStrictlyIncreasing = false;
      break;
    }
  }
  assert(
    isStrictlyIncreasing && seqRes.rows.length > 5,
    'TC56: Workspace audit sequence numbers are strictly monotonic and sequentially allocated'
  );

  // --------------------------------------------------------------------------
  // INJECTED AUDIT FAILURE ROLLBACK TESTS (TC57, TC58, TC59)
  // --------------------------------------------------------------------------
  console.log('--- INJECTED AUDIT FAILURE ROLLBACK TESTS ---');

  // Temporarily break audit sequence allocation function to simulate audit infrastructure failure
  await db.query(`ALTER FUNCTION allocate_next_audit_sequence(uuid) RENAME TO allocate_next_audit_sequence_temp`);

  // TC57: Injected audit failure rolls back goal creation
  const failCreateRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Rollback Goal Creation Attempt', type: 'short_term' }
  );
  assert(
    failCreateRes.status === 500,
    'TC57a: Goal creation returns 500 when audit sequence allocation fails'
  );
  const rollbackCreateCheck = await db.query<{ count: string }>(
    `SELECT count(*) FROM clinical_goals WHERE title = 'Rollback Goal Creation Attempt'`
  );
  assert(
    parseInt(rollbackCreateCheck.rows[0].count, 10) === 0,
    'TC57b: Injected audit failure rolls back goal creation (zero rows persisted)'
  );

  // TC58: Injected audit failure rolls back goal update
  const failUpdateRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/goals/${lifeGoalId}`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 4, title: 'Corrupted Uncommitted Update' }
  );
  assert(
    failUpdateRes.status === 500,
    'TC58a: Goal update returns 500 when audit sequence allocation fails'
  );
  const rollbackUpdateCheck = await db.query<{ title: string; version: number }>(
    `SELECT title, version FROM clinical_goals WHERE id = $1`,
    [lifeGoalId]
  );
  assert(
    rollbackUpdateCheck.rows[0].title !== 'Corrupted Uncommitted Update' &&
      rollbackUpdateCheck.rows[0].version === 4,
    'TC58b: Injected audit failure rolls back goal update (title and version remain unchanged)'
  );

  // TC59: Injected audit failure rolls back goal archival
  const failArchiveRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/goals/${lifeGoalId}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Rollback archive attempt' }
  );
  assert(
    failArchiveRes.status === 500,
    'TC59a: Goal archival returns 500 when audit sequence allocation fails'
  );
  const rollbackArchiveCheck = await db.query<{ is_archived: boolean }>(
    `SELECT is_archived FROM clinical_goals WHERE id = $1`,
    [lifeGoalId]
  );
  assert(
    rollbackArchiveCheck.rows[0].is_archived === false,
    'TC59b: Injected audit failure rolls back goal archival (is_archived remains false)'
  );

  // Restore audit sequence function
  await db.query(`ALTER FUNCTION allocate_next_audit_sequence_temp(uuid) RENAME TO allocate_next_audit_sequence`);

  // Clean shutdown
  server.close();

  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error in B-6 verification suite:', err);
  process.exit(1);
});
