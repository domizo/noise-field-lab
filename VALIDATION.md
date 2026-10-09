# Validation

## Automated checks

- ESLint: passed
- Automated tests: 62 passed (56 numerical/geometry checks and 6 documentation checks)
- Vite production build: passed
- Source review: checked resource disposal, shader source conventions, flow update paths, finite-difference signs, sampler bounds, keyboard controls and reduced-motion initial state

The tests additionally cover both surfaces through 10,000 integration steps, unit normals, tangency, projection idempotence, degenerate inputs, second-order convergence, seam continuity, a nonzero surface-divergence counterexample, seeded replay, deterministic time sampling, pause and timeline bounds. The original tests cover seed reproducibility, gradient continuity, permutation periodicity, normalized layer identities, zero-strength warp, analytic curl signs, gradient cross, discrete divergence cancellation, finite results, midpoint integration, deterministic fixed-step replay and affine-field interpolation.

## Browser verification status

The previous release’s hosted screenshot confirmed animated torus rendering and an advancing timeline. In this revision animation is integrated into the four original modules; no separate animation tab remains. The mathematical and source checks pass, including algorithm-specific changes over time. A fresh hosting screenshot is checked after publication where available.

The optional interactive suite is `npm run test:browser`. Local preview networking is unavailable in the execution environment, and the private hosted site requires owner sign-in in the test browser. Complete click-through, all four module screenshots and mobile visual testing remain unverified. A hosting snapshot confirms only the rendered state it captures, not every interaction. Build and source tests do not substitute for browser tests.

## Performance design

Particle velocity uses a padded 33³/41³ grid and trilinear interpolation. Display controls preserve existing trajectories; field changes intentionally restart them. Particle count and trail-length changes recreate only particle buffers. There is no warm-up advance while paused. Static scenes redraw only after invalidation or camera changes. Pixel ratio is capped at 2. Reduced-motion preferences start playback paused.

The velocity cache and numerical integration add approximation. The app explains these limits, constant-speed normalization, raw magnitude coloring and boundary respawning in its expandable mathematics notes.

Animation reuses geometry buffers and caps updates at 30 Hz. Surface flow uses Cartesian midpoint/endpoint projection; simulation positions are exact to floating-point tolerance, with a small separate visual lift for legibility. Display updates preserve paths; surface changes and explicit particle restart clear them.

Integrated-animation tests verify time-zero equivalence with every original scalar algorithm, octave/warp/wood parameter response at nonzero time, cache bounds, vector evolution, temporal midpoint sampling, and time-varying surface constraints. Flow seeking intentionally resets particles rather than claiming historical replay. Renderer-independent geometry tests also verify finite updates, deterministic scrubbing, parameter response and buffer reuse on terrain, sphere and torus.

## Illustrated documentation

The guide at `public/docs/index.html` is linked from README and the application footer. Its mathematical descriptions were checked against the current scalar, vector, animation and surface modules. Six sampled SVG figures import those same math functions; `figure-manifest.json` records parameters, source hashes and sampling provenance. The seventh SVG is an original tangent-projection schematic, explicitly labelled as an explanation rather than a simulation screenshot.

All seven SVGs were rasterized with Inkscape and their pixels visually reviewed for legibility, labels, legends and clipping. Documentation tests check local links, section anchors, image accessibility text, SVG title/description elements and byte-for-byte deterministic regeneration. Browser rendering and mobile click-through of the HTML guide have not been verified in this environment; the image raster review does not replace those checks.

## Repository documentation

README presents the implemented noise constructions with controlled illustrations and links to the complete `docs/NOISE_GUIDE.md`. The Markdown guide includes the full explanation and all seven figures through repository-relative paths, without depending on the private hosted guide. Link tests resolve every relative Markdown asset, file and heading anchor. A read-only GitHub Actions workflow runs the same lint, test and production-build checks on pushes to main and pull requests. Its presence is not a claim that a remote run has passed.
