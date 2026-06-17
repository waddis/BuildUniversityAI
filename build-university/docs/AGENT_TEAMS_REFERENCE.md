# Agent Teams — Master Reference Guide

*BuildRight 3D internal reference for building effective agent teams with Claude Code.*
*Last updated: 2026-03-24*

---

## Quick Start

### 1. Enable Agent Teams

Add to your `settings.json` (or `.claude/settings.json`):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Requires Claude Code **v2.1.32+**. Check with `claude --version`.

### 2. Spawn a Team

Tell Claude in natural language:

```
Create an agent team with 3 teammates to [describe task].
- Teammate 1: [role and focus]
- Teammate 2: [role and focus]
- Teammate 3: [role and focus]
```

### 3. Navigate

- **Shift+Down** — cycle through teammates (in-process mode)
- **Ctrl+T** — toggle shared task list
- **Enter** — view a teammate's session
- **Escape** — interrupt a teammate's current turn

---

## When to Use Agent Teams vs Subagents

| Criteria | Use Agent Teams | Use Subagents |
|----------|----------------|---------------|
| Workers need to talk to each other | Yes | No |
| Tasks are independent, result-only | No | Yes |
| Complex multi-file parallel work | Yes | No |
| Quick focused lookup/research | No | Yes |
| Debugging competing hypotheses | Yes | No |
| Sequential dependent tasks | No | No (single session) |
| Token budget is tight | No | Yes |

**Rule of thumb:** If workers need to share findings, challenge each other, or coordinate — use teams. If you just need results back — use subagents.

---

## Architecture

```
                    +------------------+
                    |    Team Lead     |
                    | (your session)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+-----+ +-----+-----+ +-----+-----+
        | Teammate A | | Teammate B | | Teammate C |
        | (own ctx)  | | (own ctx)  | | (own ctx)  |
        +-----+-----+ +-----+-----+ +-----+-----+
              |              |              |
              +--------------+--------------+
                             |
                    +--------+---------+
                    |  Shared Task List |
                    |  + Mailbox System |
                    +------------------+
```

### Components

| Component | Role | Storage |
|-----------|------|---------|
| **Team Lead** | Creates team, spawns teammates, coordinates, synthesizes | Your main session |
| **Teammates** | Independent Claude Code instances with own context | `~/.claude/teams/{team-name}/config.json` |
| **Task List** | Shared work items: pending / in-progress / completed | `~/.claude/tasks/{team-name}/` |
| **Mailbox** | Direct messaging between any agents | Automatic delivery |

### What Teammates Inherit

- CLAUDE.md files (project context)
- MCP servers and skills
- Permission settings from lead
- Spawn prompt from lead

### What Teammates Do NOT Inherit

- Lead's conversation history
- Lead's in-progress context
- Other teammates' context

---

## Display Modes

| Mode | Setting | Requirements | Best For |
|------|---------|-------------|----------|
| **In-process** | `"in-process"` | Any terminal | Default, simple setup |
| **Split panes** | `"tmux"` | tmux or iTerm2 + it2 CLI | Seeing all teammates at once |
| **Auto** (default) | `"auto"` | Detects tmux session | Adapts to environment |

Configure in `settings.json`:

```json
{
  "teammateMode": "in-process"
}
```

Or per-session:

```bash
claude --teammate-mode in-process
```

---

## Task Management

### Task States

```
pending  -->  in_progress  -->  completed
   |
   +-- (blocked by dependency) --> unblocks when dependency completes
```

### Task Assignment

- **Lead assigns**: Tell lead which task goes to which teammate
- **Self-claim**: Teammates auto-pick next unassigned, unblocked task
- **File locking**: Prevents race conditions on simultaneous claims

### Task Sizing Guidelines

| Size | Problem | Recommendation |
|------|---------|----------------|
| Too small | Coordination overhead > benefit | Combine related items |
| Too large | Long work without check-ins, wasted effort risk | Split into deliverables |
| Right size | Self-contained, clear deliverable | One function, test file, or review |

**Target: 5-6 tasks per teammate** for optimal productivity.

---

## Communication

### Message Types

| Type | Use | Cost Impact |
|------|-----|-------------|
| **message** | Send to one specific teammate | Low |
| **broadcast** | Send to ALL teammates | High (scales with team size) |

### Automatic Notifications

- Teammates auto-notify lead when they finish/stop
- Messages delivered automatically (no polling)
- Task status updates visible to all agents

---

## Quality Gates with Hooks

### TeammateIdle Hook

Runs when a teammate is about to go idle. Exit code 2 sends feedback and keeps them working.

```json
{
  "hooks": {
    "TeammateIdle": [{
      "command": "your-check-script.sh",
      "description": "Verify teammate completed all assigned work"
    }]
  }
}
```

### TaskCompleted Hook

Runs when a task is being marked complete. Exit code 2 prevents completion with feedback.

```json
{
  "hooks": {
    "TaskCompleted": [{
      "command": "your-validation-script.sh",
      "description": "Verify task output meets quality standards"
    }]
  }
}
```

---

## Plan Approval Flow

For high-risk tasks, require teammates to plan before implementing:

```
Spawn an architect teammate to refactor the auth module.
Require plan approval before they make any changes.
```

**Flow:**

```
Teammate plans (read-only mode)
  --> Sends plan to lead
  --> Lead reviews
  --> Approved? --> Teammate implements
  --> Rejected? --> Teammate revises, resubmits
```

Influence approval criteria in your prompt:
- "Only approve plans that include test coverage"
- "Reject plans that modify the database schema"
- "Require error handling in every plan"

