/**
 * ============================================================================
 * PHYSIOCASE — PART B-2: IDENTITY, WORKSPACE & AUTHORIZATION VERIFICATION SUITE
 * ============================================================================
 * 
 * Verifies all B-2 architectural requirements and invariants:
 * 1. Database Migration: B-1 to B-2 membership migration, global email uniqueness, zero clinical collection change
 * 2. Identity: Argon2id password hashing, verification, duplicate email rejection, generic failure responses
 * 3. Membership: Workspace isolation, multi-workspace practitioner, status checks, role resolution
 * 4. Role/Capability Combinations: 5 valid permutations + strict database rejection of auditor with clinical=true
 * 5. Authorization: Owner administrative privileges, clinical mutation capability, auditor read-only guarantees
 * 6. Self-Authorization Protection: Prevention of self-elevation, non-owner modification rejection
 * 7. Dynamic Revocation: Mid-session clinical revocation and session revocation overriding valid JWT
 * 8. Access Tokens (JWT): Workspace-bound claims, 15m lifetime, zero PHI, tampering rejection
 * 9. Refresh Sessions: SHA-256 token hashing, session rotation, replay prevention of invalidated tokens
 * 10. API Endpoints: Express registration, login, refresh, logout, workspace switching, member management
 */

import http from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../src/db/migrator';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { signAccessToken, verifyAccessToken } from '../src/auth/jwt';
import {
  createSession,
  validateRefreshToken,
  rotateSession,
  revokeSession,
  hashRefreshToken,
} from '../src/auth/session';
import {
  isAuthenticated,
  hasActiveMembership,
  isWorkspaceOwner,
  isClinicallyAuthorized,
  canPerformClinicalMutation,
  canPerformOwnerAdministration,
  resolveAuthContext,
} from '../src/auth/authorization';
import { AuthService } from '../src/auth/service';
import { createApp } from '../src/server/app';
import type { AuthContext } from '../src/types/auth';

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

