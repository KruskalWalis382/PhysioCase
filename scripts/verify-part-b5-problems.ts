/**
 * ============================================================================
 * PHYSIOCASE — PART B-5: CLINICAL PROBLEM SERVICE & API VERIFICATION SUITE
 * Complete Verification for Clinical Problems, Validation, Concurrency, Linkages,
 * Multi-Tenancy, Authorization, Lifecycle, and Audit Integrity.
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
  console.log('=== PHYSIOCASE — PART B-5 CLINICAL PROBLEM VERIFICATION SUITE ===\n');

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
  const objectiveService = new ObjectiveAssessmentService(db);
  const investigationService = new InvestigationService(db);

  // 1. Setup Workspace 1 with Clinically Authorized Owner
  const owner1 = await authService.registerOwner({
    email: 'clinician.lead@spinecenter.com',
    password: 'Password123!',
    name: 'Dr. Sarah Mitchell',
    title: 'Senior Clinical Specialist',
    clinicName: 'Spine & Joint Center',
    registrationNumber: 'PHY-8890',
    initials: 'SM',
    workspaceName: 'Spine Center Primary',
    workspaceSlug: 'spine-center-primary',
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
    email: 'admin.manager@spinecenter.com',
    name: 'Michael Clark',
    role: 'clinical_practitioner',
    clinicalAuthorized: false,
    title: 'Clinic Manager',
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
    email: 'owner@foreignclinic.com',
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
    fullName: 'David Robinson',
    dateOfBirth: '1979-08-22',
    gender: 'male',
    reasonForVisit: 'Persistent lumbar radiculopathy',
  } as any);

  const case1 = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Lumbar Spine Radiculopathy',
    presentingProblem: 'L5 nerve root irritation with dermatomal radiating pain',
    startDate: new Date().toISOString().split('T')[0],
  });

  // 6. Create Objective Assessment with Finding in Case 1
  const findingId1 = 'finding-slr-001';
  await objectiveService.saveObjectiveAssessment(authCtxOwner1, case1.id, {
    selectedAreas: ['lumbar_spine', 'lower_extremity'],
    findings: [
      {
        id: findingId1,
        examinationArea: 'lumbar_spine',
        finding: 'Straight Leg Raise positive at 40 degrees reproduction of radicular pain',
      },
    ],
    therapistNotes: 'Marked neural tension',
  });

  // 7. Create Clinical Investigation in Case 1
  const inv1 = await investigationService.createInvestigation(authCtxOwner1, case1.id, {
    modality: 'mri',
    name: 'Lumbar Spine MRI',
    bodyRegion: 'lumbar_spine',
    investigationDate: '2026-05-10',
    findings: 'L4-L5 disc protrusion abutting exiting L5 nerve root',
  });

  // 8. Create Patient & Case in Workspace 2
  const pat2 = await patientService.createPatient(authCtxOwner2, {
    fullName: 'Foreign Patient',
    dateOfBirth: '1990-01-01',
    gender: 'female',
    reasonForVisit: 'Ankle sprain',
  } as any);

  const case2 = await caseService.createCase(authCtxOwner2, {
    patientId: pat2.id,
    caseName: 'Foreign Case',
    startDate: new Date().toISOString().split('T')[0],
  });

  // 9. Create an Archived Case in Workspace 1
  const case3 = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Archived Case for Governance Tests',
    startDate: new Date().toISOString().split('T')[0],
  });
  await caseService.archiveCase(authCtxOwner1, case3.id, {
    reason: 'test_or_demo',
    notes: 'Case closed for archival testing',
  });

  console.log('--- CATEGORY 1: CRUD & INPUT VALIDATION ---');

  // TC01: Valid problem creation with defaults
  const createRes1 = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'L5 Radicular Pain and Neural Sensitivity',
      description: 'Dermatomal distribution into lateral calf and dorsum of foot',
      status: 'active',
      therapistNotes: 'Prioritize neurodynamic desensitization before high load',
    }
  );
  assert(
    createRes1.status === 201 &&
      createRes1.data.id &&
      createRes1.data.caseId === case1.id &&
      createRes1.data.patientId === pat1.id &&
      createRes1.data.title === 'L5 Radicular Pain and Neural Sensitivity' &&
      createRes1.data.status === 'active' &&
      createRes1.data.version === 1 &&
      createRes1.data.isArchived === false,
    'TC01: Valid problem creation returns 201 with version 1 and matching case/patient associations'
  );
  const problem1Id = createRes1.data.id;

  // TC02: Problem creation rejected when title is missing or empty
  const createResNoTitle = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: '   ',
      status: 'active',
    }
  );
  assert(
    createResNoTitle.status === 400 && createResNoTitle.data.error.includes('title'),
    'TC02: Problem creation with empty title is rejected with 400 Bad Request'
  );

  // TC03: Problem creation rejected when status is invalid
  const createResBadStatus = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Valid Title',
      status: 'invalid_status_enum',
    }
  );
  assert(
    createResBadStatus.status === 400 && createResBadStatus.data.error.includes('status'),
    'TC03: Problem creation with invalid status is rejected with 400 Bad Request'
  );

  // TC04: Problem creation rejected when disallowed client override fields are passed
  const createResInject = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Injection Attempt',
      status: 'active',
      isArchived: true,
      resolvedAt: '2020-01-01T00:00:00Z',
      version: 99,
      workspaceId: owner2.workspace.id,
    }
  );
  assert(
    createResInject.status === 400 && createResInject.data.error.includes('Disallowed client-supplied field'),
    'TC04: Disallowed client-controlled fields (isArchived, version, resolvedAt, workspaceId) are strictly rejected with 400'
  );

  // TC05: List problems returns 200 and matches created problem
  const listRes1 = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listRes1.status === 200 &&
      Array.isArray(listRes1.data) &&
      listRes1.data.some((p: any) => p.id === problem1Id),
    'TC05: Listing problems returns 200 containing created problem'
  );

  // TC06: List problems with status filter
  const listFilterRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems?status=resolved`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listFilterRes.status === 200 &&
      listFilterRes.data.length === 0,
    'TC06: Listing problems with status=resolved returns 200 and excludes active problems'
  );

  // TC07: Get single problem by ID
  const getRes1 = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems/${problem1Id}`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getRes1.status === 200 &&
      getRes1.data.id === problem1Id &&
      getRes1.data.title === 'L5 Radicular Pain and Neural Sensitivity',
    'TC07: Getting problem by ID returns 200 with full record payload'
  );

  // TC08: Get problem with non-existent ID returns 404
  const getResNotFound = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems/00000000-0000-0000-0000-000000000000`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    getResNotFound.status === 404,
    'TC08: Getting non-existent problem ID returns 404 Not Found'
  );

  // TC09: Valid problem update
  const updateRes1 = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${problem1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      title: 'L5 Radiculopathy - Modified Title',
      therapistNotes: 'Updated neurodynamic plan',
    }
  );
  assert(
    updateRes1.status === 200 &&
      updateRes1.data.title === 'L5 Radiculopathy - Modified Title' &&
      updateRes1.data.version === 2,
    'TC09: Valid problem update succeeds with version auto-incremented to 2 by DB trigger'
  );

  // TC10: Update rejected when client attempts to inject disallowed fields
  const updateResInject = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${problem1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      patientId: '00000000-0000-0000-0000-000000000000',
    }
  );
  assert(
    updateResInject.status === 400 && updateResInject.data.error.includes('Disallowed client-supplied field'),
    'TC10: Updating client-controlled disallowed fields is rejected with 400'
  );

  // TC11: Update non-existent problem returns 404
  const updateResNotFound = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/00000000-0000-0000-0000-000000000000`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      title: 'Does not exist',
    }
  );
  assert(
    updateResNotFound.status === 404,
    'TC11: Updating non-existent problem returns 404 Not Found'
  );

  console.log('--- CATEGORY 2: CLINICAL LINKAGES & VALIDATION ---');

  // TC12: Valid objective finding linkage
  const createWithFinding = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Neural Tension with Positive SLR',
      linkedFindingIds: [findingId1],
      status: 'active',
    }
  );
  assert(
    createWithFinding.status === 201 &&
      createWithFinding.data.linkedFindingIds.includes(findingId1),
    'TC12: Linking valid objective examination finding returns 201'
  );
  const problemWithLinksId = createWithFinding.data.id;

  // TC13: Valid clinical investigation linkage
  const createWithInv = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'MRI-Evidenced L4-L5 Disc Protrusion',
      linkedInvestigationIds: [inv1.id],
      status: 'active',
    }
  );
  assert(
    createWithInv.status === 201 &&
      createWithInv.data.linkedInvestigationIds.includes(inv1.id),
    'TC13: Linking valid clinical investigation returns 201'
  );

  // TC14: Linking non-existent finding ID rejected with 400
  const createBadFinding = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Invalid Finding Test',
      linkedFindingIds: ['non-existent-finding-id'],
    }
  );
  assert(
    createBadFinding.status === 400 && createBadFinding.data.error.includes('Invalid linked finding ID'),
    'TC14: Linking non-existent objective finding is rejected with 400 Bad Request'
  );

  // TC15: Linking finding from another case rejected with 400
  // Setup another case with its own finding
  const caseOther = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Cervical Spine Pain',
    startDate: new Date().toISOString().split('T')[0],
  });
  const otherFindingId = 'finding-spurling-002';
  await objectiveService.saveObjectiveAssessment(authCtxOwner1, caseOther.id, {
    findings: [{ id: otherFindingId, examinationArea: 'cervical_spine', finding: 'Positive Spurlings test' }],
  });

  const createCrossCaseFinding = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Cross Case Finding Linkage Test',
      linkedFindingIds: [otherFindingId],
    }
  );
  assert(
    createCrossCaseFinding.status === 400 && createCrossCaseFinding.data.error.includes('Invalid linked finding ID'),
    'TC15: Linking finding from a different case is rejected with 400 Bad Request'
  );

  // TC16: Linking investigation from another case/workspace rejected with 400
  const invForeign = await investigationService.createInvestigation(authCtxOwner2, case2.id, {
    modality: 'xray',
    name: 'Foreign Ankle X-Ray',
    bodyRegion: 'ankle',
    investigationDate: '2026-05-12',
  });

  const createCrossCaseInv = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Cross Case Inv Linkage Test',
      linkedInvestigationIds: [invForeign.id],
    }
  );
  assert(
    createCrossCaseInv.status === 400 && createCrossCaseInv.data.error.includes('Invalid linked investigation ID'),
    'TC16: Linking investigation from foreign workspace/case is rejected with 400 Bad Request'
  );

  // TC17: Updating problem to clear linked findings/investigations
  const updateClearLinks = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${problemWithLinksId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      linkedFindingIds: [],
    }
  );
  assert(
    updateClearLinks.status === 200 &&
      updateClearLinks.data.linkedFindingIds.length === 0 &&
      updateClearLinks.data.version === 2,
    'TC17: Updating problem to clear linked finding IDs succeeds and increments version'
  );

  // TC18: Updating problem with invalid finding ID rejected with 400
  const updateBadFinding = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${problemWithLinksId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      linkedFindingIds: ['fake-finding-999'],
    }
  );
  assert(
    updateBadFinding.status === 400 && updateBadFinding.data.error.includes('Invalid linked finding ID'),
    'TC18: Updating problem with invalid finding ID is rejected with 400'
  );

  console.log('--- CATEGORY 3: CONCURRENCY CONTROL ---');

  // TC19: Valid version update increments version
  const updateV2toV3 = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${problem1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      therapistNotes: 'Version 2 to 3 transition note',
    }
  );
  assert(
    updateV2toV3.status === 200 && updateV2toV3.data.version === 3,
    'TC19: Supplying expected version 2 updates record to version 3'
  );

  // TC20: Stale version update rejected with 409 Conflict
  const updateStale = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${problem1Id}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2, // Current is 3!
      title: 'Stale Version Write',
    }
  );
  assert(
    updateStale.status === 409 && updateStale.data.error.includes('Record version conflict'),
    'TC20: Updating with stale version (2 vs 3) is rejected with 409 Conflict'
  );

  // TC21: Concurrent updates safely handled (first succeeds, second gets 409)
  const [resA, resB] = await Promise.all([
    apiRequest(
      baseUrl,
      'PATCH',
      `/api/cases/${case1.id}/problems/${problem1Id}`,
      { Authorization: `Bearer ${owner1Token}` },
      { version: 3, title: 'Concurrent Winner A' }
    ),
    apiRequest(
      baseUrl,
      'PATCH',
      `/api/cases/${case1.id}/problems/${problem1Id}`,
      { Authorization: `Bearer ${owner1Token}` },
      { version: 3, title: 'Concurrent Loser B' }
    ),
  ]);
  const statuses = [resA.status, resB.status].sort();
  assert(
    statuses[0] === 200 && statuses[1] === 409,
    'TC21: Race condition between two concurrent version 3 updates results in exactly one 200 and one 409'
  );

  console.log('--- CATEGORY 4: AUTHORIZATION & MULTI-TENANT ISOLATION ---');

  // TC22: Unauthenticated request rejected with 401
  const unauthRes = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems`
  );
  assert(
    unauthRes.status === 401,
    'TC22: Unauthenticated request is rejected with 401 Unauthorized'
  );

  // TC23: Non-clinically authorized user attempting to create problem rejected with 403
  const nonClinicalCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${nonClinicalToken}` },
    {
      title: 'Non-Clinical Problem Formulation Attempt',
      status: 'active',
    }
  );
  assert(
    nonClinicalCreate.status === 403 && nonClinicalCreate.data.error.includes('Clinical authorization capability required'),
    'TC23: Non-clinically authorized member cannot create clinical problems (403 Forbidden)'
  );

  // TC24: Read-only auditor attempting to create problem rejected with 403
  const auditorCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${auditorToken}` },
    {
      title: 'Auditor Create Attempt',
      status: 'active',
    }
  );
  assert(
    auditorCreate.status === 403 && auditorCreate.data.error.includes('Clinical authorization capability required'),
    'TC24: Read-only auditor cannot create clinical problems (403 Forbidden)'
  );

  // TC25: Read-only auditor CAN list and get problems (200)
  const auditorList = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${auditorToken}` }
  );
  assert(
    auditorList.status === 200 && Array.isArray(auditorList.data),
    'TC25: Read-only auditor has read access to problem list (200 OK)'
  );

  // TC26: Cross-workspace access: Workspace 2 practitioner attempting to access Workspace 1 case/problem gets 404
  const crossWsGet = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems/${problem1Id}`,
    { Authorization: `Bearer ${owner2Token}` }
  );
  assert(
    crossWsGet.status === 404,
    'TC26: Cross-workspace problem retrieval is rejected with 404 Not Found (Zero tenant leakage)'
  );

  const crossWsCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner2Token}` },
    {
      title: 'Foreign Workspace Injection',
    }
  );
  assert(
    crossWsCreate.status === 404,
    'TC26b: Cross-workspace problem creation targeting foreign case ID returns 404'
  );

  // TC27: Archived case rejects problem creation with 422
  const archivedCaseCreate = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case3.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Problem on Archived Case',
    }
  );
  assert(
    archivedCaseCreate.status === 422 && archivedCaseCreate.data.error.includes('Case is archived and read-only'),
    'TC27: Creating a problem on an archived case is rejected with 422 Unprocessable Entity'
  );

  // TC28 & TC29: Archived case rejects updates / archival
  // First insert a problem into an active case, then archive the case, then attempt mutation
  const caseToArchive = await caseService.createCase(authCtxOwner1, {
    patientId: pat1.id,
    caseName: 'Case to be archived with problems',
    startDate: new Date().toISOString().split('T')[0],
  });
  const probOnCaseToArchive = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${caseToArchive.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Pre-existing problem before case archival' }
  );
  await caseService.archiveCase(authCtxOwner1, caseToArchive.id, {
    reason: 'administrative_closure',
    notes: 'Archived for testing problem immutability',
  });

  const updateOnArchivedCase = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${caseToArchive.id}/problems/${probOnCaseToArchive.data.id}`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1, title: 'Attempted edit on archived case' }
  );
  assert(
    updateOnArchivedCase.status === 422 && updateOnArchivedCase.data.error.includes('Case is archived'),
    'TC28: Updating a problem on an archived parent case is rejected with 422'
  );

  const archiveProblemOnArchivedCase = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${caseToArchive.id}/problems/${probOnCaseToArchive.data.id}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Attempt archive under archived case' }
  );
  assert(
    archiveProblemOnArchivedCase.status === 422 && archiveProblemOnArchivedCase.data.error.includes('Case is archived'),
    'TC29: Archiving a problem on an archived parent case is rejected with 422'
  );

  console.log('--- CATEGORY 5: CLINICAL LIFECYCLE & STATE TRANSITIONS ---');

  // Create a clean problem for lifecycle testing
  const lifeProbRes = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      title: 'Hamstring Flexibility Deficit',
      status: 'active',
    }
  );
  const lifeProbId = lifeProbRes.data.id;

  // TC30: Initial status 'active' has resolvedAt = undefined / null
  assert(
    lifeProbRes.data.status === 'active' &&
      lifeProbRes.data.resolvedAt === undefined &&
      lifeProbRes.data.isArchived === false,
    'TC30: Newly created problem has status active, resolvedAt undefined, isArchived false'
  );

  // TC31: Transitioning status to 'resolved' sets server-stamped resolvedAt
  const resolveRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${lifeProbId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 1,
      status: 'resolved',
      therapistNotes: 'Functional flexibility restored to 85 degrees',
    }
  );
  const resolvedTimestamp = resolveRes.data.resolvedAt;
  assert(
    resolveRes.status === 200 &&
      resolveRes.data.status === 'resolved' &&
      typeof resolvedTimestamp === 'string' &&
      resolvedTimestamp.length > 0 &&
      resolveRes.data.isArchived === false,
    'TC31: Transition to resolved stamps resolvedAt ISO string while keeping isArchived false'
  );

  // TC32: Unrelated edit while remaining 'resolved' preserves existing resolvedAt timestamp
  const editWhileResolved = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${lifeProbId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 2,
      therapistNotes: 'Added maintenance discharge recommendation',
    }
  );
  assert(
    editWhileResolved.status === 200 &&
      editWhileResolved.data.status === 'resolved' &&
      editWhileResolved.data.resolvedAt === resolvedTimestamp,
    'TC32: Unrelated update while remaining resolved strictly preserves existing resolvedAt timestamp'
  );

  // TC33: Transitioning status from 'resolved' back to 'active' clears resolvedAt
  const reactivateRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${lifeProbId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 3,
      status: 'active',
      therapistNotes: 'Recurrence after intense training session',
    }
  );
  assert(
    reactivateRes.status === 200 &&
      reactivateRes.data.status === 'active' &&
      reactivateRes.data.resolvedAt === undefined,
    'TC33: Transition from resolved back to active clears resolvedAt to undefined'
  );

  // TC34: Archival requires non-empty reason
  const archiveEmptyReason = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems/${lifeProbId}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: '   ' }
  );
  assert(
    archiveEmptyReason.status === 400 && archiveEmptyReason.data.error.includes('reason'),
    'TC34: Archiving a problem with empty reason is rejected with 400 Bad Request'
  );

  // TC35: Archival sets is_archived=true, archived_at, archived_by, and archive_reason
  const archiveSuccess = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems/${lifeProbId}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Formulated in error - symptom belonged to lumbar radiculopathy' }
  );
  assert(
    archiveSuccess.status === 200 &&
      archiveSuccess.data.isArchived === true &&
      archiveSuccess.data.archiveReason === 'Formulated in error - symptom belonged to lumbar radiculopathy' &&
      archiveSuccess.data.archivedAt !== undefined &&
      archiveSuccess.data.archivedBy.name === 'Dr. Sarah Mitchell',
    'TC35: Problem archival sets isArchived=true, archivedAt, archivedBy audit actor, and archiveReason'
  );

  // TC36: Archived problem is excluded from default problem listing
  const listAfterArchive = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listAfterArchive.status === 200 &&
      !listAfterArchive.data.some((p: any) => p.id === lifeProbId),
    'TC36: Archived problem is omitted from standard listProblems response'
  );

  // TC37: Archived problem is included when includeArchived=true
  const listIncludeArchived = await apiRequest(
    baseUrl,
    'GET',
    `/api/cases/${case1.id}/problems?includeArchived=true`,
    { Authorization: `Bearer ${owner1Token}` }
  );
  assert(
    listIncludeArchived.status === 200 &&
      listIncludeArchived.data.some((p: any) => p.id === lifeProbId && p.isArchived === true),
    'TC37: Archived problem is returned when includeArchived=true is specified'
  );

  // TC38: Repeated archival attempt on already archived problem rejected with 400
  const repeatArchive = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems/${lifeProbId}/archive`,
    { Authorization: `Bearer ${owner1Token}` },
    { reason: 'Second attempt to archive' }
  );
  assert(
    repeatArchive.status === 400 && repeatArchive.data.error.includes('already archived'),
    'TC38: Repeated archival on an already archived problem is rejected with 400'
  );

  // TC39: Modifying an archived problem via PATCH rejected with 422
  const patchArchived = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${lifeProbId}`,
    { Authorization: `Bearer ${owner1Token}` },
    {
      version: 4,
      title: 'Attempted edit on archived problem',
    }
  );
  assert(
    patchArchived.status === 422 && patchArchived.data.error.includes('Cannot modify archived problem'),
    'TC39: Attempting to modify an archived problem via PATCH is rejected with 422 Unprocessable Entity'
  );

  // TC40: Resolving a problem does NOT archive it
  const probToResolve = await apiRequest(
    baseUrl,
    'POST',
    `/api/cases/${case1.id}/problems`,
    { Authorization: `Bearer ${owner1Token}` },
    { title: 'Temporary Joint Stiffness', status: 'active' }
  );
  const resolvedProbRes = await apiRequest(
    baseUrl,
    'PATCH',
    `/api/cases/${case1.id}/problems/${probToResolve.data.id}`,
    { Authorization: `Bearer ${owner1Token}` },
    { version: 1, status: 'resolved' }
  );
  assert(
    resolvedProbRes.status === 200 &&
      resolvedProbRes.data.status === 'resolved' &&
      resolvedProbRes.data.isArchived === false,
    'TC40: Status transition to resolved keeps isArchived false; resolution is distinct from archival'
  );

  console.log('--- CATEGORY 6: AUDIT TRAIL & TRANSACTIONAL INTEGRITY ---');

  // Query audit_events directly for lifeProbId
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
    [lifeProbId, owner1.workspace.id]
  );

  // TC41: Problem creation recorded in audit log
  const createEvent = auditEventsRes.rows.find((e) => e.action === 'CREATE');
  assert(
    !!createEvent &&
      createEvent.entity_type === 'clinical_problem' &&
      createEvent.entity_id === lifeProbId,
    'TC41: Audit event for CREATE is recorded with entity_type clinical_problem and correct entity ID'
  );

  // TC42: Problem update recorded in audit log with changedFields
  const updateEvents = auditEventsRes.rows.filter((e) => e.action === 'UPDATE');
  assert(
    updateEvents.length >= 2 &&
      updateEvents.some((e) => {
        const fields = typeof e.changed_fields === 'string' ? JSON.parse(e.changed_fields) : e.changed_fields;
        return Array.isArray(fields) && fields.includes('status');
      }),
    'TC42: Audit events for UPDATE are recorded with changed_fields tracking status and notes modifications'
  );

  // TC43: Problem archival recorded in audit log with action SOFT_DELETE
  const deleteEvent = auditEventsRes.rows.find((e) => e.action === 'SOFT_DELETE');
  assert(
    !!deleteEvent &&
      deleteEvent.entity_type === 'clinical_problem' &&
      deleteEvent.reason === 'Formulated in error - symptom belonged to lumbar radiculopathy',
    'TC43: Audit event for SOFT_DELETE is recorded with mandatory archive reason'
  );

  // TC44: Direct check that audit sequence is strictly increasing and tenant-isolated
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
    'TC44: Workspace audit sequence numbers are strictly monotonic and sequentially allocated'
  );

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
  console.error('Fatal test error:', err);
  process.exit(1);
});
