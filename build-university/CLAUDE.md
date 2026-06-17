# BuildRight 3D — CLAUDE.md
*Last updated: 2026-03-24 — dark theme audit cleanup, CLAUDE.md rewrite*

## What This Project Is
BuildRight 3D is a 3D construction training platform. Users learn how buildings are constructed through interactive 3D lessons, inspection challenges, and quizzes — all tied to real building code (IRC/IBC/ASCE/ASTM) and real construction sequencing.

**This is NOT an editor or BIM tool. It is a training platform that teaches construction through a fully interactive 3D house.**

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
| Crew | $49/mo | 1 |
| Company | $199/mo | 10 |
| Enterprise | Custom | Unlimited |

14-day free trial. Stripe subscriptions.

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript, React 19)
- **Styling:** Tailwind CSS v4 — "Architectural Void" dark theme, bg-[#131313], #FF8C00 orange accents, Space Grotesk + Inter
- **Database & Auth:** Supabase (PostgreSQL + RLS)
- **Payments:** Stripe (subscriptions, webhooks)
- **AI:** Anthropic Claude API (claude-opus-4-6) via @anthropic-ai/sdk
- **3D:** Three.js + React Three Fiber v9 + Drei
- **PDF:** jsPDF
- **Animations:** Framer Motion
- **Jurisdiction:** Custom geospatial service (ZIP -> climate zone + wind + snow + code adoption)

## User Modes
- **Learn:** Guided step-by-step instruction through 3D model
- **Build:** User performs the sequence themselves
- **Inspect:** Identify code issues, missing flashing, wrong overlaps
- **Compare:** Side-by-side correct vs incorrect assemblies
- **Exploded Systems:** Separate house into systems (structure, sheathing, flashings, etc.)

## Construction Phases (ordered)
1. site_prep -> 2. excavation -> 3. foundation -> 4. framing_floor -> 5. framing_walls -> 6. framing_roof -> 7. sheathing -> 8. dry_in -> 9. windows_doors -> 10. wrb_cladding -> 11. mep_rough -> 12. insulation -> 13. drywall_finishes -> 14. final_inspection

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
  app/
    page.tsx                           # Landing page
    layout.tsx                         # Root layout
    error.tsx                          # Error boundary
    login/page.tsx                     # Login page
    dashboard/page.tsx                 # User dashboard
    lesson/[slug]/page.tsx             # Lesson player (3D + steps + code refs)
    inspect/[slug]/page.tsx            # Inspection challenge (find defects)
    quiz/[slug]/page.tsx               # Quiz mode (MC + T/F + scoring)
    learn/                             # Curriculum browser (phase -> module -> lesson)
      page.tsx
      [phase]/page.tsx
      [phase]/[module]/page.tsx
    train/                             # Training flow
      page.tsx, layout.tsx
      [moduleSlug]/page.tsx
      [moduleSlug]/[lessonSlug]/page.tsx, error.tsx
    admin/                             # Admin CMS (5 CRUD sections)
      layout.tsx, page.tsx
      models/page.tsx
      assemblies/page.tsx
      lessons/page.tsx
      code/page.tsx
      failure-modes/page.tsx
    commercial/page.tsx                # Commercial roofing content
    damage/page.tsx, [id]/page.tsx     # Damage assessment
    api/
      claude/chat/route.ts             # Claude AI chat
      claude/lesson/route.ts           # Claude AI lesson generation
      exam/generate/route.ts           # AI exam generation
      exam/grade/route.ts              # AI exam grading
      jurisdiction/route.ts            # ZIP -> jurisdiction lookup
      stitch/route.ts                  # Stitch UI generation
      stripe/checkout/route.ts         # Stripe checkout
      stripe/webhook/route.ts          # Stripe webhooks
  components/
    3d/
      SceneViewer.tsx                  # Three.js 3D viewer (lesson/inspect modes)
      CalloutOverlay.tsx               # 3D callout labels
      DamageDetailViewer.tsx           # Damage visualization
    lesson/
      LessonPlayer.tsx                 # Lesson orchestrator
      StepPanel.tsx                    # Step content panel
      StepTimeline.tsx                 # Step navigation
      CodeDrawer.tsx                   # Code reference drawer
      ViewerToolbar.tsx                # Viewer controls toolbar
      QuizPanel.tsx                    # Quiz engine
    ui/
      AdminTable.tsx                   # Reusable admin data table
      FormField.tsx                    # Reusable form input
      AppSidebar.tsx                   # App navigation sidebar
      TopNav.tsx                       # Top navigation bar
  lib/
    3d/
      complex-house.ts                 # Static complex house model (100+ meshes, 23 groups)
      commercial-hotel.ts              # Commercial hotel model
      commercial-roofs.ts              # Commercial roof types
      commercial-details.ts            # Commercial detail views
    db/queries.ts                      # Supabase query layer
    db/admin.ts                        # Admin CRUD operations
    content/curriculum.ts              # Curriculum data
    content/damage-scenarios.ts        # Damage scenario data
    supabase/client.ts, server.ts      # Supabase client setup
    claude/client.ts                   # Anthropic Claude client
    jurisdiction/                      # Jurisdiction lookup service
      index.ts, types.ts, climate-zones.ts, special.ts, state-adoptions.ts
    stitch/client.ts                   # Stitch by Google SDK client
    utils.ts                           # Shared utilities
  middleware.ts                        # Auth middleware
  types/index.ts                       # Supabase-mapped types
```

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

## Design Rules — "Architectural Void" Dark Theme
- Background: #131313 (deep charcoal, NOT pure black)
- Surfaces: --surface (#131313), --surface-low (#1c1b1b), --surface-container (#201f1f), --surface-high (#2a2a2a), --surface-highest (#353534)
- Primary: #FF8C00 (construction orange) — CTAs, active states, gradient-primary (#FF8C00 -> #ffb77d)
- Primary glow text: #ffb77d (warm amber)
- Secondary (data): #82CFFF (blueprint blue)
- Tertiary: #ADCBDA (cool grey-blue)
- On-surface text: #e5e2e1 (warm off-white, NEVER pure white) with opacity levels (/40, /35, /30)
- Ghost borders: rgba(86,67,52,0.15) via `box-shadow: inset 0 0 0 1px` — NO `border` classes, NO `border-white/8`
- Glass panels: rgba(42,42,42,0.7) + backdrop-blur 20px
- Shadows: on-surface at 4% opacity, 32px blur
- Headlines/labels: Space Grotesk (font-headline, font-label classes)
- Body: Inter
- Cards: bg-[#201f1f], rounded-2xl, ghost border via inset box-shadow
- Buttons: bg-[#FF8C00] text-[#131313], hover:opacity-90 — NOT bg-amber-500/text-black
- No emojis in UI
- Framer Motion for animations
- Full-screen layout for lesson/inspect views (fixed inset-0)

## Jurisdiction Service (LIVE)
ZIP -> ASCE 7 wind speed -> DOE climate zones -> state code adoptions -> special jurisdictions (HVHZ, NYC, CA-WUI, TX-TDI, WI-UDC)

## Damage Library — Independent Adjuster Training (`/damage`)
JigSpace-style 3D damage scenarios. `DamageDetailViewer.tsx` is a phase machine:
**walkthrough → find → scope → terms → complete**. Each phase is OPTIONAL per scenario —
a scenario with only `stops`/`annotations` is a plain walkthrough (regression canaries:
`roof-blistering`, `soft-metal-damage`).
- Scenario data: `src/lib/content/damage-scenarios.ts` — `DamageScenario` carries
  `findChallenge` (click targets), `scopeSheet` (graded estimate line items),
  `glossary` (terminology drill).
- Shared adjuster glossary: `src/lib/content/hail-glossary.ts` — `pickGlossary(ids)`.
- 4 residential hail scenarios live: roof, windows & doors, siding & exterior, mechanicals & site.
- **Visible damage marks:** `makeDamageMark()` builds procedural 3D marks (`hail-bruise`,
  `dent`, `crack`, `crushed`, `spatter`, `puncture`, `ring`) from a `damageType` + `facing`
  on each annotation/`FindTarget`. Marks render on the house AND are the find-phase click
  target (raycast directly, no radius math). `facing` orients them flush — `roof-front`
  uses the 8/12 pitch (`ROOF_SLOPE`). All mark fields are OPTIONAL (fallback = `ring`).
- Scene is a daylight outdoor environment (sky-gradient dome, sun + sky hemisphere).
- Find phase has hover cursor/glow + a Hint button; every phase opens with an intro card.
- Mark positions must align to real `complex-house.ts` mesh coords (8/12 roof, +Z front).

## Construction Walkthroughs (`/build`)
`DamageDetailViewer.tsx` is a general cinematic engine — `/build` reuses it for
"how it goes together" sequences. `CinematicStop.visibleGroups` (optional) overrides
the scenario's visibility per stop, so the model reveals **layer-by-layer** as the
camera flies. A per-stop `useEffect` owns walkthrough mesh visibility; damage scenarios
omit `visibleGroups` and fall back to `scenario.visibleGroups` (no regression).
- Content: `src/lib/content/build-sequences.ts` — `ROOF_CONSTRUCTION` (`getBuildSequence(id)`,
  `ALL_BUILD_SEQUENCES`). Reuses the `DamageScenario` type; walkthrough-only (no find/scope/terms).
- `ROOF_CONSTRUCTION` = 10 cumulative stops, framing → finished (gable structure → deck →
  underlayment → ice barrier → drip edge → valley metal → step flashing → ridge cap →
  fascia/gutters → finished). Roof weatherproofing layers are a peeled-back teaching diagram
  in `complex-house.ts`, not physically nested — narration covers the true install order.
- Routes: `src/app/build/page.tsx` (index) + `src/app/build/[id]/page.tsx` (viewer).

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
8. ~~Dark theme audit — migrate all pages to Architectural Void~~ DONE
9. Seed MVP content into Supabase
10. Wire Supabase auth to login page
11. Deploy to Vercel

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
- [ ] Seed MVP content into Supabase
- [ ] Wire Supabase auth to login page
- [ ] Deploy to Vercel
- [ ] Add commercial roofing training modules
- [x] Damage library — adjuster training (walkthrough/find/scope/terms phases, 4 residential hail scenarios)
- [ ] Damage library — persist phase scores to `user_progress`; add commercial + wind/water scenarios
- [ ] Content pipeline for lesson creation
