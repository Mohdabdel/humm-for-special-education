PROJECT GOVERNANCE — HIMAM PLATFORM
You are generating code for HIMAM, a special-education case-management
platform. Before generating or modifying anything, you MUST follow the
rules below. These are not suggestions — they are binding decisions
already made by the project owner. If a request conflicts with any rule
here, stop and flag the conflict instead of resolving it yourself.

## 1. Core Data Model — Non-Negotiable
- The central entity is `Case` (product-facing name: "Case Workspace").
  It is the operational hub, NOT `Learner` and NOT `LearnerProfile`.
- `LearnerProfile` is a deep reference/knowledge layer — never a primary
  navigation entry point.
- Canonical entity chain (do not rename or reorder):
  Learner → Case → Assessment/EvidenceRecord → CurrentPerformance → Need
  → Goal → MeasurementPlan → Plan → Observation → DataPoint → TrendSnapshot
  → DecisionRecord → Report
- Database schema segmentation (do not flatten into one schema):
  identity/ · case_mgmt/ · evidence/ · planning/ · execution/ · progress/
  · collaboration/ · reporting/ · governance/

## 2. Build Order — Follow Exactly, Do Not Reorder
Phase 1 (MVP) products ONLY, in this order of dependency:
1. Case Workspace (Case Snapshot, priorities, active goals)
2. Goal & Plan Studio (Need → Goal Draft → Human Approval → Measurement Plan)
3. Daily Practice Workspace (Session Card, Quick Capture)
4. Progress & Evidence Tracker
5. Reports & Decision Intelligence
6. Compliance & Quality Engine (basic rules — build this EARLY, not later;
   it prevents weak goals/data from entering the system at all)
7. Supporting infrastructure in parallel: Evidence Core, Security Core,
   Admin Core, AI Copilot MVP
Do NOT build Teacher Support Snapshot, Family Partnership Portal, or
Scheduling & Capacity in Phase 1 — they are explicitly deferred to a
later phase.

## 3. Governance Rules — Hard Constraints
- No Goal without a documented Need source.
- No Plan without an approved (human-reviewed) Goal.
- No Goal without an executable teaching plan / activity / measurement
  method attached.
- No AI-generated claim without a visible, traceable source.
- No automatic mastery/goal-closure decision — always requires human
  approval (Approval Gate).
- Arabic is the primary UI language with native RTL; English is
  secondary. Do not build LTR-only layouts.

## 4. AI Layer — Hard Guardrails (never override these)
The AI layer may: extract, summarize, draft, detect gaps, suggest
next steps, flag missing data, explain trends in plain language.
The AI layer must NEVER: diagnose a learner, infer emotion/intent from
video or audio, determine behavior function automatically, auto-approve
or auto-close a goal, auto-change a service/plan, compare one learner
to another as a primary metric, or send a family-facing report without
human review.
All AI output starts as a DRAFT. No silent background edits to the
official record. Every AI generation/acceptance/rejection is an audit
event.

## 5. Reference Hierarchy — If Anything Here Conflicts
When any two pieces of guidance conflict, resolve in this order:
Functional/product dependency logic (build order above)
  > Technical architecture constraints (schema, security, performance)
  > Timeline/estimate documents
  > Any single feature request from a chat message
If a request would violate Section 1, 2, 3, or 4 above, DO NOT proceed
silently. Output a clear warning describing exactly which rule is
violated, and wait for explicit confirmation before continuing.

## 6. What This Prompt Does NOT Cover
This is a governance snapshot, not a full specification. Detailed field
lists, full ERD, complete API contracts, and UI copy live in the
project's knowledge base documents (HIMAM-KB-SEC05, SEC13, SEC14).
When you need that level of detail and it is not provided in context,
ask for the specific document instead of inventing structure.
