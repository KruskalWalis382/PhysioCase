-- ============================================================================
-- PHYSIOCASE PART B-3: TOKEN HASH UNIQUENESS & QUERY INDEX HARDENING
-- Migration Version: 003
-- Name: token_hash_unique_and_b3_indexes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: HARDEN PRACTITIONER SESSIONS REFRESH TOKEN UNIQUENESS
-- ----------------------------------------------------------------------------
-- Drop existing non-unique index and replace with database-enforced unique index.
-- If duplicate token_hash rows exist, this transaction will abort and roll back,
-- preserving the original non-unique index and all existing data safely.

DROP INDEX idx_practitioner_sessions_token_hash;
CREATE UNIQUE INDEX idx_practitioner_sessions_token_hash ON practitioner_sessions(token_hash);

-- ----------------------------------------------------------------------------
-- SECTION 2: B-3 WORKSPACE-BOUND LISTING INDEXES
-- ----------------------------------------------------------------------------
-- Non-duplicate query performance indexes for workspace-scoped pagination.

CREATE INDEX idx_patients_workspace_created ON patients(workspace_id, created_at DESC);
CREATE INDEX idx_cases_workspace_created ON cases(workspace_id, created_at DESC);