---

## Best Practices

### Team Composition

1. **Start with 3-5 teammates** — balances parallelism with coordination
2. **Give each a distinct role** — prevents overlap and wasted work
3. **Assign non-overlapping files** — two teammates editing the same file = overwrites

### Spawn Prompts

Write detailed spawn prompts. Teammates don't have your conversation history:

```
# BAD - too vague
Spawn a reviewer.

# GOOD - specific context
Spawn a security reviewer teammate with the prompt: "Review the
authentication module at src/auth/ for security vulnerabilities.
Focus on token handling, session management, and input validation.
The app uses JWT tokens stored in httpOnly cookies. Report any
issues with severity ratings."
```

### Monitoring

- Check in on progress regularly
- Redirect approaches that aren't working
- Tell the lead to wait for teammates if it starts implementing itself:
  ```
  Wait for your teammates to complete their tasks before proceeding
  ```

### Shutdown

1. Ask lead to shut down each teammate: `"Ask the researcher teammate to shut down"`
2. After all teammates stop, clean up: `"Clean up the team"`
3. **Always clean up from the lead** — never from a teammate

---

## BuildRight 3D — Agent Team Playbooks

These are proven team configurations for our specific project needs.

### Playbook 1: Feature Development

```
Create an agent team to build [feature name]:
- Frontend teammate: Build the React/Three.js UI components in src/components/
- Backend teammate: Create API routes in src/app/api/ and database queries in src/lib/db/
- Content teammate: Write curriculum data in src/lib/content/ and seed data
Each teammate owns their own files. No overlapping edits.
Use Sonnet for all teammates.
```

### Playbook 2: Parallel Research

```
Create an agent team to research [topic]:
- Teammate 1: Research [aspect A] — focus on [specific sources/areas]
- Teammate 2: Research [aspect B] — focus on [specific sources/areas]
- Teammate 3: Play devil's advocate — challenge findings from teammates 1 and 2
Have them discuss findings and converge on recommendations.
```

### Playbook 3: Code Review

```
Create an agent team to review the changes in [files/PR]:
- Security reviewer: Check for injection, auth bypass, data exposure
- Performance reviewer: Check for N+1 queries, unnecessary renders, bundle size
- Architecture reviewer: Check for separation of concerns, type safety, test coverage
Have them each report findings with severity ratings.
```

### Playbook 4: Bug Investigation

```
Users report [bug description]. Create an agent team:
- Hypothesis 1: [theory A] — investigate [specific area]
- Hypothesis 2: [theory B] — investigate [specific area]
- Hypothesis 3: [theory C] — investigate [specific area]
Have them actively try to disprove each other's theories.
Update findings as consensus emerges.
```

### Playbook 5: 3D + Curriculum Content Pipeline

```
Create an agent team to build lesson content for [module]:
- 3D teammate: Define mesh groups, camera presets, visibility sequences,
  and explode states in complex-house.ts
- Curriculum teammate: Write lesson steps, instructions, narration,
  and code references in curriculum.ts
- Review teammate: Validate that camera presets match mesh positions,
  hidden groups are correct, and code references are accurate.
  Require plan approval.
```

### Playbook 6: Cross-Layer Feature

```
Create an agent team to implement [feature] end-to-end:
- Database teammate: Create Supabase migration, RLS policies, and query functions
- API teammate: Build API routes that use the query functions
- UI teammate: Build React components that call the API routes
- Test teammate: Write tests for all layers. Require plan approval.
Tasks should have dependencies: DB first, then API, then UI, then tests.
```

---

## Limitations (as of v2.1.32+)

| Limitation | Workaround |
|-----------|------------|
| No session resumption for in-process teammates | Spawn new teammates after `/resume` |
| Task status can lag (teammates forget to mark complete) | Manually update or nudge via lead |
| Shutdown can be slow | Teammates finish current tool call first |
| One team per session | Clean up before starting new team |
| No nested teams | Teammates cannot spawn their own teams |
| Lead is fixed | Cannot promote teammate to lead |
| Permissions set at spawn | Change individual modes after spawning |
| Split panes need tmux/iTerm2 | Use in-process mode as fallback |
| No VS Code / Windows Terminal / Ghostty split panes | Use in-process mode |

---

## Token Cost Management

Agent teams use significantly more tokens than single sessions. Each teammate has its own context window.

| Strategy | Impact |
|----------|--------|
| Use Sonnet for teammates, Opus for lead | Lower cost, lead stays smart |
| Limit team to 3-5 members | Linear cost scaling |
| Use `message` not `broadcast` | Avoid n-way token multiplication |
| Size tasks at 5-6 per teammate | Reduce context switching overhead |
| Use subagents for simple lookups | Much cheaper for result-only tasks |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Teammates not appearing | Press Shift+Down; verify task complexity warrants a team |
| Too many permission prompts | Pre-approve common operations in permission settings |
| Teammates stopping on errors | Message them directly with new instructions, or spawn replacement |
| Lead implements instead of delegating | Tell it: "Wait for teammates to finish" |
| Orphaned tmux sessions | `tmux ls` then `tmux kill-session -t <name>` |
| Teammate editing wrong files | Be explicit about file ownership in spawn prompt |

---

## File Reference

```
~/.claude/teams/{team-name}/config.json    # Team config (members array)
~/.claude/tasks/{team-name}/               # Shared task list
~/.claude/settings.json                    # teammateMode, env vars
.claude/settings.json                      # Project-level settings
CLAUDE.md                                  # Loaded by all teammates
```
