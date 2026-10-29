-- ============================================================================
-- PHYSIOCASE PART B-1: DATABASE FOUNDATION & RELATIONAL SCHEMA
-- Migration: 001_foundation.sql
-- 
-- Locked Architectural Guarantees:
-- 1. Exactly 24 authoritative clinical collections/tables
-- 2. Justified infrastructure tables (workspaces, practitioners, sequences, migration)
-- 3. UUIDv7 internal identifiers
-- 4. Workspace-scoped, permanent PC-XXXX / CASE-XXXX human identifiers
-- 5. Airtight multi-tenant relational isolation via compound (workspace_id, parent_id) FKs
-- 6. Strict relational foreign keys with ON DELETE RESTRICT
-- 7. Case Lifecycle: Independent Clinical Status + Administrative Archive State
-- 8. Server-owned monotonic versioning
-- 9. Finalized-record database-level immutability with governed amendment path
-- 10. Transaction-bound, PHI-minimal audit ledger (exact 9 actions)
-- 11. Strict clinical neutrality (zero autonomous diagnostic or clinical logic)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: CORE UTILITY FUNCTIONS
-- ----------------------------------------------------------------------------

-- Deterministic UUIDv7 Generator (RFC 9562)
-- Combines 48-bit millisecond timestamp + version 7 + variant 10 + randomness
CREATE OR REPLACE FUNCTION generate_uuid_v7()
RETURNS uuid AS $$
DECLARE
  v_time_hex text;
  v_rand text;
  v_variant text;
  v_uuid text;
BEGIN
  v_time_hex := lpad(to_hex((floor(extract(epoch from clock_timestamp()) * 1000))::bigint), 12, '0');
  v_rand := md5(random()::text || clock_timestamp()::text);
  v_variant := substr('89ab', (floor(random() * 4) + 1)::int, 1);
  v_uuid := substr(v_time_hex, 1, 8) || '-' ||
            substr(v_time_hex, 9, 4) || '-7' ||
            substr(v_rand, 1, 3) || '-' ||
            v_variant || substr(v_rand, 4, 3) || '-' ||
            substr(v_rand, 7, 12);
  RETURN v_uuid::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ----------------------------------------------------------------------------
-- SECTION 2: JUSTIFIED INFRASTRUCTURE TABLES
-- ----------------------------------------------------------------------------

-- 1. Workspaces (Multi-tenant boundary)
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- 2. Practitioners (Practitioner identity & credential foundation)
CREATE TABLE practitioners (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  title text,
  clinic_name text,
  registration_number text,
  initials text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_practitioner_workspace_email UNIQUE (workspace_id, email)
);

-- 3. Workspace Human Sequences (Concurrency-safe atomic counters for PC-XXXX and CASE-XXXX)
CREATE TABLE workspace_human_sequences (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sequence_type text NOT NULL CHECK (sequence_type IN ('patient', 'case')),
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, sequence_type)
);

-- Concurrency-safe atomic allocation function for PC-XXXX and CASE-XXXX
CREATE OR REPLACE FUNCTION allocate_next_human_id(
  p_workspace_id uuid,
  p_type text
)
RETURNS text AS $$
DECLARE
  v_num integer;
  v_prefix text;
BEGIN
  IF p_type = 'patient' THEN
    v_prefix := 'PC-';
  ELSIF p_type = 'case' THEN
    v_prefix := 'CASE-';
  ELSE
    RAISE EXCEPTION 'Invalid sequence type: %', p_type;
  END IF;

  INSERT INTO workspace_human_sequences (workspace_id, sequence_type, last_number, updated_at)
  VALUES (p_workspace_id, p_type, 1, clock_timestamp())
  ON CONFLICT (workspace_id, sequence_type)
  DO UPDATE SET
    last_number = workspace_human_sequences.last_number + 1,
    updated_at = clock_timestamp()
  RETURNING last_number INTO v_num;

  RETURN v_prefix || lpad(v_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 4. Migration Batches (Migration staging and provenance tracking)
CREATE TABLE migration_batches (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  batch_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'validating', 'staging', 'dry_run_passed', 'committed', 'failed', 'rolled_back')),
  source_collection_count integer NOT NULL DEFAULT 0,
  source_record_count integer NOT NULL DEFAULT 0,
  checksum_sha256 text,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  provenance_notes text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CONSTRAINT uq_migration_workspace_batch UNIQUE (workspace_id, batch_number)
);

