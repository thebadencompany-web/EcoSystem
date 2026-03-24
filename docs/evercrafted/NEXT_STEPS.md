# Evercrafted — What’s Next (Execution Plan)

This plan translates the v1.0 reference into an implementation sequence with clear deliverables.

## 1) Lock the Canonical Contract (Day 1)

### Deliverables
- Adopt `schemas/blueprint.schema.json` as the single API contract for all blueprint I/O.
- Add server-side validation middleware on blueprint create/update endpoints.
- Add client-side runtime validation before rendering in Studio.

### Acceptance Criteria
- Invalid payloads fail with structured 4xx validation errors.
- All generated payloads include required top-level sections.

---

## 2) Implement MVP Geometry Engine (Week 1)

### Deliverables
- Deterministic polar placement module:
  - angle/radius bounded by zone constraints
  - role-aware element placement
  - layer ordering strategy
- Seed formulas: `crescent`, `full_halo`, `focal_burst`.

### Acceptance Criteria
- Same input → same output blueprint.
- 100% of elements placed inside zone angle/radius limits.

---

## 3) Ship Inventory Weaver First (Week 1–2)

### Deliverables
- Inventory normalization and role bucketing.
- Constraint-aware generation endpoint (`POST /api/inventory/generate`).
- Usage report output (`qty_used`, `qty_remaining`, `times_makeable`).

### Acceptance Criteria
- No design uses more units than on-hand quantity.
- “Make again” calculation returns deterministic value from inventory remainder.

---

## 4) Add Memory Weaver Emotion Layer (Week 2)

### Deliverables
- Emotion extraction endpoint with strict schema output.
- Emotion→palette mapping table.
- Emotion/formula selection policy (serene→open/crescent, joyful→halo/burst, etc.).

### Acceptance Criteria
- LLM output constrained to known emotion taxonomy.
- Placement remains deterministic (no LLM placement coordinates).

---

## 5) Build Studio Editing Loop (Week 3)

### Deliverables
- Zone lock/unlock + angle/radius editing.
- Element move/rotate/scale interactions.
- Undo/redo history stack.

### Acceptance Criteria
- Edits produce valid blueprint schema after every operation.
- Exported blueprint round-trips cleanly back into Studio.

---

## 6) Exports + Production Artifacts (Week 4)

### Deliverables
- SVG layered export.
- PDF build instruction export.
- JSON export endpoint for canonical blueprint.

### Acceptance Criteria
- Export outputs are generated from the same in-memory blueprint object.
- Build instructions reference existing element SKUs and zones.

---

## 7) Quality Gates to Add Immediately

- Schema tests for all API endpoints returning blueprints.
- Property-based tests for geometry constraints.
- Golden snapshot tests for formula outputs.
- Cost/inventory regression tests for constrained generation.

---

## Suggested Immediate Sprint Backlog (Top 8)

1. Add backend JSON Schema validation for blueprint payloads.
2. Implement deterministic polar placement utility.
3. Add formula loader for `formula-library.json`.
4. Build inventory feasibility checker (`required <= available`).
5. Implement `/api/inventory/generate` with usage report.
6. Add emotion taxonomy + mapping table.
7. Implement `/api/memory/analyze` and `/api/memory/generate` skeletons.
8. Add SVG renderer using canonical blueprint coordinates.
