# ADR 0001: Canonical deterministic blueprint contract

Status: Accepted for Gate 0 and Gate 1.

## Decision

Evercrafted Studio owns one versioned blueprint contract at `evercrafted.blueprint/1.0`. AI may interpret a client's story into an Essence, but deterministic code performs physical placement from a locked inventory snapshot.

The coordinate system is fixed: the wreath center is the origin; 0° is 12 o'clock; angles increase clockwise; physical +Y points up. Rendering must explicitly convert physical +Y to screen -Y. Every placement stores both polar and physical Cartesian anchors.

The deterministic identity is `(formulaId, formulaVersion, seed, essenceId, inventorySnapshotId)`. Identical inputs must produce byte-identical JSON. Blueprint revisions are immutable.

The first executable formula is `asymmetric_crescent@1.0.0`. It uses only active, in-stock SKUs from the locked inventory snapshot, preserves an absolute silence arc, creates odd-numbered focal clusters, and emits ordered foundation, body, focal, and finish passes.

## Gate behavior

A blueprint fails before rendering if it references missing inventory, violates stock, enters the silence arc, creates an even focal cluster, or detects a physical collision. Missing item geometry produces `NEEDS_REVIEW`, never an unearned pass.

Provider integrations, billing, Etsy synchronization, and generative rendering remain outside Gate 0/1.
