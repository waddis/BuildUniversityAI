# BuildRight 3D — CLAUDE.md
*Last updated: 2026-03-23 (session 2 — BIM editor pivot) — update this header every session*

## What This Project Is
BuildRight 3D is a parametric BIM editor + construction training platform. The building model is data-driven (Building > Level > Zone > Wall > Slab > Opening > Roof), geometry is derived from parameters, and every change is undoable. The same engine powers both **editing** (create/modify buildings) and **training** (step-by-step construction lessons, inspection challenges, quizzes).

**This is not a static 3D viewer. It is a parametric building editor that also teaches construction.**

**Goal: $100M exit. Built by William Addis + Claude.**

## Owner
- William Addis — founder, construction/insurance domain expert, public adjuster
- Email: william@resolutionclaims.org
- Company: Resolution Claims Consulting

## Product Promise
"Learn how a real house is built, in the correct order, with real code logic, through a fully interactive 3D house."

Every lesson answers five questions:
1. **What** is this part?
2. **Where** does it go?
3. **When** is it installed?
4. **Why** does code care?
5. **What fails** if it is wrong?

## Business Model
| Tier | Price | Seats |
|------|-------|-------|
| Crew | $19/mo | 1 |
| Company | $149/mo | 10 |
| Enterprise | $499/mo | Unlimited |

