# Independent specimens rather than cross-species morphing

The user explicitly removed the requirement that one species morph into another. Each specimen may therefore own different topology, petal families, counts, anatomical components, and bloom parameters. Share utilities where useful without imposing a common mesh or deformation model.

Selection initially switches specimens directly. A presentation fade may be added without blending species geometry. Bloom animation remains a reversible change within each specimen, including base-pivot growth scaling.

This supersedes any implicit cross-species morphing constraint in the existing implementation. It complements ADR 0001's separation of petal curvature and radial layout. The execution plan is `docs/species-rebuild-plan.md`, including optional realistic materials and photographic rendering.
