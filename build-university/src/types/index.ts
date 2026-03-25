// ============================================================================
// BuildRight 3D — Core TypeScript Types
// Maps 1:1 to Supabase schema
// ============================================================================

// ── Enums ──
export type UserRole = 'admin' | 'editor' | 'learner'
export type OrgType = 'company' | 'school' | 'enterprise'
export type SubscriptionTier = 'crew' | 'company' | 'enterprise'
export type Complexity = 'simple' | 'intermediate' | 'complex' | 'expert'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type LessonType = 'learn' | 'inspect' | 'compare' | 'build' | 'quiz'
export type ActionType = 'observe' | 'click' | 'identify' | 'sequence' | 'quiz' | 'compare'
export type HotspotType = 'info' | 'warning' | 'failure' | 'inspection' | 'code'
export type DependencyType = 'required' | 'recommended' | 'sequential'
export type Severity = 'minor' | 'moderate' | 'severe' | 'critical'
export type FailureCategory = 'workmanship' | 'material' | 'design' | 'environmental' | 'sequencing'
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'
export type MediaType = 'image' | 'video' | '3d_model' | 'audio' | 'document'
export type CodeRelevance = 'primary' | 'related' | 'advisory'

// ── Construction Phases (ordered) ──
export const CONSTRUCTION_PHASES = [
  'site_prep',
  'excavation',
  'foundation',
  'framing_floor',
  'framing_walls',
  'framing_roof',
  'sheathing',
  'dry_in',
  'windows_doors',
  'wrb_cladding',
  'mep_rough',
  'insulation',
  'drywall_finishes',
  'final_inspection',
] as const
export type ConstructionPhase = typeof CONSTRUCTION_PHASES[number]

// ── Building Systems ──
export const BUILDING_SYSTEMS = [
  'roof', 'wall', 'foundation', 'floor', 'ceiling',
  'mep', 'insulation', 'cladding', 'waterproofing', 'structural',
] as const
export type BuildingSystem = typeof BUILDING_SYSTEMS[number]

// ── Users & Orgs ──
export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  type: OrgType
  stripe_customer_id: string | null
  subscription_tier: SubscriptionTier | null
  subscription_status: string
  max_seats: number
  created_at: string
}

// ── House Models ──
export interface HouseModel {
  id: string
  slug: string
  title: string
  description: string | null
  complexity_level: Complexity
  active_version: number
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface HouseModelVersion {
  id: string
  house_model_id: string
  version: number
  model_manifest: Record<string, unknown>
  published_at: string | null
  created_at: string
}

// ── Assemblies ──
export interface Assembly {
  id: string
  house_model_version_id: string
  parent_id: string | null
  slug: string
  name: string
  category: string
  system: string
  phase: string
  subphase: string | null
  mesh_key: string | null
  install_order: number
  visibility_group: string | null
  metadata: AssemblyMetadata
  created_at: string
}

export interface AssemblyMetadata {
  common_mistakes?: string[]
  inspection_notes?: string[]
  glossary_terms?: string[]
  narration_script?: string
  labels?: string[]
  [key: string]: unknown
}

export interface AssemblyDependency {
  id: string
  assembly_id: string
  depends_on_assembly_id: string
  dependency_type: DependencyType
}

// ── Curriculum ──
export interface Module {
  id: string
  slug: string
  title: string
  description: string | null
  phase: string
  track: string
  order_index: number
  difficulty: Difficulty
  estimated_hours: number | null
  icon_name: string | null
  status: ContentStatus
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  slug: string
  title: string
  objective: string | null
  description: string | null
  difficulty: Difficulty
  lesson_type: LessonType
  house_model_id: string | null
  duration_minutes: number | null
  order_index: number
  prerequisite_lesson_id: string | null
  status: ContentStatus
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface LessonStep {
  id: string
  lesson_id: string
  step_number: number
  title: string
  instruction: string | null
  narration: string | null
  action_type: ActionType
  target_assembly_ids: string[]
  camera_preset: CameraPreset | null
  exploded_state: ExplodedState | null
  hidden_groups: string[]
  highlighted_groups: string[]
  code_reference_ids: string[]
  validation_rule: ValidationRule | null
  config: Record<string, unknown>
  created_at: string
}

// ── 3D Viewer Types ──
export interface CameraPreset {
  position: [number, number, number]
  target: [number, number, number]
  fov?: number
  transition_duration?: number
}

export interface ExplodedState {
  offset: number        // how far apart layers are pulled
  groups?: string[]     // which groups to explode
  axis?: 'x' | 'y' | 'z'
}

export interface ValidationRule {
  type: 'click_target' | 'select_order' | 'identify_issue' | 'answer'
  expected: string | string[]
  feedback_correct?: string
  feedback_incorrect?: string
}

// ── Hotspots ──
export interface Hotspot {
  id: string
  assembly_id: string
  label: string
  hotspot_type: HotspotType
  position: { x: number; y: number; z: number }
  content: HotspotContent
  created_at: string
}

export interface HotspotContent {
  title?: string
  body?: string
  media_url?: string
  code_reference_id?: string
  failure_mode_id?: string
}

// ── Code References ──
export interface CodeReference {
  id: string
  code_family: string
  code_section: string
  title: string
  short_summary: string
  long_explanation: string | null
  jurisdiction_scope: string | null
  climate_scope: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

// ── Failure Modes ──
export interface FailureMode {
  id: string
  assembly_id: string
  title: string
  description: string
  severity: Severity
  category: FailureCategory
  visual_state: Record<string, unknown> | null
  inspection_notes: string | null
  consequence_notes: string | null
  prevention_notes: string | null
  claim_relevance: string | null
  media_urls: string[]
  created_at: string
}

// ── Quizzes ──
export interface Quiz {
  id: string
  lesson_id: string
  title: string
  passing_score: number
  config: QuizConfig
  created_at: string
}

export interface QuizConfig {
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'identify' | 'sequence'
  options?: string[]
  correct_answer: string | number | number[]
  explanation?: string
  assembly_id?: string
  media_url?: string
}

// ── User Progress ──
export interface UserProgress {
  id: string
  user_id: string
  lesson_id: string
  status: ProgressStatus
  started_at: string | null
  completed_at: string | null
  score: number | null
  time_spent_seconds: number
  created_at: string
  updated_at: string
}

// ── Glossary ──
export interface GlossaryTerm {
  id: string
  term: string
  slug: string
  definition: string
  related_terms: string[]
  media_url: string | null
  created_at: string
}

// ── Organization Members ──
export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

// ── User Step Progress ──
export interface UserStepProgress {
  id: string
  user_id: string
  lesson_step_id: string
  status: ProgressStatus
  attempts: number
  completed_at: string | null
}

// ── Media ──
export interface MediaAsset {
  id: string
  type: MediaType
  storage_path: string
  title: string | null
  alt_text: string | null
  metadata: Record<string, unknown>
  created_at: string
}