14-day free trial. Stripe subscriptions.

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript, React 19)
- **Styling:** Tailwind CSS v4 — dark theme, bg-[#080810], amber-500 accents
- **Database & Auth:** Supabase (PostgreSQL + RLS)
- **Payments:** Stripe (subscriptions, webhooks)
- **AI:** Anthropic Claude API (claude-opus-4-6) via @anthropic-ai/sdk
- **3D:** Three.js + React Three Fiber v9 + Drei
- **PDF:** jsPDF
- **Animations:** Framer Motion
- **Jurisdiction:** Custom geospatial service (ZIP → climate zone + wind + snow + code adoption)

## User Modes
- **Learn:** Guided step-by-step instruction through 3D model
- **Build:** User performs the sequence themselves
- **Inspect:** Identify code issues, missing flashing, wrong overlaps
- **Compare:** Side-by-side correct vs incorrect assemblies
- **Exploded Systems:** Separate house into systems (structure, sheathing, flashings, etc.)

## Construction Phases (ordered)
1. site_prep → 2. excavation → 3. foundation → 4. framing_floor → 5. framing_walls → 6. framing_roof → 7. sheathing → 8. dry_in → 9. windows_doors → 10. wrb_cladding → 11. mep_rough → 12. insulation → 13. drywall_finishes → 14. final_inspection

## MVP Scope: Complex Roof + Envelope Academy
**One flagship complex house** (multiple gables, valleys, dormers, turret, porch tie-ins, garage, chimney intersection, dead-valley risk areas, multiple pitches, realistic drainage challenges).

### MVP Modules
1. **Complex Roof Geometry & Framing** (7 lessons) — gables, ridges, valleys, dormers, turret, intersections, load paths
2. **Dry-In & Waterproofing** (9 lessons) — sheathing sequence, underlayment, ice barrier, valley metal, drip edge, step flashing, kickout, chimney, dead valleys
3. **Exterior Drainage Plane** (4 lessons) — WRB, window flashing, door thresholds, cladding clearances

### MVP Modes
- Learn, Inspect, Compare

### MVP Viewer Features
- Orbit, pan, zoom
- Isolate/hide assemblies
- Exploded layers
- Cutaway/section view
- Click hotspots
- Step playback
- Wrong/right toggle
- Failure overlays

## 7 Core Systems
1. **Auth & Profiles** — Supabase auth, roles (admin/editor/learner), organizations
2. **Curriculum Engine** — phases, modules, lessons, prerequisites, progress
3. **3D Assembly Engine** — house models, assembly hierarchies, visibility groups, camera presets, hotspots
4. **Lesson Engine** — steps, sequencing, prompts, validation, playback
5. **Code & Reference Engine** — IRC/IBC/ASCE/ASTM references, jurisdiction notes, glossary
6. **Failure Mode Engine** — incorrect variants, leak outcomes, defect explanations, claim relevance
7. **Progress & Analytics** — completion, quiz results, mistake tracking

## Project Structure
```
src/
  core/                              # BIM ENGINE (parametric source of truth)
    schema/types.ts                  # Data model: Building>Level>Zone>Wall>Slab>Opening>Roof>Assembly
    schema/defaults.ts               # Default building factory (30x24 rectangle, 4 walls)
    commands/types.ts                # Command pattern: AddNode, RemoveNode, UpdateNode, MoveWallEndpoint
    stores/sceneStore.ts             # Zustand: scene graph, undo/redo (50-deep), selection
    stores/viewerStore.ts            # Zustand: camera, display mode (stacked/exploded/solo), wireframe, x-ray
    stores/editorStore.ts            # Zustand: active tool, panel state, snap, training mode
    geometry/wallGeometry.ts         # Derive Three.js geometry from parametric Wall + Level
    geometry/slabGeometry.ts         # Derive Three.js geometry from parametric Slab + Level
  viewer/                            # 3D RENDERING (React Three Fiber)
    canvas/SceneCanvas.tsx           # R3F Canvas — lighting, grid, shadows, orbit, gizmo
    renderers/SceneRenderer.tsx      # Renders scene graph: WallMesh, SlabMesh (selected/hovered state)
    selection/SelectionManager.tsx   # Raycaster click/hover → Zustand selection
  app/
    page.tsx                         # Landing page
    editor/page.tsx                  # Full-screen BIM editor (toolbar + tree + viewport + inspector)
    lesson/[slug]/page.tsx           # Lesson player (3D + steps + code refs)
    inspect/[slug]/page.tsx          # Inspection challenge (find defects)
    quiz/[slug]/page.tsx             # Quiz mode (MC + T/F + scoring)
    learn/                           # Curriculum browser (phase → module → lesson)
    admin/                           # Admin CMS (5 CRUD sections)
    dashboard/page.tsx, login/page.tsx
    api/                             # 7 API routes (Claude, Stripe, Jurisdiction, Exam)
  components/
    editor/Toolbar.tsx               # Tool selector, add/delete, undo/redo, display modes, view toggles
    editor/HierarchyTree.tsx         # Scene graph tree with selection + type icons
    editor/Inspector.tsx             # Property editor for selected node (Wall, Level, generic)
    ui/AdminTable.tsx, FormField.tsx  # Shared admin components
    3d/SceneViewer.tsx               # Legacy Three.js viewer (lesson/inspect modes)
    lesson/LessonPlayer.tsx          # Lesson orchestrator
    lesson/StepPanel.tsx, StepTimeline.tsx, CodeDrawer.tsx, ViewerToolbar.tsx, QuizPanel.tsx
  lib/
    3d/complex-house.ts              # Static complex house model (100+ meshes, 23 groups)
    db/queries.ts, db/admin.ts       # Supabase query layers
    supabase/, claude/, jurisdiction/  # Infrastructure
    stitch/client.ts                 # Stitch by Google SDK client (UI generation)
  types/index.ts                     # Supabase-mapped types
```

## BIM Architecture (Pascal-inspired)
- **Parametric objects are the source of truth** — geometry is DERIVED, never stored
- **Command pattern** — every mutation goes through a Command with execute/undo
- **3 Zustand stores**: sceneStore (graph + undo), viewerStore (camera + display), editorStore (tools + panels)
- **Scene graph**: Building → Level → Zone → Wall/Slab → Opening
- **Display modes**: stacked (normal), exploded (levels separated), solo (one level)
- **Training mode**: locks editing, enables lesson step playback through same viewer

## Database Tables (19)
profiles, organizations, organization_members, house_models, house_model_versions, assemblies, assembly_dependencies, modules, lessons, lesson_steps, hotspots, code_references, assembly_code_references, failure_modes, quizzes, user_progress, user_step_progress, glossary_terms, media_assets

## Assembly Object Structure
Each assembly carries: id, name, category, system, phase, subphase, mesh_key, install_order, visibility_group, parent hierarchy, dependencies, code references, failure modes, hotspots, metadata (common_mistakes, inspection_notes, glossary_terms, narration_script, labels)

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_CREW_PRICE_ID=...
STRIPE_COMPANY_PRICE_ID=...
STRIPE_ENTERPRISE_PRICE_ID=...
ANTHROPIC_API_KEY=...
STITCH_API_KEY=...              # Stitch by Google — UI generation
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Design Rules
- Light theme: bg-[var(--surface)] (#f9f9fb)
- Primary: #004e9f (blue), gradient-primary for CTAs
- Surface hierarchy: --surface, --surface-low, --surface-high, --elevated
- Glass panels with shadow-ambient, shadow-ambient-sm
- Text: var(--on-surface) with opacity levels (opacity-40, opacity-35, opacity-25)
- Cards: bg-white, shadow-ambient-sm, rounded-2xl
- Rounded corners: rounded-xl or rounded-2xl
- No emojis in UI
- Framer Motion for animations
- Apple/Stitch-inspired design system
- Full-screen layout for lesson/inspect views (fixed inset-0)

## Jurisdiction Service (LIVE)
ZIP → ASCE 7 wind speed → DOE climate zones → state code adoptions → special jurisdictions (HVHZ, NYC, CA-WUI, TX-TDI, WI-UDC)

## Commands
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npx tsc --noEmit # Type check
```

## Build Order (from spec)
1. ~~Scaffold app foundation~~ DONE
2. ~~Build data model (schema + types + query layer)~~ DONE
3. ~~Build admin CRUD (modules, lessons, assemblies, code refs, failure modes)~~ DONE
4. ~~Build lesson player shell (3D viewer + side panel + step navigation)~~ DONE
5. ~~Integrate 3D viewer with complex house model~~ DONE
6. ~~Wire lessons to model visibility/camera/explode + code refs~~ DONE
7. ~~Add inspect mode and quiz mode~~ DONE
8. ~~BIM editor: schema, commands, stores, viewer, tree, inspector, toolbar~~ DONE
9. Refine UX and content pipeline

## Non-Negotiable Principles
1. Real sequence matters more than pretty visuals
2. Hidden layers matter more than finished appearance
3. Code and failure logic must be attached to assemblies, not separate articles
4. The complex roof is the hero
5. Everything should be reusable and data-driven
6. The product should teach field judgment, not just terminology

## Workflow Rules

### CLAUDE.md is Living Documentation
- Update after every meaningful action — not just at end of session
- Future Claude reads ONLY this file. If it's not here, it doesn't exist.

### Planning
- Enter plan mode for ANY task with 3+ steps
- Check in with William before starting non-trivial tasks

### Verification
- Never mark a task complete without proving it works
- Run build/typecheck, check logs, demonstrate correctness

### Code Quality
- Simplicity first, minimal code impact
- No temporary fixes — find root causes
- React hooks before conditional returns
- Data-driven content, not hardcoded

## What's Next
- [ ] Wire wall drawing tool (click to place wall endpoints in viewport)
- [ ] Add opening placement (windows/doors in walls)
- [ ] Add roof generation from wall outlines (parametric pitch/overhang)
- [ ] Add snap-to-grid and snap-to-endpoint
- [ ] Connect editor scene graph to lesson system (training mode toggle)
- [ ] Add 2D plan view mode (top-down, walls as lines)
- [ ] Add section view (cut through building)
- [ ] Local save/load (IndexedDB)
- [ ] Seed MVP content into Supabase
- [ ] Wire Supabase auth to login page
- [ ] Deploy to Vercel