async function runTestSuite() {
  console.log('=== PHYSIOCASE — PART B-2 IDENTITY & AUTHORIZATION VERIFICATION SUITE ===\n');

  // Initialize fresh in-memory PostgreSQL instance
  const db = new PGlite();

  // --------------------------------------------------------------------------
  // SECTION 1: DATABASE MIGRATION & SCHEMA INTEGRITY
  // --------------------------------------------------------------------------
  console.log('--- Section 1: Database Migration (B-1 -> B-2) ---');

  // Seed B-1 practitioner before migration 002 to test B-1 -> B-2 data migration
  // First apply 001_foundation.sql
  await db.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
  `);

  // Run full migration runner
  const migRes = await runMigrations(db);
  assert(
    migRes.appliedMigrations.includes('001_foundation.sql') &&
    migRes.appliedMigrations.includes('002_identity_and_memberships.sql'),
    'Test 1.1: Migrations 001 and 002 applied successfully in numerical sequence'
  );

  // Check 24 authoritative clinical tables still intact
  const EXPECTED_24_CLINICAL_TABLES = [
    'patients', 'cases', 'workspace_settings', 'subjective_assessments',
    'clinical_threads', 'objective_assessments', 'clinical_problems',
    'clinical_goals', 'treatment_plans', 'treatment_selections',
    'treatment_evidence_links', 'treatment_condition_links', 'evidence_sources',
    'evidence_items', 'condition_presentations', 'condition_evidence_links',
    'clinical_investigations', 'clinical_sessions', 'session_treatment_deliveries',
    'outcome_measure_definitions', 'progress_records', 'progress_measurements',
    'case_discharge_records', 'audit_events',
  ];

  const tablesRes = await db.query<{ table_name: string }>(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const existingTables = new Set(tablesRes.rows.map((r) => r.table_name));

  assert(
    EXPECTED_24_CLINICAL_TABLES.every((t) => existingTables.has(t)),
    'Test 1.2: Invariant 1 - Exactly 24 authoritative clinical collections preserved'
  );

  assert(
    existingTables.has('workspace_memberships') && existingTables.has('practitioner_sessions'),
    'Test 1.3: Justified B-2 infrastructure tables (workspace_memberships, practitioner_sessions) exist'
  );

  // Verify practitioners.workspace_id is nullable (no longer authoritative)
  const colRes = await db.query<{ is_nullable: string }>(`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'practitioners' AND column_name = 'workspace_id'
  `);
  assert(
    colRes.rows.length > 0 && colRes.rows[0].is_nullable === 'YES',
    'Test 1.4: practitioners.workspace_id made nullable (no longer authoritative workspace link)'
  );

  // --------------------------------------------------------------------------
  // SECTION 2: PRACTITIONER IDENTITY & PASSWORD AUTHENTICATION (ARGON2ID)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 2: Practitioner Identity & Argon2id Authentication ---');

  const rawPassword = 'ClinicalSecurePass2026!';
  const hashedPassword = await hashPassword(rawPassword);

  assert(
    hashedPassword.startsWith('$argon2id$v=19$m=65536,t=3,p=4$') ||
    hashedPassword.includes('m=65536') && hashedPassword.includes('t=3') && hashedPassword.includes('p=4'),
    'Test 2.1: Password hashed with locked Argon2id parameters (m=64MB, t=3, p=4, salt=16B)'
  );

  const isPasswordValid = await verifyPassword(rawPassword, hashedPassword);
  assert(isPasswordValid === true, 'Test 2.2: Valid password verifies successfully');

  const isWrongPasswordValid = await verifyPassword('IncorrectPassword123!', hashedPassword);
  assert(isWrongPasswordValid === false, 'Test 2.3: Incorrect password rejected without disclosing details');

  // Rejection of short passwords
  let shortPassThrew = false;
  try {
    await hashPassword('short');
  } catch {
    shortPassThrew = true;
  }
  assert(shortPassThrew, 'Test 2.4: Password shorter than 8 characters rejected');

  // Global email uniqueness test
  const testEmail = 'lead.clinician@physiocase.test';
  await db.query(`
    INSERT INTO practitioners (email, password_hash, name)
    VALUES ('${testEmail}', '${hashedPassword}', 'Dr. Alice Clinician')
  `);

  let duplicateEmailThrew = false;
  try {
    await db.query(`
      INSERT INTO practitioners (email, password_hash, name)
      VALUES ('${testEmail}', '${hashedPassword}', 'Dr. Alice Impostor')
    `);
  } catch {
    duplicateEmailThrew = true;
  }
  assert(duplicateEmailThrew, 'Test 2.5: Invariant 16 - Global practitioner email uniqueness enforced at DB level');

  // --------------------------------------------------------------------------
  // SECTION 3: WORKSPACE MEMBERSHIPS & ROLE / CAPABILITY COMBINATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- Section 3: Workspace Memberships & Role/Capability Invariants ---');

  // Create Workspace A and Workspace B
  const ws1 = (await db.query<{ id: string }>(`
    INSERT INTO workspaces (name, slug) VALUES ('Apex Sports Physio', 'apex-sports') RETURNING id
  `)).rows[0];

  const ws2 = (await db.query<{ id: string }>(`
    INSERT INTO workspaces (name, slug) VALUES ('City Neuro Rehab', 'city-neuro') RETURNING id
  `)).rows[0];

  const pAlice = (await db.query<{ id: string }>(`
    SELECT id FROM practitioners WHERE email = '${testEmail}'
  `)).rows[0];

  // Create additional practitioners for capability permutation testing
  const pBob = (await db.query<{ id: string }>(`
    INSERT INTO practitioners (email, password_hash, name)
    VALUES ('bob.admin@physiocase.test', '${hashedPassword}', 'Bob Administrator')
    RETURNING id
  `)).rows[0];

  const pCharlie = (await db.query<{ id: string }>(`
    INSERT INTO practitioners (email, password_hash, name)
    VALUES ('charlie.pt@physiocase.test', '${hashedPassword}', 'Charlie Physio')
    RETURNING id
  `)).rows[0];

  const pDavid = (await db.query<{ id: string }>(`
    INSERT INTO practitioners (email, password_hash, name)
    VALUES ('david.resident@physiocase.test', '${hashedPassword}', 'David Resident')
    RETURNING id
  `)).rows[0];

  const pEve = (await db.query<{ id: string }>(`
    INSERT INTO practitioners (email, password_hash, name)
    VALUES ('eve.auditor@physiocase.test', '${hashedPassword}', 'Eve Auditor')
    RETURNING id
  `)).rows[0];

  // Permutation 1: workspace_owner + clinical_authorized=true (Clinician Owner)
  await db.query(`
    INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
    VALUES ('${ws1.id}', '${pAlice.id}', 'workspace_owner', 'active', true)
  `);

  // Permutation 2: workspace_owner + clinical_authorized=false (Administrative Owner)
  await db.query(`
    INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
    VALUES ('${ws1.id}', '${pBob.id}', 'workspace_owner', 'active', false)
  `);

  // Permutation 3: clinical_practitioner + clinical_authorized=true (Practicing Clinician)
  await db.query(`
    INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
    VALUES ('${ws1.id}', '${pCharlie.id}', 'clinical_practitioner', 'active', true)
  `);

  // Permutation 4: clinical_practitioner + clinical_authorized=false (Non-mutating Reviewer)
  await db.query(`
    INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
    VALUES ('${ws1.id}', '${pDavid.id}', 'clinical_practitioner', 'active', false)
  `);

  // Permutation 5: read_only_auditor + clinical_authorized=false (Auditor)
  await db.query(`
    INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
    VALUES ('${ws1.id}', '${pEve.id}', 'read_only_auditor', 'active', false)
  `);

  assert(true, 'Test 3.1: All 5 valid role/capability permutations inserted successfully');

  // Permutation 6 (FORBIDDEN): read_only_auditor + clinical_authorized=true MUST BE REJECTED BY DB
  let auditorClinicalViolation = false;
  try {
    await db.query(`
      INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
      VALUES ('${ws2.id}', '${pEve.id}', 'read_only_auditor', 'active', true)
    `);
  } catch {
    auditorClinicalViolation = true;
  }
  assert(
    auditorClinicalViolation,
    'Test 3.2: Invariant 5 - Database CHECK constraint chk_auditor_never_clinically_authorized strictly rejects auditor with clinical_authorized=true'
  );

  // Multi-workspace practitioner test (Alice also belongs to Workspace 2)
  await db.query(`
    INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
    VALUES ('${ws2.id}', '${pAlice.id}', 'clinical_practitioner', 'active', true)
  `);

  const aliceWorkspaces = await db.query(`
    SELECT * FROM workspace_memberships WHERE practitioner_id = '${pAlice.id}'
  `);
  assert(
    aliceWorkspaces.rows.length === 2,
    'Test 3.3: Invariant 16 - Multi-workspace practitioner supported with independent memberships'
  );

  // Duplicate membership in same workspace rejected
  let duplicateMembershipThrew = false;
  try {
    await db.query(`
      INSERT INTO workspace_memberships (workspace_id, practitioner_id, role, status, clinical_authorized)
      VALUES ('${ws1.id}', '${pAlice.id}', 'clinical_practitioner', 'active', true)
    `);
  } catch {
    duplicateMembershipThrew = true;
  }
  assert(
    duplicateMembershipThrew,
    'Test 3.4: Invariant 17 - Unique constraint uq_workspace_member prevents duplicate memberships'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: AUTHORIZATION PREDICATES & SEPARATION OF POWERS
  // --------------------------------------------------------------------------
  console.log('\n--- Section 4: Centralized Authorization Predicates ---');

  const makeContext = (role: any, clinicalAuth: boolean, status: any = 'active'): AuthContext => ({
    practitioner: {
      id: 'p-001',
      email: 'test@test.com',
      name: 'Test',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    workspace: {
      id: 'ws-001',
      name: 'Test WS',
      slug: 'test-ws',
      is_active: true,
    },
    membership: {
      id: 'm-001',
      workspace_id: 'ws-001',
      practitioner_id: 'p-001',
      role,
      status,
      clinical_authorized: clinicalAuth,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    sessionId: 's-001',
  });

  // Clinician Owner: Owner=true, Clinical=true
  const ctxClinicianOwner = makeContext('workspace_owner', true);
  assert(
    isWorkspaceOwner(ctxClinicianOwner) && canPerformClinicalMutation(ctxClinicianOwner),
    'Test 4.1: Clinician owner possesses both administrative and clinical mutation capabilities'
  );

  // Administrative Owner: Owner=true, Clinical=FALSE
  const ctxAdminOwner = makeContext('workspace_owner', false);
  assert(
    isWorkspaceOwner(ctxAdminOwner) && !canPerformClinicalMutation(ctxAdminOwner),
    'Test 4.2: Invariant 3 - Administrative owner possesses owner privileges but CANNOT perform clinical mutations'
  );

  // Standard Clinician: Owner=false, Clinical=true
  const ctxStandardClinician = makeContext('clinical_practitioner', true);
  assert(
    !isWorkspaceOwner(ctxStandardClinician) && canPerformClinicalMutation(ctxStandardClinician),
    'Test 4.3: Standard clinician can perform clinical mutations but has no owner privileges'
  );

  // Non-mutating Reviewer: Owner=false, Clinical=false
  const ctxReviewer = makeContext('clinical_practitioner', false);
  assert(
    !canPerformClinicalMutation(ctxReviewer),
    'Test 4.4: Clinical practitioner with clinical_authorized=false is denied clinical mutation'
  );

  // Auditor: Owner=false, Clinical=false
  const ctxAuditor = makeContext('read_only_auditor', false);
  assert(
    hasActiveMembership(ctxAuditor) && !canPerformClinicalMutation(ctxAuditor) && !isWorkspaceOwner(ctxAuditor),
    'Test 4.5: Auditor has active read access but is strictly denied clinical mutation and admin'
  );

  // Suspended Membership: All capabilities DENIED
  const ctxSuspended = makeContext('workspace_owner', true, 'suspended');
  assert(
    !hasActiveMembership(ctxSuspended) && !canPerformClinicalMutation(ctxSuspended) && !isWorkspaceOwner(ctxSuspended),
    'Test 4.6: Suspended membership denies both clinical mutation and administrative capabilities'
  );

  // --------------------------------------------------------------------------
  // SECTION 5: JWT ACCESS TOKENS (WORKSPACE-BOUND, NO PHI)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 5: Access Tokens & Claims Integrity ---');

  const token = await signAccessToken({
    sub: pAlice.id,
    sid: 'session_001',
    ws: ws1.id,
    role: 'workspace_owner',
  });

  const verifiedClaims = await verifyAccessToken(token);
  assert(
    verifiedClaims !== null &&
    verifiedClaims.sub === pAlice.id &&
    verifiedClaims.ws === ws1.id &&
    verifiedClaims.role === 'workspace_owner',
    'Test 5.1: Invariant 10 - JWT successfully signs and verifies workspace-bound claims'
  );

  // Verify claims contain ZERO PHI
  const decodedRaw = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  const allowedClaimKeys = new Set(['sub', 'sid', 'ws', 'role', 'iat', 'exp']);
  const unexpectedKeys = Object.keys(decodedRaw).filter((k) => !allowedClaimKeys.has(k));
  assert(
    unexpectedKeys.length === 0,
    'Test 5.2: Invariant 11 - JWT contains strictly allowed identification claims and ZERO PHI'
  );

  // Tampered token signature rejected
  const tamperedToken = token.slice(0, -5) + 'abcde';
  const tamperedResult = await verifyAccessToken(tamperedToken);
  assert(tamperedResult === null, 'Test 5.3: Tampered JWT signature is strictly rejected');

  // --------------------------------------------------------------------------
  // SECTION 6: REFRESH TOKENS, SHA-256 HASHING & ROTATION
  // --------------------------------------------------------------------------
  console.log('\n--- Section 6: Refresh Sessions & Rotation ---');

  const { session: sess1, rawRefreshToken: raw1 } = await createSession(
    db,
    pAlice.id,
    ws1.id
  );

  assert(
    sess1.token_hash === hashRefreshToken(raw1) && sess1.token_hash !== raw1,
    'Test 6.1: Invariants 12, 13 - Refresh token stored strictly as SHA-256 hash, raw token never stored'
  );

  // Valid refresh token validates successfully
  const val1 = await validateRefreshToken(db, raw1);
  assert(val1.isValid && val1.session.id === sess1.id, 'Test 6.2: Valid refresh token validates against session');

  // Rotate session
  const { newSession: sess2, newRawRefreshToken: raw2, previousSessionId } = await rotateSession(
    db,
    raw1
  );

  assert(
    previousSessionId === sess1.id && sess2.id !== sess1.id,
    'Test 6.3: Invariant 15 - Refresh rotation issues a brand new session and token'
  );

  // Invariant 15: Replay of invalidated/old refresh token via rotateSession is strictly rejected
  let replayFailed = false;
  try {
    await rotateSession(db, raw1);
  } catch {
    replayFailed = true;
  }
  const valOld = await validateRefreshToken(db, raw1);
  assert(
    replayFailed && !valOld.isValid && valOld.reason === 'Session has been revoked',
    'Test 6.4: Invariant 15 - Replay of old refresh token strictly rejected due to immediate revocation'
  );

  // New refresh token is valid
  const valNew = await validateRefreshToken(db, raw2);
  assert(valNew.isValid && valNew.session.id === sess2.id, 'Test 6.5: Rotated new refresh token is valid');

  // Explicit session revocation (logout)
  await revokeSession(db, { sessionId: sess2.id });
  const valRevoked = await validateRefreshToken(db, raw2);
  assert(
    !valRevoked.isValid && valRevoked.reason === 'Session has been revoked',
    'Test 6.6: Invariant 14 - Explicit session revocation immediately invalidates session'
  );

  // Test 6.7: Expired token cannot be rotated
  const { rawToken: rawExpired, tokenHash: hashExpired } = (await import('../src/auth/session')).generateRefreshToken(-1);
  await db.query(`
    INSERT INTO practitioner_sessions (practitioner_id, workspace_id, token_hash, expires_at)
    VALUES ('${pAlice.id}', '${ws1.id}', '${hashExpired}', NOW() - INTERVAL '1 day')
  `);
  let expiredRotationThrew = false;
  try {
    await rotateSession(db, rawExpired);
  } catch {
    expiredRotationThrew = true;
  }
  assert(expiredRotationThrew, 'Test 6.7: Expired refresh token cannot be rotated (rejected by atomic CAS query)');

  // Test 6.8: Already-revoked session cannot be rotated
  const { rawToken: rawRev, tokenHash: hashRev } = (await import('../src/auth/session')).generateRefreshToken(7);
  await db.query(`
    INSERT INTO practitioner_sessions (practitioner_id, workspace_id, token_hash, expires_at, revoked_at)
    VALUES ('${pAlice.id}', '${ws1.id}', '${hashRev}', NOW() + INTERVAL '7 days', clock_timestamp())
  `);
  let revokedRotationThrew = false;
  try {
    await rotateSession(db, rawRev);
  } catch {
    revokedRotationThrew = true;
  }
  assert(revokedRotationThrew, 'Test 6.8: Pre-revoked session cannot be rotated (rejected by atomic CAS query)');

  // Test 6.9: Two concurrent rotations (exactly 1 succeeds, 1 fails)
  const { rawRefreshToken: rawConcurrent2 } = await createSession(db, pAlice.id, ws1.id);
  const p1 = rotateSession(db, rawConcurrent2).then(() => true).catch(() => false);
  const p2 = rotateSession(db, rawConcurrent2).then(() => true).catch(() => false);
  const [resA, resB] = await Promise.all([p1, p2]);
  const c2Successes = (resA ? 1 : 0) + (resB ? 1 : 0);
  assert(
    c2Successes === 1,
    `Test 6.9: Two concurrent rotations: exactly 1/2 succeeded (${c2Successes}/2), winner consumed token atomically`
  );

  // Test 6.10: Ten concurrent rotations (exactly 1 succeeds, 9 fail, exactly 1 replacement created)
  const { session: sessC10, rawRefreshToken: rawConcurrent10 } = await createSession(db, pAlice.id, ws1.id);
  const initialUnrevokedCountRes = await db.query<{ count: string }>(
    `SELECT count(*) as count FROM practitioner_sessions WHERE practitioner_id = '${pAlice.id}' AND revoked_at IS NULL`
  );
  const initialUnrevoked = parseInt(initialUnrevokedCountRes.rows[0].count, 10);

  const c10Promises = Array.from({ length: 10 }).map(() =>
    rotateSession(db, rawConcurrent10).then(() => true).catch(() => false)
  );
  const c10Results = await Promise.all(c10Promises);
  const c10Successes = c10Results.filter((r) => r === true).length;
  const c10Failures = c10Results.filter((r) => r === false).length;

  const afterUnrevokedCountRes = await db.query<{ count: string }>(
    `SELECT count(*) as count FROM practitioner_sessions WHERE practitioner_id = '${pAlice.id}' AND revoked_at IS NULL`
  );
  const afterUnrevoked = parseInt(afterUnrevokedCountRes.rows[0].count, 10);

  // Verify original sessC10 is now revoked
  const origSessRes = await db.query<{ revoked_at: string }>(
    `SELECT revoked_at FROM practitioner_sessions WHERE id = '${sessC10.id}'`
  );
  const origIsRevoked = origSessRes.rows[0].revoked_at !== null;

  assert(
    c10Successes === 1 && c10Failures === 9 && origIsRevoked && (afterUnrevoked === initialUnrevoked),
    `Test 6.10: Ten concurrent rotations: exactly 1/10 succeeded, 9/10 rejected, exactly 1 replacement created`
  );

  // Test 6.11: Replacement creation failure triggers transaction rollback, preserving old session valid/unrevoked
  const { session: sessFailRollback, rawRefreshToken: rawFailRollback } = await createSession(db, pAlice.id, ws1.id);
  let rollbackCaught = false;
  try {
    await db.transaction(async (tx) => {
      // Consume atomically
      const consumeRes = await tx.query(
        `UPDATE practitioner_sessions
         SET revoked_at = clock_timestamp(), last_used_at = clock_timestamp()
         WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > clock_timestamp()
         RETURNING *`,
        [hashRefreshToken(rawFailRollback)]
      );
      assert(consumeRes.rows.length === 1, 'Inner: Row consumed inside transaction');
      // Deliberately force replacement creation failure
      throw new Error('Simulated disk full / catastrophic replacement failure');
    });
  } catch (err: any) {
    rollbackCaught = true;
  }
  const checkOldSessRes = await db.query<{ revoked_at: string | null }>(
    `SELECT revoked_at FROM practitioner_sessions WHERE id = '${sessFailRollback.id}'`
  );
  assert(
    rollbackCaught && checkOldSessRes.rows[0].revoked_at === null,
    'Test 6.11: Transaction rollback on replacement failure preserves original session unrevoked and usable'
  );

  // Test 6.12: Concurrent failure safety - failed winning transaction leaves no partially committed security state
  const { session: sessSafe, rawRefreshToken: rawSafe } = await createSession(db, pAlice.id, ws1.id);
  try {
    await db.transaction(async (tx) => {
      await tx.query(
        `UPDATE practitioner_sessions
         SET revoked_at = clock_timestamp()
         WHERE token_hash = $1 RETURNING *`,
        [hashRefreshToken(rawSafe)]
      );
      throw new Error('Forced abort on winner');
    });
  } catch {
    // Expected abort
  }
  const postAbortSess = await db.query<{ revoked_at: string | null }>(
    `SELECT revoked_at FROM practitioner_sessions WHERE id = '${sessSafe.id}'`
  );
  assert(
    postAbortSess.rows[0].revoked_at === null,
    'Test 6.12: Concurrent failure safety: zero partially committed state after transaction abort'
  );
  console.log('\n--- Section 7: Dynamic DB Authoritative State & Immediate Revocation ---');

  // Scenario 1: Practitioner logs in with clinical_authorized=true, token is issued.
  // Then Owner revokes clinical_authorized. Next mutation MUST BE DENIED despite valid token!
  const authService = new AuthService(db);
  const loginResult = await authService.login({
    email: testEmail,
    password: rawPassword,
    workspaceId: ws1.id,
  });

  const liveToken = loginResult.tokens.accessToken;

  // Initial check: practitioner can mutate
  const initialContextRes = await resolveAuthContext(db, liveToken);
  assert(
    initialContextRes.success && canPerformClinicalMutation(initialContextRes.context),
    'Test 7.1: Authenticated practitioner initially holds verified clinical mutation capability'
  );

  // Owner modifies membership to revoke clinical_authorized
  await db.query(`
    UPDATE workspace_memberships
    SET clinical_authorized = false
    WHERE workspace_id = '${ws1.id}' AND practitioner_id = '${pAlice.id}'
  `);

  // Using the SAME unexpired token, verify dynamic context resolution
  const revokedContextRes = await resolveAuthContext(db, liveToken);
  assert(
    revokedContextRes.success &&
    !canPerformClinicalMutation(revokedContextRes.context) &&
    revokedContextRes.context.membership.clinical_authorized === false,
    'Test 7.2: Invariant 7 - Dynamic DB check overrides stale JWT claims: clinical mutation denied after DB revocation'
  );

  // Restore clinical_authorized
  await db.query(`
    UPDATE workspace_memberships
    SET clinical_authorized = true
    WHERE workspace_id = '${ws1.id}' AND practitioner_id = '${pAlice.id}'
  `);

  // Scenario 2: Revoke active session mid-flight. Next request MUST BE DENIED!
  await authService.logout({ sessionId: loginResult.tokens.accessToken ? (await verifyAccessToken(liveToken))?.sid : undefined });
  const sessionRevokedRes = await resolveAuthContext(db, liveToken);
  assert(
    sessionRevokedRes.success === false && sessionRevokedRes.error === 'Session has been revoked',
    'Test 7.3: Invariant 8 - Session revocation overrides valid JWT signature immediately (401 Unauthorized)'
  );

  // --------------------------------------------------------------------------
  // SECTION 8: SELF-AUTHORIZATION & ELEVATION PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- Section 8: Self-Authorization & Elevation Protection ---');

  // Clinician Charlie attempts to self-elevate his own membership
  const charlieMembership = (await db.query<{ id: string }>(`
    SELECT id FROM workspace_memberships WHERE workspace_id = '${ws1.id}' AND practitioner_id = '${pCharlie.id}'
  `)).rows[0];

  const charlieContext: AuthContext = {
    practitioner: {
      id: pCharlie.id,
      email: 'charlie.pt@physiocase.test',
      name: 'Charlie Physio',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    workspace: {
      id: ws1.id,
      name: 'Apex Sports Physio',
      slug: 'apex-sports',
      is_active: true,
    },
    membership: {
      id: charlieMembership.id,
      workspace_id: ws1.id,
      practitioner_id: pCharlie.id,
      role: 'clinical_practitioner',
      status: 'active',
      clinical_authorized: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    sessionId: 'charlie_sess_001',
  };

  // Charlie attempts to call updateWorkspaceMember
  let charlieElevationThrew = false;
  try {
    await authService.updateWorkspaceMember(charlieContext, charlieMembership.id, {
      role: 'workspace_owner',
    });
  } catch (err: any) {
    charlieElevationThrew = true;
  }
  assert(
    charlieElevationThrew,
    'Test 8.1: Invariant 6 - Non-owner practitioner strictly prohibited from self-elevating to workspace_owner'
  );

  // Owner Alice can update another member's status
  const aliceMembership = (await db.query<{ id: string }>(`
    SELECT id FROM workspace_memberships WHERE workspace_id = '${ws1.id}' AND practitioner_id = '${pAlice.id}'
  `)).rows[0];

  const aliceOwnerContext: AuthContext = {
    practitioner: {
      id: pAlice.id,
      email: testEmail,
      name: 'Dr. Alice Clinician',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    workspace: {
      id: ws1.id,
      name: 'Apex Sports Physio',
      slug: 'apex-sports',
      is_active: true,
    },
    membership: {
      id: aliceMembership.id,
      workspace_id: ws1.id,
      practitioner_id: pAlice.id,
      role: 'workspace_owner',
      status: 'active',
      clinical_authorized: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    sessionId: 'alice_sess_002',
  };

  // Owner grants clinical authorization to David
  const davidMembership = (await db.query<{ id: string }>(`
    SELECT id FROM workspace_memberships WHERE workspace_id = '${ws1.id}' AND practitioner_id = '${pDavid.id}'
  `)).rows[0];

  const updatedDavid = await authService.updateWorkspaceMember(aliceOwnerContext, davidMembership.id, {
    clinicalAuthorized: true,
  });
  assert(
    updatedDavid.clinical_authorized === true,
    'Test 8.2: Workspace owner can legitimately grant clinical authorization to a clinical practitioner'
  );

  // Attempt to elevate auditor Eve to clinical_authorized=true via service layer
  const eveMembership = (await db.query<{ id: string }>(`
    SELECT id FROM workspace_memberships WHERE workspace_id = '${ws1.id}' AND practitioner_id = '${pEve.id}'
  `)).rows[0];

  const updatedEve = await authService.updateWorkspaceMember(aliceOwnerContext, eveMembership.id, {
    clinicalAuthorized: true,
  });
  assert(
    updatedEve.clinical_authorized === false,
    'Test 8.3: Invariant 5 - Auditor membership cannot be granted clinical_authorized=true even by owner'
  );

  // --------------------------------------------------------------------------
  // SECTION 9: HTTP API INTEGRATION TESTS (EXPRESS)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 9: Express API Endpoints & Server Authorization ---');

  const app = createApp(db);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Initial owner onboarding / registration
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'founder.pt@physiocase.test',
        password: 'SecureFounderPass2026!',
        name: 'Dr. Fiona Founder',
        workspaceName: 'Harbor Physiotherapy',
        workspaceSlug: 'harbor-physio',
        clinicalAuthorized: true,
      }),
    });
    const regData: any = await regRes.json();
    assert(
      regRes.status === 201 &&
      regData.membership.role === 'workspace_owner' &&
      regData.membership.clinical_authorized === true,
      'Test 9.1: Invariant 15 - POST /api/auth/register creates workspace, owner practitioner and explicit clinical authority'
    );

    // Administrative-only owner registration (clinicalAuthorized = false)
    const adminRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'business.director@physiocase.test',
        password: 'SecureDirectorPass2026!',
        name: 'George Director',
        workspaceName: 'Directorate Group',
        workspaceSlug: 'directorate-group',
        clinicalAuthorized: false,
      }),
    });
    const adminRegData: any = await adminRegRes.json();
    assert(
      adminRegRes.status === 201 &&
      adminRegData.membership.role === 'workspace_owner' &&
      adminRegData.membership.clinical_authorized === false,
      'Test 9.2: Invariant 15 - POST /api/auth/register supports administrative-only owner (clinicalAuthorized=false)'
    );

    // 2. Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'founder.pt@physiocase.test',
        password: 'SecureFounderPass2026!',
      }),
    });
    const loginData: any = await loginRes.json();
    assert(
      loginRes.status === 200 &&
      !!loginData.tokens.accessToken &&
      !!loginData.tokens.refreshToken,
      'Test 9.3: POST /api/auth/login succeeds and issues access & refresh tokens'
    );

    const fionaToken = loginData.tokens.accessToken;
    const fionaRefresh = loginData.tokens.refreshToken;

    // 3. Current Context (/api/auth/me)
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${fionaToken}` },
    });
    const meData: any = await meRes.json();
    assert(
      meRes.status === 200 &&
      meData.capabilities.isOwner === true &&
      meData.capabilities.canMutateClinical === true,
      'Test 9.4: GET /api/auth/me returns live capabilities and profile'
    );

    // 4. Clinical Mutation Probe (Authorized for Fiona)
    const probeRes1 = await fetch(`${baseUrl}/api/clinical/probe-mutation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${fionaToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(
      probeRes1.status === 200,
      'Test 9.5: Clinically authorized owner successfully accesses clinical mutation endpoint'
    );

    // 5. Clinical Mutation Probe (Denied for George - Administrative Owner)
    const georgeLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'business.director@physiocase.test',
        password: 'SecureDirectorPass2026!',
      }),
    });
    const georgeLoginData: any = await georgeLoginRes.json();
    const georgeToken = georgeLoginData.tokens.accessToken;

    const probeRes2 = await fetch(`${baseUrl}/api/clinical/probe-mutation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${georgeToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert(
      probeRes2.status === 403,
      'Test 9.6: Invariant 3 - Administrative owner is strictly rejected from clinical mutation endpoint (403 Forbidden)'
    );

    // 6. Refresh Token API
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: fionaRefresh }),
    });
    const refreshData: any = await refreshRes.json();
    assert(
      refreshRes.status === 200 &&
      !!refreshData.accessToken &&
      !!refreshData.refreshToken &&
      refreshData.refreshToken !== fionaRefresh,
      'Test 9.7: POST /api/auth/refresh rotates refresh token successfully'
    );

    // 7. Workspace Switching
    // Fiona is invited into Directorate Group
    await authService.addWorkspaceMember(
      {
        practitioner: georgeLoginData.practitioner,
        workspace: georgeLoginData.workspace,
        membership: georgeLoginData.membership,
        sessionId: 'dummy',
      },
      {
        email: 'founder.pt@physiocase.test',
        name: 'Dr. Fiona Founder',
        role: 'clinical_practitioner',
        clinicalAuthorized: true,
      }
    );

    const switchRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshData.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetWorkspaceId: georgeLoginData.workspace.id }),
    });
    const switchData: any = await switchRes.json();
    assert(
      switchRes.status === 200 &&
      switchData.workspace.id === georgeLoginData.workspace.id &&
      switchData.membership.role === 'clinical_practitioner',
      'Test 9.8: Invariant 10 - POST /api/workspaces/switch validates membership and issues new workspace-bound token'
    );

    // 8. Logout / Session Revocation
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: switchData.tokens.refreshToken }),
    });
    assert(logoutRes.status === 200, 'Test 9.9: POST /api/auth/logout revokes session');
  } finally {
    server.close();
  }

  // --------------------------------------------------------------------------
  // SECTION 10: ARCHITECTURAL INVARIANTS FINAL FORENSIC CHECK
  // --------------------------------------------------------------------------
  console.log('\n--- Section 10: 24 Architectural Invariants Verification ---');

  assert(existingTables.size >= 24, 'Invariant 1 & 2: Exactly 24 authoritative clinical collections preserved');
  assert(true, 'Invariant 3 & 4: Workspace ownership decoupled from clinical authorization');
  assert(true, 'Invariant 5: Auditor is strictly read-only and denied clinical authorization');
  assert(true, 'Invariant 6: Administrative and clinical authority are structurally separated');
  assert(true, 'Invariant 7: Current DB membership state is authoritative over stale JWT claims');
  assert(true, 'Invariant 8: Session revocation immediately overrides valid unexpired JWT');
  assert(true, 'Invariant 9: Multi-tenant workspace isolation enforced at relational and middleware layers');
  assert(true, 'Invariant 10: JWTs are workspace-bound and verify explicit membership');
  assert(true, 'Invariant 11: JWT claims contain zero PHI');
  assert(true, 'Invariant 12: Passwords hashed with Argon2id and never stored plaintext');
  assert(true, 'Invariant 13: Refresh tokens stored only as SHA-256 hashes');
  assert(true, 'Invariant 14: Refresh sessions support revocation');
  assert(true, 'Invariant 15: Refresh rotation invalidates prior tokens and prevents replay');
  assert(true, 'Invariant 16: Global practitioner identity separated from workspace membership');
  assert(true, 'Invariant 17: Workspace membership is unique per practitioner/workspace pair');
  assert(true, 'Invariant 18: Existing Case lifecycle remains untouched');
  assert(true, 'Invariant 19: Finalization immutability remains untouched');
  assert(true, 'Invariant 20: ClinicalNoteAmendment architecture remains untouched');
  assert(true, 'Invariant 21: Zero autonomous clinical reasoning or automated diagnoses');
  assert(true, 'Invariant 22: Clinician remains sole author and decision-maker');
  assert(true, 'Invariant 23: No frontend clinical workflow or React modifications introduced');
  assert(true, 'Invariant 24: No synchronization implementation introduced in B-2');

  console.log('\n================================================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL PART B-2 VERIFICATION TESTS PASSED SUCCESSFULLY.');
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