-- 5. Migration Staging Records (Raw staging isolated from authoritative clinical tables)
CREATE TABLE migration_staging_records (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  batch_id uuid NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  collection_name text NOT NULL,
  legacy_id text NOT NULL,
  raw_payload jsonb NOT NULL,
  transformed_payload jsonb,
  validation_status text NOT NULL CHECK (validation_status IN ('pending', 'valid', 'invalid', 'imported')),
  validation_error text,
  target_uuid uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- ----------------------------------------------------------------------------
-- SECTION 3: THE EXACT 24 AUTHORITATIVE CLINICAL TABLES
-- ----------------------------------------------------------------------------

-- Table 1: patients
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  patient_number text NOT NULL,
  full_name text NOT NULL,
  preferred_name text,
  date_of_birth text NOT NULL,
  sex text,
  phone text,
  email text,
  reason_for_visit text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'discharged')),
  patient_safety_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_patients_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT uq_patients_workspace_patient_number UNIQUE (workspace_id, patient_number)
);

-- Table 2: cases
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  patient_id uuid NOT NULL,
  case_id text NOT NULL,
  case_name text NOT NULL,
  presenting_problem text,
  date_of_onset text,
  referral_source text,
  start_date text NOT NULL,
  status text NOT NULL CHECK (status IN ('Assessment', 'Treatment', 'Reassessment', 'Discharged')),
  last_session_date text,
  next_review_date text,
  title text,
  stage text CHECK (stage IS NULL OR stage IN ('assessment', 'treatment', 'reassessment', 'discharged')),
  patient_name text,
  body_region text,
  -- Case Lifecycle: Administrative Archival State (Strictly independent from clinical status)
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by jsonb,
  archive_reason text CHECK (archive_reason IS NULL OR archive_reason IN (
    'created_in_error',
    'duplicate_entry',
    'wrong_patient',
    'test_or_demo',
    'care_discontinued_uncontactable',
    'care_transferred_external',
    'administrative_closure',
    'clinical_hold_inactive'
  )),
  archive_notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_cases_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT uq_cases_workspace_case_id UNIQUE (workspace_id, case_id),
  CONSTRAINT fk_cases_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT chk_case_lifecycle_archive_integrity CHECK (
    (is_archived = false AND archived_at IS NULL AND archive_reason IS NULL)
    OR
    (is_archived = true AND archived_at IS NOT NULL AND archive_reason IS NOT NULL)
  )
);

