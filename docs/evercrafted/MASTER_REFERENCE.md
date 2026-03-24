# Evercrafted Platform — Master Reference

Version 1.0 · Generated March 10, 2026

## Platform Overview

Evercrafted is an inventory-aware, emotion-driven wreath design platform built around one canonical **Blueprint Object** shared by all modules.

### Core Modules
- **Memory Weaver**: Turns memory prompts into emotionally-grounded wreath designs.
- **Inventory Weaver**: Produces feasible designs constrained to on-hand materials.
- **Design Studio**: Professional manual editing for zones, clusters, and exports.
- **Formula Registry**: 12 reusable composition presets.

### Product Tiers
| Tier | Price | Features |
|---|---:|---|
| Free | $0/mo | Limited Memory Weaver, preview only |
| Maker | $19/mo | Inventory generation, unlimited designs, SVG/PDF exports |
| Pro | $49/mo | Studio editing, advanced exports, API access |

---

## Canonical Blueprint Object

All modules must produce/consume this structure.

```json
{
  "blueprint_id": "bp_abc123xyz",
  "created_at": "2026-03-10T10:00:00Z",
  "version": "1.0",
  "metadata": {
    "user_id": "user_123",
    "source": "memory_weaver",
    "title": "Grandmother's Garden",
    "description": "Spring nostalgia wreath"
  },
  "base": {
    "type": "grapevine",
    "outer_diameter": 24,
    "inner_diameter": 10,
    "thickness": 2,
    "material_notes": "Natural grapevine, medium density"
  },
  "composition": {
    "style": "asymmetrical",
    "formula": "crescent",
    "visual_weight": "bottom_heavy",
    "negative_space": true
  },
  "zones": [],
  "elements": [],
  "scores": {
    "overall": 0.86
  },
  "build_instructions": [],
  "export_formats": {
    "svg_url": "https://storage.evercrafted.com/blueprints/bp_abc123xyz.svg",
    "pdf_url": "https://storage.evercrafted.com/blueprints/bp_abc123xyz.pdf",
    "json_url": "https://storage.evercrafted.com/blueprints/bp_abc123xyz.json"
  }
}
```

---

## Memory Weaver (Prototype)

### Goal
Convert emotional memory prompts into deterministic wreath blueprints.

### Pipeline
1. Analyze memory text for weighted emotions.
2. Map emotions to color families.
3. Pick floral symbols.
4. Select formula preset.
5. Run deterministic geometry placement.
6. Render + export SVG/PDF/JSON.

### Key API Routes
- `POST /api/memory/analyze`
- `POST /api/memory/generate`
- `GET /api/memory/{id}`

---

## Inventory Weaver (Prototype)

### Goal
Generate designs using only available inventory.

### Pipeline
1. Aggregate inventory by role.
2. Select formula that fits constraints.
3. Place elements with hard quantity checks.
4. Auto-adjust density/formula when constraints fail.
5. Return usage/depletion report.

### Key API Routes
- `GET /api/inventory`
- `POST /api/inventory`
- `PUT /api/inventory/{id}`
- `POST /api/inventory/generate`

---

## Formula Registry (12)

1. Crescent
2. Double Echo
3. Bottom Heavy
4. Side Sweep
5. Open Arc
6. Full Halo
7. Split Garden
8. Focal Burst
9. Laddered Rhythm
10. Radial Burst
11. Bow Anchor
12. Inventory Salvage

See `schemas/formula-library.json` for starter presets.

---

## Technical Architecture

### Frontend
- Next.js 14 + React + TypeScript
- Zustand state
- SVG/Canvas rendering
- Tailwind CSS

### Backend
- FastAPI (Python)
- NumPy geometry engine
- Deterministic placement algorithms
- Scoring functions

### Data
- PostgreSQL + JSON columns for blueprint payloads
- S3-compatible storage for exported artifacts

---

## Roadmap

### MVP (4 Weeks)
- Week 1: Auth, DB schema, inventory CRUD, basic canvas
- Week 2: Geometry engine, 3 formulas, zones, SVG render
- Week 3: Memory/Inventory generators, JSON export, scoring
- Week 4: UI polish, subscriptions, PDF guide, beta launch

### Post-MVP
- Q2: Full Studio + all formulas
- Q3: Blueprint marketplace
- Q4: DNA engine and parametric variation

---

## Included Artifacts
- `schemas/blueprint.schema.json`
- `schemas/inventory-item.schema.json`
- `schemas/formula-library.json`

These are starter artifacts derived from the master reference to speed implementation.
