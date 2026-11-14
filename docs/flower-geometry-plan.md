# Flower geometry and material review

## Agreed objective

Make every specimen recognizable and convincing from multiple views, while allowing artistic variation. Correct the geometry and its editing controls before auditioning realistic textures and procedural materials.

## Geometry and controls

- Audit curve equations, coordinate transforms, height contributions, parameter ranges, and their interactions before choosing repairs. A taller preset alone is not proof that height behaves correctly.
- Separate a petal's base-to-tip curve from its placement across the flower radius.
- Provide visual curve editors for petal side profile and radial height distribution, alongside useful numeric controls.
- Share primitives where appropriate; use flower-specific formulas and anatomy where the common model cannot represent a specimen faithfully.
- Address flower-head height, cupping, tip curl, undersides, petal attachment, and conspicuous intersections.
- Preserve the relatively successful Velvet Dahlia form while addressing its underside. Improve rose profiles and height, orchid structure, peony layering, lily structure, and chrysanthemum profile.
- Make bloom movement reversible through closed, open, and closed states, including the separate anatomy that currently barely retracts on Passion Flower.

## References

Existing references must be inspected and reused before requesting replacements. The repository contains chrysanthemum and peony shape references, numbered flower images and contact sheets, and a file named `dragon-flower.png` showing the filament-bearing flower discussed during the review. Reference filenames and species labels alone are not proof of a matching botanical form or view.

The user may supply an additional rose reference. Supplement missing profile and underside coverage with real-flower references, preserving the intended artistic character. Do not treat unrelated cultivars or stylized illustrations as interchangeable multi-view evidence.

## Visual acceptance

Compare each specimen against its reference target using consistent front, side, top, and low upward views. Front and side should reveal the characteristic profile; the low upward view should expose the underside and attachments. Use orthographic inspection views for consistent shape comparison.

Review is visual. Automated math and runtime checks support this review but do not certify botanical similarity. Also inspect a complete closed-to-open-to-closed bloom cycle for continuity, credible closure, and conspicuous intersections.

## Material phase

After geometry review, audition surface textures and WebGPU procedural materials on the repaired specimens. Choose appearances through visual comparison. Detailed material choices remain open until this phase.

## Implementation status

This document records the design discussion. Geometry and editor implementation has not started; the scope awaits the user's final shared-understanding confirmation under the grill-with-docs workflow.