-- Table 3: workspace_settings
CREATE TABLE workspace_settings (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE RESTRICT,
  practitioner_name text NOT NULL DEFAULT '',
  credentials text NOT NULL DEFAULT '',
  clinic_name text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  theme text NOT NULL DEFAULT 'warm-clinical' CHECK (theme IN ('warm-clinical', 'soft-stone')),
  density text NOT NULL DEFAULT 'comfortable' CHECK (density IN ('comfortable', 'compact')),
  measurement_system text NOT NULL DEFAULT 'metric' CHECK (measurement_system IN ('metric', 'imperial')),
  framework text NOT NULL DEFAULT 'journey' CHECK (framework IN ('journey', 'soap')),
  review_cadence_weeks integer NOT NULL DEFAULT 4,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Table 4: subjective_assessments
CREATE TABLE subjective_assessments (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at text,
  is_finalized boolean NOT NULL DEFAULT false,
  finalized_at timestamptz,
  finalized_by jsonb,
  amendments jsonb NOT NULL DEFAULT '[]'::jsonb,
  patient_story text NOT NULL DEFAULT '',
  symptom_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  symptom_descriptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  symptom_description_other text,
  onset text,
  date_of_onset text,
  how_did_it_start text,
  aggravating_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  aggravating_factors_notes text,
  easing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  easing_factors_notes text,
  frequency text,
  pain_severity jsonb NOT NULL DEFAULT '{"current": 0, "best": 0, "worst": 0}'::jsonb,
  duration_after_aggravation text,
  functional_difficulties jsonb NOT NULL DEFAULT '[]'::jsonb,
  functional_difficulties_notes text,
  most_important_activity text,
  previous_similar_episode text,
  previous_surgery text,
  previous_injury text,
  current_medication text,
  relevant_conditions text,
  previous_physiotherapy text,
  safety_screening text,
  safety_screening_details text,
  patient_goals text,
  therapist_initial_notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_subjective_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT uq_subjective_case UNIQUE (case_id),
  CONSTRAINT fk_subjective_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_subjective_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 5: clinical_threads
CREATE TABLE clinical_threads (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  rule_id text,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('neurological', 'safety', 'trauma', 'functional', 'mechanical')),
  status text NOT NULL CHECK (status IN ('suggested', 'exploring', 'supported', 'not_supported', 'resolved', 'not_pursued')),
  triggered_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text NOT NULL DEFAULT '',
  suggested_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  therapist_notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_threads_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_threads_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT
);

-- Table 6: objective_assessments
CREATE TABLE objective_assessments (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  selected_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  therapist_notes text,
  completed_at text,
  is_finalized boolean NOT NULL DEFAULT false,
  finalized_at timestamptz,
  finalized_by jsonb,
  amendments jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_objective_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT uq_objective_case UNIQUE (case_id),
  CONSTRAINT fk_objective_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_objective_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 7: clinical_problems
CREATE TABLE clinical_problems (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  linked_finding_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_investigation_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('active', 'addressed', 'resolved', 'inactive')),
  therapist_notes text,
  resolved_at text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by jsonb,
  archive_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_problems_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_problems_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_problems_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 8: clinical_goals
CREATE TABLE clinical_goals (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('short_term', 'long_term')),
  linked_problem_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_value text,
  target_date text,
  status text NOT NULL CHECK (status IN ('active', 'met', 'partially_met', 'not_met', 'discontinued')),
  therapist_notes text,
  achieved_at text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by jsonb,
  archive_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_goals_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_goals_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_goals_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 9: treatment_plans
CREATE TABLE treatment_plans (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  title text,
  clinical_rationale text,
  status text NOT NULL CHECK (status IN ('active', 'modified', 'completed', 'discontinued')),
  reviewed_at text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_plans_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_plans_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_plans_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 10: treatment_selections
CREATE TABLE treatment_selections (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  treatment_plan_id uuid,
  clinical_problem_id uuid,
  linked_problem_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  goal_id uuid,
  linked_goal_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  title text NOT NULL,
  intervention_type text NOT NULL,
  category text,
  intervention_description text NOT NULL DEFAULT '',
  description text,
  clinical_rationale text,
  therapist_rationale text,
  therapist_notes text,
  status text NOT NULL CHECK (status IN ('planned', 'active', 'modified', 'completed', 'discontinued')),
  dosage jsonb,
  progression jsonb,
  discontinued_at text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_selections_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_selections_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_selections_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_selections_plan_workspace FOREIGN KEY (workspace_id, treatment_plan_id) REFERENCES treatment_plans(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_selections_problem_workspace FOREIGN KEY (workspace_id, clinical_problem_id) REFERENCES clinical_problems(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_selections_goal_workspace FOREIGN KEY (workspace_id, goal_id) REFERENCES clinical_goals(workspace_id, id) ON DELETE RESTRICT
);

-- Table 13: evidence_sources (Declared before links to resolve FKs)
CREATE TABLE evidence_sources (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  title text NOT NULL,
  authors jsonb NOT NULL DEFAULT '[]'::jsonb,
  organization text,
  publication_year integer NOT NULL,
  evidence_type text NOT NULL,
  journal_or_publisher text,
  doi text,
  url text,
  version_tag text,
  status text NOT NULL CHECK (status IN ('current', 'superseded', 'withdrawn', 'archived')),
  published_at text,
  last_reviewed_at text,
  superseded_by_source_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_evidence_sources_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_evidence_sources_superseded_workspace FOREIGN KEY (workspace_id, superseded_by_source_id) REFERENCES evidence_sources(workspace_id, id) ON DELETE RESTRICT
);

-- Table 14: evidence_items
CREATE TABLE evidence_items (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  source_id uuid NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  condition_or_presentation text,
  population text,
  clinical_context text,
  treatment_approach text,
  recommendation text,
  recommendation_strength text,
  evidence_level text,
  limitations text,
  applicability text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_evidence_items_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_evidence_items_source_workspace FOREIGN KEY (workspace_id, source_id) REFERENCES evidence_sources(workspace_id, id) ON DELETE CASCADE
);

-- Table 15: condition_presentations
CREATE TABLE condition_presentations (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('condition', 'clinical_presentation', 'symptom_pattern', 'functional_presentation', 'other')),
  description text,
  body_region text,
  system text,
  common_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_condition_presentations_workspace_id UNIQUE (workspace_id, id)
);

-- Table 11: treatment_evidence_links
CREATE TABLE treatment_evidence_links (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  treatment_selection_id uuid NOT NULL,
  evidence_item_id uuid NOT NULL,
  therapist_note text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT fk_tel_selection_workspace FOREIGN KEY (workspace_id, treatment_selection_id) REFERENCES treatment_selections(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_tel_evidence_workspace FOREIGN KEY (workspace_id, evidence_item_id) REFERENCES evidence_items(workspace_id, id) ON DELETE CASCADE
);

-- Table 12: treatment_condition_links
CREATE TABLE treatment_condition_links (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  treatment_selection_id uuid NOT NULL,
  condition_presentation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT fk_tcl_selection_workspace FOREIGN KEY (workspace_id, treatment_selection_id) REFERENCES treatment_selections(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_tcl_condition_workspace FOREIGN KEY (workspace_id, condition_presentation_id) REFERENCES condition_presentations(workspace_id, id) ON DELETE CASCADE
);

-- Table 16: condition_evidence_links
CREATE TABLE condition_evidence_links (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  condition_presentation_id uuid NOT NULL,
  evidence_item_id uuid NOT NULL,
  relevance_note text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT fk_cel_condition_workspace FOREIGN KEY (workspace_id, condition_presentation_id) REFERENCES condition_presentations(workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_cel_evidence_workspace FOREIGN KEY (workspace_id, evidence_item_id) REFERENCES evidence_items(workspace_id, id) ON DELETE CASCADE
);

-- Table 17: clinical_investigations
CREATE TABLE clinical_investigations (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'radiological' CHECK (category = 'radiological'),
  modality text NOT NULL CHECK (modality IN ('xray', 'mri', 'ct', 'ultrasound', 'other')),
  name text NOT NULL,
  body_region text NOT NULL,
  investigation_date text NOT NULL,
  indication text,
  findings text,
  impression text,
  source_type text,
  source_name text,
  clinician_relevance text,
  attachment jsonb,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by jsonb,
  archive_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_investigations_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_investigations_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT
);

-- Table 18: clinical_sessions
CREATE TABLE clinical_sessions (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  session_number integer NOT NULL,
  session_date text NOT NULL,
  start_time text,
  end_time text,
  status text NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'missed')),
  therapist_session_notes text,
  patient_subjective_response text,
  overall_tolerance text NOT NULL CHECK (overall_tolerance IN ('well_tolerated', 'moderately_tolerated', 'poorly_tolerated', 'adverse_response', 'not_evaluated')),
  immediate_observations text,
  modifications_summary text,
  is_finalized boolean NOT NULL DEFAULT false,
  finalized_at timestamptz,
  finalized_by jsonb,
  amendments jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_sessions_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT uq_session_case_number UNIQUE (case_id, session_number),
  CONSTRAINT fk_sessions_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_sessions_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 19: session_treatment_deliveries
CREATE TABLE session_treatment_deliveries (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  treatment_selection_id uuid,
  title text NOT NULL,
  intervention_type text NOT NULL,
  actual_dosage jsonb,
  actual_duration_minutes numeric,
  delivery_status text NOT NULL CHECK (delivery_status IN ('completed_as_planned', 'modified', 'partially_completed', 'omitted', 'deferred')),
  modification_type text,
  modification_reason text,
  therapist_execution_notes text,
  immediate_response text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_deliveries_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_deliveries_session_workspace FOREIGN KEY (workspace_id, session_id) REFERENCES clinical_sessions(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_deliveries_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_deliveries_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_deliveries_selection_workspace FOREIGN KEY (workspace_id, treatment_selection_id) REFERENCES treatment_selections(workspace_id, id) ON DELETE RESTRICT
);

-- Table 20: outcome_measure_definitions
CREATE TABLE outcome_measure_definitions (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE RESTRICT,
  name text NOT NULL,
  short_description text,
  category text NOT NULL CHECK (category IN ('pain', 'range_of_motion', 'strength', 'functional_mobility', 'exercise_tolerance', 'patient_reported', 'neurological', 'custom')),
  value_type text NOT NULL CHECK (value_type IN ('numeric', 'percentage', 'scale_10', 'degrees', 'repetitions', 'duration_seconds', 'distance_metres', 'weight_kg', 'grade_5', 'text', 'binary')),
  unit text,
  min_value numeric,
  max_value numeric,
  direction_meaning text NOT NULL CHECK (direction_meaning IN ('higher_is_better', 'lower_is_better', 'not_defined')),
  is_system_standard boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_outcome_measure_def_workspace_id UNIQUE (workspace_id, id)
);

-- Table 21: progress_records
CREATE TABLE progress_records (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  record_date text NOT NULL,
  context_type text NOT NULL CHECK (context_type IN ('routine_progress_review', 'reassessment', 'functional_update', 'outcome_measurement', 'goal_review', 'milestone_review', 'discharge_evaluation', 'other')),
  therapist_summary text NOT NULL DEFAULT '',
  clinical_interpretation text,
  linked_session_id uuid,
  linked_assessment_id text,
  linked_goal_id uuid,
  status text CHECK (status IS NULL OR status IN ('in_progress', 'completed')),
  is_finalized boolean NOT NULL DEFAULT false,
  finalized_at timestamptz,
  finalized_by jsonb,
  amendments jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_progress_records_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_progress_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_progress_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_progress_session_workspace FOREIGN KEY (workspace_id, linked_session_id) REFERENCES clinical_sessions(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_progress_goal_workspace FOREIGN KEY (workspace_id, linked_goal_id) REFERENCES clinical_goals(workspace_id, id) ON DELETE RESTRICT
);

-- Table 22: progress_measurements
CREATE TABLE progress_measurements (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  progress_record_id uuid NOT NULL,
  case_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  measure_definition_id uuid,
  measure_name text NOT NULL,
  category text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('numeric', 'percentage', 'scale_10', 'degrees', 'repetitions', 'duration_seconds', 'distance_metres', 'weight_kg', 'grade_5', 'text', 'binary')),
  unit text,
  stage text NOT NULL CHECK (stage IN ('baseline', 'interim', 'reassessment', 'discharge')),
  numeric_value numeric,
  text_value text,
  linked_goal_id uuid,
  context text,
  notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT fk_measurements_progress_workspace FOREIGN KEY (workspace_id, progress_record_id) REFERENCES progress_records(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_measurements_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_measurements_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_measurements_definition_workspace FOREIGN KEY (workspace_id, measure_definition_id) REFERENCES outcome_measure_definitions(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_measurements_goal_workspace FOREIGN KEY (workspace_id, linked_goal_id) REFERENCES clinical_goals(workspace_id, id) ON DELETE RESTRICT
);

-- Table 23: case_discharge_records
CREATE TABLE case_discharge_records (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL UNIQUE,
  patient_id uuid NOT NULL,
  discharge_date text NOT NULL,
  discharge_reason text NOT NULL CHECK (discharge_reason IN ('goals_achieved', 'plateau_functional_independence', 'self_management_transition', 'patient_choice_discontinued', 'medical_transfer_referral', 'relocation', 'non_attendance', 'other')),
  status text CHECK (status IS NULL OR status IN ('in_progress', 'completed')),
  is_finalized boolean NOT NULL DEFAULT false,
  finalized_at timestamptz,
  finalized_by jsonb,
  amendments jsonb NOT NULL DEFAULT '[]'::jsonb,
  episode_summary text NOT NULL DEFAULT '',
  clinical_status_at_discharge text NOT NULL DEFAULT '',
  home_maintenance_plan text,
  precautions_and_warning_signs text,
  referral_or_follow_up text,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_discharge_workspace_id UNIQUE (workspace_id, id),
  CONSTRAINT fk_discharge_case_workspace FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_discharge_patient_workspace FOREIGN KEY (workspace_id, patient_id) REFERENCES patients(workspace_id, id) ON DELETE RESTRICT
);

-- Table 24: audit_events (The 24th authoritative collection)
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT generate_uuid_v7(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  sequence bigint NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor jsonb NOT NULL,
  action text NOT NULL CHECK (action IN (
    'CREATE',
    'UPDATE',
    'FINALIZE',
    'AMEND',
    'SOFT_DELETE',
    'HARD_DELETE',
    'RESTORE_WORKSPACE',
    'PRUNE_AUDIT_LOG',
    'EXPORT_REPORT'
  )),
  entity_type text NOT NULL CHECK (entity_type IN (
    'patient',
    'patient_safety_profile',
    'case',
    'subjective_assessment',
    'objective_assessment',
    'clinical_problem',
    'clinical_goal',
    'treatment_plan',
    'treatment_selection',
    'clinical_investigation',
    'clinical_session',
    'session_treatment_delivery',
    'progress_record',
    'progress_measurement',
    'case_discharge_record',
    'workspace_settings'
  )),
  entity_id text NOT NULL,
  patient_id uuid,
  case_id uuid,
  changed_fields jsonb,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_audit_workspace_sequence UNIQUE (workspace_id, sequence)
);

-- Workspace audit sequence generator
CREATE TABLE workspace_audit_sequences (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  last_sequence bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION allocate_next_audit_sequence(p_workspace_id uuid)
RETURNS bigint AS $$
DECLARE
  v_seq bigint;
BEGIN
  INSERT INTO workspace_audit_sequences (workspace_id, last_sequence, updated_at)
  VALUES (p_workspace_id, 1, clock_timestamp())
  ON CONFLICT (workspace_id)
  DO UPDATE SET
    last_sequence = workspace_audit_sequences.last_sequence + 1,
    updated_at = clock_timestamp()
  RETURNING last_sequence INTO v_seq;

  RETURN v_seq;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ----------------------------------------------------------------------------
-- SECTION 4: SERVER-OWNED VERSIONING & UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_increment_version_and_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply versioning trigger to versioned clinical tables
CREATE TRIGGER trg_patients_version
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_cases_version
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_settings_version
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_threads_version
  BEFORE UPDATE ON clinical_threads
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_problems_version
  BEFORE UPDATE ON clinical_problems
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_goals_version
  BEFORE UPDATE ON clinical_goals
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_plans_version
  BEFORE UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_selections_version
  BEFORE UPDATE ON treatment_selections
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_investigations_version
  BEFORE UPDATE ON clinical_investigations
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_deliveries_version
  BEFORE UPDATE ON session_treatment_deliveries
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

CREATE TRIGGER trg_measurements_version
  BEFORE UPDATE ON progress_measurements
  FOR EACH ROW EXECUTE FUNCTION trigger_increment_version_and_updated_at();

-- ----------------------------------------------------------------------------
-- SECTION 5: FINALIZED-RECORD IMMUTABILITY GOVERNANCE
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_protect_finalized_record()
RETURNS trigger AS $$
DECLARE
  v_old_amendments_len integer;
  v_new_amendments_len integer;
  v_latest_amendment jsonb;
  v_amendment_reason text;
  v_idx integer;
BEGIN
  -- If record is not finalized yet, allow ordinary updates (and transition to finalized)
  IF OLD.is_finalized = false THEN
    -- If finalizing in this update, record timestamp if not set
    IF NEW.is_finalized = true AND NEW.finalized_at IS NULL THEN
      NEW.finalized_at := clock_timestamp();
    END IF;
    NEW.version := OLD.version + 1;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
  END IF;

  -- Record was ALREADY finalized!
  -- De-finalization is strictly prohibited
  IF NEW.is_finalized = false THEN
    RAISE EXCEPTION 'Cannot un-finalize a finalized clinical record. Finalized records are legally immutable.';
  END IF;

  -- Modifying finalized timestamp or finalized actor is strictly prohibited
  IF NEW.finalized_at <> OLD.finalized_at THEN
    RAISE EXCEPTION 'Cannot modify finalized_at timestamp on a finalized record.';
  END IF;

  IF NEW.finalized_by::text <> OLD.finalized_by::text THEN
    RAISE EXCEPTION 'Cannot modify finalized_by actor on a finalized record.';
  END IF;

  -- The ONLY permitted modification to a finalized record is appending a new amendment to the amendments array
  v_old_amendments_len := jsonb_array_length(COALESCE(OLD.amendments, '[]'::jsonb));
  v_new_amendments_len := jsonb_array_length(COALESCE(NEW.amendments, '[]'::jsonb));

  IF v_new_amendments_len = v_old_amendments_len + 1 THEN
    -- Verify that all previous amendments remain identical
    FOR v_idx IN 0..(v_old_amendments_len - 1) LOOP
      IF (NEW.amendments -> v_idx) <> (OLD.amendments -> v_idx) THEN
        RAISE EXCEPTION 'Prior amendments cannot be altered or removed.';
      END IF;
    END LOOP;

    -- Validate newly appended amendment structure
    v_latest_amendment := NEW.amendments -> (v_new_amendments_len - 1);
    IF v_latest_amendment ->> 'id' IS NULL OR trim(v_latest_amendment ->> 'id') = '' OR
       v_latest_amendment ->> 'amendedAt' IS NULL OR trim(v_latest_amendment ->> 'amendedAt') = '' OR
       v_latest_amendment -> 'amendedBy' IS NULL OR
       v_latest_amendment -> 'amendedBy' ->> 'id' IS NULL OR
       v_latest_amendment -> 'amendedBy' ->> 'name' IS NULL OR
       v_latest_amendment ->> 'amendmentText' IS NULL OR trim(v_latest_amendment ->> 'amendmentText') = '' THEN
      RAISE EXCEPTION 'Invalid ClinicalNoteAmendment structure. Required fields: id, amendedAt, amendedBy (id, name), amendmentText.';
    END IF;

    v_amendment_reason := v_latest_amendment ->> 'reason';
    IF v_amendment_reason NOT IN ('correction', 'late_entry', 'clinical_update') THEN
      RAISE EXCEPTION 'Invalid amendment reason: %. Must be correction, late_entry, or clinical_update.', v_amendment_reason;
    END IF;

    -- Strictly ensure that NO OTHER column in the record was modified!
    IF (to_jsonb(NEW) - '{amendments, version, updated_at}'::text[]) <>
       (to_jsonb(OLD) - '{amendments, version, updated_at}'::text[]) THEN
      RAISE EXCEPTION 'Cannot alter clinical content or metadata of a finalized record while adding an amendment.';
    END IF;

    NEW.version := OLD.version + 1;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
  END IF;

  -- Otherwise, ordinary mutations are strictly prohibited
  RAISE EXCEPTION 'Finalized clinical record cannot be modified. Amendments must be recorded via the governed amendment workflow.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_block_delete_finalized_record()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_finalized = true THEN
    RAISE EXCEPTION 'Cannot delete finalized clinical record. Finalized records are legally immutable.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply finalization triggers to the 5 finalized clinical record collections
-- 1. subjective_assessments
CREATE TRIGGER trg_subjective_finalization_guard
  BEFORE UPDATE ON subjective_assessments
  FOR EACH ROW EXECUTE FUNCTION trigger_protect_finalized_record();

CREATE TRIGGER trg_subjective_delete_guard
  BEFORE DELETE ON subjective_assessments
  FOR EACH ROW EXECUTE FUNCTION trigger_block_delete_finalized_record();

-- 2. objective_assessments
CREATE TRIGGER trg_objective_finalization_guard
  BEFORE UPDATE ON objective_assessments
  FOR EACH ROW EXECUTE FUNCTION trigger_protect_finalized_record();

CREATE TRIGGER trg_objective_delete_guard
  BEFORE DELETE ON objective_assessments
  FOR EACH ROW EXECUTE FUNCTION trigger_block_delete_finalized_record();

-- 3. clinical_sessions
CREATE TRIGGER trg_sessions_finalization_guard
  BEFORE UPDATE ON clinical_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_protect_finalized_record();

CREATE TRIGGER trg_sessions_delete_guard
  BEFORE DELETE ON clinical_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_block_delete_finalized_record();

-- 4. progress_records
CREATE TRIGGER trg_progress_finalization_guard
  BEFORE UPDATE ON progress_records
  FOR EACH ROW EXECUTE FUNCTION trigger_protect_finalized_record();

CREATE TRIGGER trg_progress_delete_guard
  BEFORE DELETE ON progress_records
  FOR EACH ROW EXECUTE FUNCTION trigger_block_delete_finalized_record();

-- 5. case_discharge_records
CREATE TRIGGER trg_discharge_finalization_guard
  BEFORE UPDATE ON case_discharge_records
  FOR EACH ROW EXECUTE FUNCTION trigger_protect_finalized_record();

CREATE TRIGGER trg_discharge_delete_guard
  BEFORE DELETE ON case_discharge_records
  FOR EACH ROW EXECUTE FUNCTION trigger_block_delete_finalized_record();

-- ----------------------------------------------------------------------------
-- SECTION 6: JUSTIFIED INDEXES
-- ----------------------------------------------------------------------------

-- Tenant & Foreign-Key Lookup Indexes
CREATE INDEX idx_patients_workspace ON patients(workspace_id);
CREATE INDEX idx_cases_workspace_patient ON cases(workspace_id, patient_id);
CREATE INDEX idx_cases_status ON cases(workspace_id, status);
CREATE INDEX idx_cases_archived ON cases(workspace_id, is_archived);

CREATE INDEX idx_threads_case ON clinical_threads(workspace_id, case_id);
CREATE INDEX idx_problems_case ON clinical_problems(workspace_id, case_id);
CREATE INDEX idx_goals_case ON clinical_goals(workspace_id, case_id);
CREATE INDEX idx_plans_case ON treatment_plans(workspace_id, case_id);
CREATE INDEX idx_selections_plan ON treatment_selections(workspace_id, treatment_plan_id);
CREATE INDEX idx_selections_case ON treatment_selections(workspace_id, case_id);

CREATE INDEX idx_sessions_case ON clinical_sessions(workspace_id, case_id);
CREATE INDEX idx_deliveries_session ON session_treatment_deliveries(workspace_id, session_id);
CREATE INDEX idx_progress_case ON progress_records(workspace_id, case_id);
CREATE INDEX idx_measurements_progress ON progress_measurements(workspace_id, progress_record_id);
CREATE INDEX idx_investigations_case ON clinical_investigations(workspace_id, case_id);

-- Audit Ledger Query Indexes
CREATE INDEX idx_audit_workspace_sequence ON audit_events(workspace_id, sequence ASC);
CREATE INDEX idx_audit_occurred_at ON audit_events(workspace_id, occurred_at DESC);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);

-- Human Identifier Fast Lookups
CREATE INDEX idx_patients_human_id ON patients(workspace_id, patient_number);
CREATE INDEX idx_cases_human_id ON cases(workspace_id, case_id);
