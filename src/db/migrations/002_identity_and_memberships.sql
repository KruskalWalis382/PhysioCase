-- ============================================================================
-- PHYSIOCASE PART B-2: IDENTITY, WORKSPACE MEMBERSHIP & SESSIONS MIGRATION
-- Migration Version: 002
-- Name: identity_and_memberships
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: WORKSPACE MEMBERSHIPS
-- ----------------------------------------------------------------------------
-- Explicit workspace membership decoupling global practitioner identity
-- from workspace authority, enforcing explicit clinical authorization capability.

CREATE TABLE workspace_memberships (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('workspace_owner', 'clinical_practitioner', 'read_only_auditor')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  clinical_authorized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_workspace_member UNIQUE (workspace_id, practitioner_id),
  CONSTRAINT chk_auditor_never_clinically_authorized CHECK (role != 'read_only_auditor' OR clinical_authorized = false)
);

CREATE INDEX idx_workspace_memberships_workspace ON workspace_memberships(workspace_id);
CREATE INDEX idx_workspace_memberships_practitioner ON workspace_memberships(practitioner_id);
CREATE INDEX idx_workspace_memberships_role ON workspace_memberships(role);

-- ----------------------------------------------------------------------------
-- SECTION 2: B-1 -> B-2 MEMBERSHIP DATA MIGRATION
-- ----------------------------------------------------------------------------
-- Existing B-1 practitioner workspace associations represent original
-- workspace owners and practicing clinicians. Migrate them to:
-- role = 'workspace_owner', status = 'active', clinical_authorized = true.

INSERT INTO workspace_memberships (
  workspace_id,
  practitioner_id,
  role,
  status,
  clinical_authorized,
  created_at,
  updated_at
)
SELECT
  workspace_id,
  id,
  'workspace_owner',
  'active',
  true,
  created_at,
  updated_at
FROM practitioners
WHERE workspace_id IS NOT NULL
ON CONFLICT (workspace_id, practitioner_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SECTION 3: PRACTITIONER IDENTITY GLOBALIZATION
-- ----------------------------------------------------------------------------
-- practitioners.workspace_id is no longer the authoritative workspace relationship.
-- Global practitioner identity is independent of workspace membership.
-- Email uniqueness becomes global at practitioner identity level.

ALTER TABLE practitioners ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE practitioners DROP CONSTRAINT IF EXISTS uq_practitioner_workspace_email;
ALTER TABLE practitioners ADD CONSTRAINT uq_practitioners_global_email UNIQUE (email);

-- ----------------------------------------------------------------------------
-- SECTION 4: PRACTITIONER REFRESH SESSIONS INFRASTRUCTURE
-- ----------------------------------------------------------------------------
-- Stores cryptographically hashed refresh tokens (SHA-256) bound to
-- practitioner and workspace, supporting rotation, expiry, and dynamic revocation.

CREATE TABLE practitioner_sessions (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  practitioner_id uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_practitioner_sessions_token_hash ON practitioner_sessions(token_hash);
CREATE INDEX idx_practitioner_sessions_practitioner ON practitioner_sessions(practitioner_id);
CREATE INDEX idx_practitioner_sessions_workspace ON practitioner_sessions(workspace_id);
