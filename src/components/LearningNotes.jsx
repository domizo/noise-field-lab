import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useLocale } from '../lib/locale-context.js';
export default function LearningNotes({
  lesson,
  params
}) {
  const {
    t
  } = useLocale();
  const [expanded, setExpanded] = useState(false);
  let what = lesson.what,
    idea = lesson.idea,
    formula = lesson.formula;
  if (lesson.id === 'flow' && params.flowType === 'gradient') {
    what = 'The gradient points in the direction of steepest increase of a scalar noise field. Particles tend to gather near local maxima, so this field can compress or expand.';
    idea = 'Each vector is built from three partial derivatives of one scalar field, approximated with centered finite differences. Its magnitude measures how quickly the field changes.';
    formula = 'velocity = ∇n = (∂n/∂x, ∂n/∂y, ∂n/∂z)';
  }
  if (lesson.id === 'flow' && params.flowType === 'cross') {
    what = 'The cross product of two gradients points along the intersection of their level surfaces. Particles trace paths that are perpendicular to both scalar gradients.';
    idea = 'For smooth scalar fields a and b, ∇a × ∇b is analytically divergence-free. Independent seeds give distinct fields; crossing a gradient with itself would give zero.';
    formula = 'velocity = ∇a × ∇b';
  }
  if (lesson.id === 'flow' && params.flowSurface !== 'volume') {
    what = t('The {surface} carries a tangential vector field. The ambient {field} field is projected onto the local tangent plane. Arrows and trails reveal paths that remain on the surface.', {
      surface: t(params.flowSurface),
      field: t(params.flowType === 'curl' ? 'curl' : params.flowType === 'cross' ? 'gradient-cross' : 'gradient')
    });
    idea = 'Remove the normal component: vₜ = v − n(n · v). Both the midpoint and final point of each integration step are reprojected onto the surface. Tangency does not imply surface incompressibility; projected curl is not guaranteed divergence-free.';
    formula = 'vₜ = v − n(n · v)     p(next) = projectSurface(RK2 step)';
  }
  return <><section className="learning-notes" aria-label={t("Learning notes")}><article><h2>{t("What you are seeing")}</h2><p>{t(what)}</p></article><article><h2>{t("Try this")}</h2><p className="try-text">{t(lesson.try)}</p><p className="animation-note">{t(lesson.id === 'flow' ? 'Play evolves the field and moves particles. Seeking restarts paths at that field time.' : 'Play animates this field. Pause, change parameters, or scrub time to compare the result.')}</p>{lesson.id === 'octaves' && <div className="octave-bands" aria-label={t("Relative octave weights")}>{Array.from({
            length: params.octaves
          }, (_, i) => <div key={i} title={t('Layer {layer}: frequency {frequency}, unnormalized weight {weight}', {
            layer: i + 1,
            frequency: (params.frequency * params.lacunarity ** i).toFixed(2),
            weight: (params.gain ** i).toFixed(3)
          })}><span style={{
              height: `${8 + params.gain ** i * 24}px`
            }} /><small>{i + 1}</small></div>)}</div>}</article><article className="idea"><h2>{t("The idea")}</h2><p>{t(idea)}</p><div className="formula">{t(formula)}</div></article></section><section className={`technical-notes ${expanded ? 'expanded' : ''}`}><button className="technical-trigger" aria-expanded={expanded} aria-controls="technical-content" onClick={() => setExpanded(!expanded)}>{t("A closer look: mathematics & limitations")}<ChevronDown size={15} /></button>{expanded && <div id="technical-content" className="technical-content"><div><h3>{t("A field, not a texture")}</h3><p>{t("The base function is seeded 3D gradient noise with quintic interpolation. Its 256-entry permutation repeats every 256 noise-coordinate units. Values are not guaranteed to reach a fixed \xB11 range. Terrain samples a horizontal slice; sphere displacement samples Cartesian coordinates so there is no UV seam.")}</p><p>{t("Billow uses an absolute-value transform. Ridged inverts that transform; it is not a ridged-multifractal implementation. These transforms can introduce sharp derivative changes.")}</p></div><div><h3>{t("Layers & coordinates")}</h3><p>{t("fBm sums noise layers with geometric frequency and amplitude changes, normalized by the sum of amplitude weights. \u201COctave\u201D strictly means a doubling of frequency; here, lacunarity is adjustable. The mesh has finite resolution, so very fine layers can alias.")}</p><p>{t("Warp strength is measured in noise-domain coordinates. The warp field uses a fixed frequency of 0.65 and three independently seeded channels. Wood is a radial sine pattern around the vertical axis with extra grain variation.")}</p></div><div><h3>{t("Flow is an approximation")}</h3><p>{t("Curl uses a three-component vector potential. Curl and gradient-cross fields are divergence-free in the smooth mathematical construction. The implementation uses centered finite differences, a padded 33\xB3 velocity grid (41\xB3 above frequency 1) with trilinear interpolation, and fixed 1/60-second midpoint integration. High frequencies increase derivative magnitudes and numerical error.")}</p><p>{t("Arrows use raw magnitude with a capped display length. Normalizing each particle velocity to a constant speed generally changes divergence. In volume mode, boundary respawning is a visualization aid, not a closed fluid simulation. Arrows and particles use the same evolving cached field. Interpolation smooths fine details, especially at high frequencies. Surface flow reprojects both midpoint and endpoint onto the exact sphere or torus. The normal component is removed after grid interpolation; this does not guarantee surface divergence-free flow. Simulation positions lie on the surface, while rendered arrows and trails are lifted by a small offset to avoid depth overlap.")}</p></div><div><h3>{t("Animation & surface flow")}</h3><p>{t("All four modules animate their selected field. Noise keeps the chosen gradient, billow or ridged transform; Octaves keeps every layer setting; Warp animates its full distorted terrain or wood pattern. Time moves sample coordinates along a smooth bounded path within the same three-dimensional field. It is not an extra noise dimension. Every module has a 60-second timeline with play, pause, speed, scrubbing and reset.")}</p><p>{t("The sphere radius is 2.45. The torus has major radius 2 and minor radius 0.75 around the vertical axis. Surface integration uses Cartesian coordinates, so it has no latitude-pole or angular-seam discontinuity. Closed-surface particles have no lifetime respawn. Flow scrubbing restarts seeded particles and clears trails at the selected field time; it is not a replay of earlier trajectories. Switching modules resets the clock to zero. Changing geometry, field settings, particle count or trail length resets paths. Arrow appearance and speed changes preserve them.")}</p></div><div className="references"><h3>{t("Read further")}</h3><a href="https://mrl.cs.nyu.edu/~perlin/paper445.pdf" target="_blank" rel="noreferrer">{t("Improving Noise \xB7 Ken Perlin")}<ExternalLink size={12} /></a><a href="https://www.pbr-book.org/3ed-2018/Texture/Noise" target="_blank" rel="noreferrer">{t("Noise \xB7 Physically Based Rendering")}<ExternalLink size={12} /></a><a href="https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf" target="_blank" rel="noreferrer">{t("Curl-Noise for Procedural Fluid Flow")}<ExternalLink size={12} /></a><p>{t(lesson.note)}</p><p>{t("Keyboard: focus the 3D view, use arrow keys to orbit, +/\u2212 to zoom, and Home to reset. All parameter controls also work with a keyboard.")}</p></div></div>}</section></>;
}
