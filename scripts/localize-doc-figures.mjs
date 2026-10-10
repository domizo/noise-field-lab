#!/usr/bin/env node
/**
 * Japanese localization of Noise Field Lab documentation figures.
 * Run from the repository: node scripts/localize-doc-figures.mjs
 * Writes only public/docs/images/ja; never changes the English figures or generator.
 * Options: --in <English SVG directory> --out <Japanese output directory>
 *          --generator <English generator file> --check
 * --check verifies committed Japanese SVGs and manifest without writing files.
 * No dependencies, timestamps, network requests, or numerical resampling.
 * After intentionally changing an English label, review its Japanese translation
 * and update the expected label-stream hash; unreviewed changes fail closed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const VERSION = 1;
const FONT_FAMILY = 'Noto Sans CJK JP, Noto Sans JP, Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, Arial, sans-serif';
const KNOWN_FONTS = new Set(['Arial, Helvetica, sans-serif', 'DejaVu Sans,Arial,sans-serif']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const unescapeXml = value => value.replace(/&(?:quot|apos|lt|gt|amp|#\d+|#x[\da-fA-F]+);/g, entity => {
  const named = {'&quot;':'"', '&apos;':"'", '&lt;':'<', '&gt;':'>', '&amp;':'&'};
  return named[entity] ?? String.fromCodePoint(entity.startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10));
});
const labelPattern = /<(title|desc|text)\b([^>]*)>([^<]*)<\/\1>/g;
const labelStream = svg => [...svg.matchAll(labelPattern)].map(([,tag,,content]) => [tag, unescapeXml(content)]);
const drawingMarkup = svg => svg
  .replace(/<(title|desc|text|metadata)\b[^>]*>[\s\S]*?<\/\1>/g, '')
  .replace(/font-family="[^"]*"/g, 'font-family="PRESENTATION_FONT"')
  .replace(/ (?:xml:)?lang="ja"/g, '');

const FIGURES =
{
  "noise-algorithms.svg": {
    "sourceLabelsSha256": "3818d4abdcd64a685980e9b339b1f86836473ab3882fd7c5bcb648280e119876",
    "sourceKind": "deterministic sampled scientific figure",
    "translations": {
      "Sample range: -0.8 to 0.7": "標本値の範囲：-0.8 ～ 0.7",
      "Sample range: -0.7 to 0.89": "標本値の範囲：-0.7 ～ 0.89",
      "Sample range: -0.89 to 0.7": "標本値の範囲：-0.89 ～ 0.7",
      "Shared scalar color scale": "共通のスカラー値カラースケール",
      "Seed 42 · frequency 1.2 · y = 0.37 · t = 0": "シード 42 · 周波数 1.2 · y = 0.37 · t = 0",
      "Identical coordinates reveal what the algorithm changes.": "同じ座標で比較すると、アルゴリズムによる値の変化が見えてきます",
      "Gradient": "勾配ノイズ",
      "Billow": "ビロー",
      "Ridged": "リッジ",
      "n = 1.55 × base noise": "n = 1.55 × 基本ノイズ",
      "Billow and Ridged are exact negatives of one another here": "ここではビローとリッジの値は、互いに符号を反転したものです",
      "One field, three value transforms": "1つの場に、3通りの値変換",
      "Three xz heatmaps show the app’s Gradient, Billow, and Ridged scalar outputs for seed 42, frequency 1.2, y = 0.37, and time 0. All maps cover x,z in [−2.5,2.5] and use the same [−1,1] color scale. Each color cell is one center sample; none exceeds the displayed scale. Billow equals 2|1.55 noise|−0.7 and Ridged is its exact negative.": "3枚の xz ヒートマップで、アプリの勾配ノイズ、ビロー、リッジのスカラー出力を比較します。シード 42、周波数 1.2、y = 0.37、時刻 0 を共通条件とし、どの図も x,z ∈ [−2.5,2.5]、色の範囲 [−1,1] を使います。各セルの色は中心の標本値に対応し、すべての標本値が表示範囲内に収まります。ビローは 2|1.55 noise|−0.7、リッジはその符号を反転した値です。"
    }
  },
  "frequency-amplitude.svg": {
    "sourceLabelsSha256": "8be1b9f2184f848e49a28e3be348adcbfe471d2cfbc06ad35ea7114b8b583e50",
    "sourceKind": "deterministic sampled scientific figure",
    "translations": {
      "A one-dimensional slice separates coordinate scaling from output scaling.": "1次元の断面で、座標の倍率と出力値の倍率を分けて比較します",
      "Frequency changes feature size": "周波数は模様の細かさを変える",
      "Amplitude rescales the same values": "振幅は同じ値を拡大・縮小する",
      "A = 1 held fixed": "A = 1 に固定",
      "f = 0.9 held fixed": "f = 0.9 に固定",
      "Scaled value = A × 1.55 × noise(f x, 0, 0) · Seed 42 · Same x and output scales": "表示値 = A × 1.55 × noise(f x, 0, 0) · シード 42 · 横軸・縦軸は共通の目盛り",
      "Amplitude acts after sampling; the zero crossings stay in exactly the same places": "振幅は標本値を求めた後に掛けるため、ゼロを横切る位置は変わりません",
      "Shape-specific render factors are omitted; terrain adds another ×1.65": "形状ごとの描画係数は省略。地形の描画では、さらに ×1.65 が掛かります",
      "Two controls, two different effects": "周波数と振幅、それぞれの働き",
      "Two controlled line plots use seed 42 and the x-axis slice y=z=0. Left: frequency 0.65 versus 1.6 at amplitude 1. Right: amplitude 0.5 versus 1.5 at frequency 0.9. Both cover x in [−3,3] and scaled value in [−0.6,0.6]. Scaled value is amplitude times the app’s Gradient scalar value; amplitude is applied outside createFields.scalar. Shape-specific geometric rendering factors are omitted; terrain applies an additional factor of 1.65.": "シード 42、y=z=0 の x 軸上の断面を使い、2枚の折れ線グラフで条件をそろえて比較します。左は振幅 1 で周波数 0.65 と 1.6、右は周波数 0.9 で振幅 0.5 と 1.5 を比較しています。どちらも x ∈ [−3,3]、振幅を掛けた値の範囲は [−0.6,0.6] です。表示値はアプリの勾配ノイズのスカラー値に振幅を掛けたもので、振幅は createFields.scalar の外で適用されます。形状ごとの描画係数は省略しており、地形の描画ではさらに 1.65 倍されます。"
    }
  },
  "octave-composition.svg": {
    "sourceLabelsSha256": "3bc4bc45b34d883a57b3e6b042d2409f79cd049897c2273613a052018a898291",
    "sourceKind": "deterministic sampled scientific figure",
    "translations": {
      "Four contributions and their sum, sampled directly from the app’s fBm implementation.": "アプリの fBm 実装から直接求めた、4つの層の寄与とその合計",
      "Octave 1": "オクターブ 1",
      "Octave 2": "オクターブ 2",
      "Octave 3": "オクターブ 3",
      "Octave 4": "オクターブ 4",
      "f = 0.7 · weight = 1": "f = 0.7 · 重み = 1",
      "f = 1.4 · weight = 0.5": "f = 1.4 · 重み = 0.5",
      "f = 2.8 · weight = 0.25": "f = 2.8 · 重み = 0.25",
      "f = 5.6 · weight = 0.125": "f = 5.6 · 重み = 0.125",
      "Each layer is already divided by the same weight sum: 1 + 0.5 + 0.25 + 0.125 = 1.875": "各層は共通の重みの合計で割った値：1 + 0.5 + 0.25 + 0.125 = 1.875",
      "The four curves add to this normalized fBm": "4つの曲線を足すと、この正規化 fBm になる",
      "Seed 42 · y = 0.37, z = 0.81 · Lacunarity 2 · Gain 0.5 · Amplitude 1 · Shared vertical scale": "シード 42 · y = 0.37, z = 0.81 · ラキュナリティ 2 · ゲイン 0.5 · 振幅 1 · 縦軸の目盛りは共通",
      "Build detail from weighted layers": "重み付きの層を重ねて細部をつくる",
      "The four upper plots show gain^i times base noise at frequency times lacunarity^i, divided by the common weight sum 1.875, for i=0,1,2,3. The lower plot is the app’s four-octave fbm result, verified to equal the sum within floating-point precision. Seed 42, frequency 0.7, lacunarity 2, gain 0.5, y=0.37, z=0.81, amplitude 1. Every plot uses x in [−3,3] and output in [−0.4,0.4]. The fBm branch uses raw base noise, without the Gradient lesson’s factor 1.55.": "上段の4つのグラフは、i=0,1,2,3 について、周波数を lacunarity^i 倍した基本ノイズに gain^i を掛け、共通の重みの合計 1.875 で割った寄与を示します。下段はアプリの4オクターブの fBm 出力で、上段の和と浮動小数点精度の範囲で一致することを検証済みです。シード 42、周波数 0.7、ラキュナリティ 2、ゲイン 0.5、y=0.37、z=0.81、振幅 1。すべてのグラフで x ∈ [−3,3]、出力 ∈ [−0.4,0.4] を使います。fBm では基本ノイズをそのまま使い、勾配ノイズのレッスンにある係数 1.55 は掛けません。"
    }
  },
  "domain-warping.svg": {
    "sourceLabelsSha256": "71a3a026b67c17a8e8b2daacfc1f5c59ac60ce4470f250c8d14aef48bc704360",
    "sourceKind": "deterministic sampled scientific figure",
    "translations": {
      "Shared scalar color scale": "共通のスカラー値カラースケール",
      "Seed 42 · frequency 0.8 · y = 0.37 · t = 0": "シード 42 · 周波数 0.8 · y = 0.37 · t = 0",
      "Each pair changes only warp strength; the output pattern stays the same.": "各ペアでは、出力の生成方式を固定し、ワープ強度だけを変えます",
      "Terrain": "地形",
      "Wood": "木目",
      "Warp strength 0": "ワープ強度 0",
      "Warp strength 1.6": "ワープ強度 1.6",
      "Terrain samples four-octave fBm at q. Wood samples a sine of radial distance at q.": "地形は q で4オクターブ fBm を評価。木目は q の中心からの距離に正弦関数を適用します",
      "Wood still includes a small noise phase term when warp strength is zero": "ワープ強度が 0 でも、木目にはノイズによる小さな位相の揺らぎが残ります",
      "Bend the sampling coordinates": "サンプリングする座標をゆがめる",
      "Four xz heatmaps compare warp strengths 0 and 1.6 for Terrain and Wood at seed 42, frequency 0.8, y=0.37, time 0. Maps cover x,z in [−2.5,2.5] with a shared [−0.65,0.65] color scale. Terrain samples normalized four-octave fBm with lacunarity 2 and gain 0.5 after the coordinate warp. Wood is 0.65 sin(4π(f hypot(qx,qz)+0.25 noise(f q))). Wood has a noise phase perturbation even at zero warp strength; it is not a pure unperturbed ring field.": "4枚の xz ヒートマップで、地形と木目それぞれのワープ強度 0 と 1.6 を比較します。シード 42、周波数 0.8、y=0.37、時刻 0 を共通条件とし、x,z ∈ [−2.5,2.5]、色の範囲 [−0.65,0.65] を使います。地形は、座標をワープさせた後に、ラキュナリティ 2、ゲイン 0.5 の正規化4オクターブ fBm を評価します。木目は 0.65 sin(4π(f hypot(qx,qz)+0.25 noise(f q))) です。ワープ強度 0 でも、木目にはノイズによる位相の揺らぎが含まれるため、完全に乱れのない同心円にはなりません。"
    }
  },
  "vector-fields.svg": {
    "sourceLabelsSha256": "c55703e0199387d47a29103d21ffc0441fc5578669b9ebfe708af8d3fd8ce1d6",
    "sourceKind": "deterministic sampled scientific figure",
    "translations": {
      "Seed 42 · frequency 0.65 · Samples on y = 0.37 · x,z in [−2, 2]": "シード 42 · 周波数 0.65 · y = 0.37 の断面 · x,z ∈ [−2, 2]",
      "Gradient": "勾配",
      "Curl": "回転",
      "Gradient cross": "勾配の外積",
      "Color: full 3D magnitude |v|": "色：3次元ベクトルの大きさ |v|",
      "Arrow length: 1 field unit": "矢印の長さ：場の 1 単位",
      "Arrows show (vx, vz), with one shared linear scale. The y component is omitted.": "矢印は (vx, vz) を共通の線形尺度で表示。y 成分は省略しています",
      "This xz slice makes no claim of two-dimensional divergence freedom": "この xz 断面から、2次元の発散がゼロであるとは言えません",
      "Three ways to build a vector field": "ベクトル場をつくる3つの方法",
      "Three panels sample the app’s Gradient, Curl, and Gradient cross 3D vector fields on y=0.37 at seed 42 and frequency 0.65. Each panel contains an 11×11 center-sampled grid over x,z in [−2,2]. Arrow horizontal and vertical components are proportional to vx and vz using one shared linear scale, without normalizing or clipping individual vectors. Color shows the full 3D vector magnitude, including vy. These are projected components on a slice, not complete two-dimensional fields, and the figure makes no 2D divergence claim. Gradient uses centered differences h=0.005; curl uses h=0.008.": "3枚の図で、アプリの勾配、回転、勾配の外積による3次元ベクトル場を比較します。シード 42、周波数 0.65、y=0.37 の断面を使い、各図で x,z ∈ [−2,2] を11×11の格子に分け、セルの中心を標本化します。矢印の横成分と縦成分は vx と vz に比例し、共通の線形尺度を使います。個々のベクトルの正規化やクリッピングは行いません。色は vy を含む3次元ベクトル全体の大きさを示します。断面に投影した成分であり、完全な2次元ベクトル場ではないため、2次元の発散がゼロであることは示していません。勾配の中心差分は h=0.005、回転の中心差分は h=0.008 です。"
    }
  },
  "bounded-time.svg": {
    "sourceLabelsSha256": "45644978dc60faabd4f7084da28110f11e7fd877576c86229b7e096d9af0d731",
    "sourceKind": "deterministic sampled scientific figure",
    "translations": {
      "Sample range: -0.8 to 0.7": "標本値の範囲：-0.8 ～ 0.7",
      "Sample range: -0.76 to 0.69": "標本値の範囲：-0.76 ～ 0.69",
      "Sample range: -0.79 to 0.72": "標本値の範囲：-0.79 ～ 0.72",
      "Shared scalar color scale": "共通のスカラー値カラースケール",
      "One fixed spatial slice samples translated coordinates at three moments.": "固定した空間断面から、平行移動後の座標を3つの時刻で評価します",
      "Offset (0, 0, 0)": "オフセット (0, 0, 0)",
      "Offset (0.9, 0.65, 0)": "オフセット (0.9, 0.65, 0)",
      "Offset (0, 1.3, 0)": "オフセット (0, 1.3, 0)",
      "Same seed 42 and frequency 1.2 throughout": "すべてシード 42、周波数 1.2 で共通",
      "At 60 s, the offset returns exactly to (0, 0, 0)": "60 秒でオフセットは厳密に (0, 0, 0) に戻ります",
      "offset = (0.9 sin θ, 0.65 (1 − cos θ), 0.75 sin 2θ), where θ = 2π t / 60": "offset = (0.9 sin θ, 0.65 (1 − cos θ), 0.75 sin 2θ)、ただし θ = 2π t / 60",
      "The slider is clamped to 0–60 seconds; this is motion through a fixed 3D field": "スライダーの範囲は 0〜60 秒。固定された3次元の場の中をサンプリング位置が動きます",
      "Time moves the sampling window": "時間とともにサンプリング位置が動く",
      "Three heatmaps sample the app’s animatedScalar at times 0,15,30 seconds, with seed 42, Gradient algorithm, frequency 1.2, original slice y=0.37, x,z in [−2.5,2.5], and shared color scale [−1,1]. Animation adds offset(t)=(0.9 sin θ,0.65(1−cos θ),0.75 sin 2θ), where θ=2πt/60, to the complete sampling point before scalar evaluation. Offsets at the shown times are (0,0,0), (0.9,0.65,0), and (0,1.3,0), up to floating-point roundoff. Time is clamped to [0,60]; the exact endpoint offset is zero. This is translated 3D noise, not four-dimensional noise. A finite timeline returning to the initial field is not evidence that advected particles return to their initial positions.": "3枚のヒートマップで、アプリの animatedScalar を時刻 0、15、30 秒で評価します。シード 42、勾配ノイズ、周波数 1.2、元の断面 y=0.37、x,z ∈ [−2.5,2.5]、共通の色範囲 [−1,1] を使います。スカラー値を求める前に、標本点の3座標へ offset(t)=(0.9 sin θ,0.65(1−cos θ),0.75 sin 2θ)、θ=2πt/60 を加えます。表示時刻のオフセットは、浮動小数点の丸め誤差を除いて、それぞれ (0,0,0)、(0.9,0.65,0)、(0,1.3,0) です。時刻は [0,60] に制限され、終点のオフセットは厳密にゼロになります。3次元ノイズの座標を平行移動しており、4次元ノイズではありません。有限の時間軸の終点で場が元に戻っても、移流された粒子が初期位置に戻るとは限りません。"
    }
  },
  "surface-projection.svg": {
    "sourceLabelsSha256": "a14f8cf922e0691923c0a7f9db084796237e34a9b7fe11a7f83b16713caadb1a",
    "sourceKind": "geometric schematic",
    "translations": {
      "Stay on the surface": "曲面上を進み続ける",
      "A local geometric schematic • unit normal n • analytic sphere or torus": "局所的な幾何学の模式図 • 単位法線 n • 数式で定義した球面またはトーラス面",
      "1  Remove the normal component": "1  法線成分を取り除く",
      "unit normal n": "単位法線 n",
      "raw v": "元の速度 v",
      "tangent vₜ": "接線速度 vₜ",
      "Curved surface, viewed locally": "曲面の一部分を拡大",
      "2  Project each integration stage": "2  積分の各段階で曲面へ投影する",
      "Start at p on the surface": "曲面上の p から開始",
      "Compute tangent velocity vₜ(p, t).": "接線速度 vₜ(p, t) を求める",
      "Project the trial midpoint": "仮の中点を曲面へ投影",
      "Project the full step using the midpoint": "中点の速度で1ステップ進め、曲面へ投影",
      "P projects onto the sphere or torus; h is a simulation step.": "P は球面・トーラス面への投影、h はシミュレーションの時間刻み",
      "Tangency constrains direction. It does not guarantee zero surface divergence.": "接線方向への制約だけでは、曲面上の発散がゼロになるとは限りません",
      "Tangent projection and constrained integration": "接平面への投影と曲面上に拘束した積分",
      "Local schematic of raw velocity split into a tangent component and a removed normal component, followed by projected midpoint integration on a sphere or torus. The illustration is geometric and is not a simulation screenshot.": "元の速度を接線成分と取り除く法線成分に分解し、球面またはトーラス面へ投影しながら中点法で積分する手順を示す、局所的な幾何学の模式図です。シミュレーションのスクリーンショットではありません。"
    }
  }
}
;

const args = process.argv.slice(2);
let input = fileURLToPath(new URL('../public/docs/images/', import.meta.url));
let output, generator, check = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--check') { check = true; continue; }
  if (arg === '--help') {
    console.log('Usage: node scripts/localize-doc-figures.mjs [--in DIR] [--out DIR] [--generator FILE] [--check]');
    process.exit(0);
  }
  if (!['--in', '--out', '--generator'].includes(arg) || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const value = path.resolve(args[++i]);
  if (arg === '--in') input = value;
  if (arg === '--out') output = value;
  if (arg === '--generator') generator = value;
}
output ??= path.join(input, 'ja');
generator ??= path.resolve(input, '../../../scripts/generate-doc-figures.mjs');
if (path.resolve(output) === path.resolve(input)) throw new Error('Japanese output must be separate from the English input directory');
const selfHash = sha256(await fs.readFile(fileURLToPath(import.meta.url)));
const generatorHash = sha256(await fs.readFile(generator));
const manifest = {
  generator: 'scripts/localize-doc-figures.mjs',
  version: VERSION,
  locale: 'ja',
  deterministic: true,
  sourceDirectory: 'public/docs/images',
  outputDirectory: 'public/docs/images/ja',
  localizerSha256: selfHash,
  englishGenerator: {file: 'scripts/generate-doc-figures.mjs', sha256: generatorHash, generatedFigureCount: 6},
  fontFamily: FONT_FAMILY,
  preservation: 'Text, accessibility language, and font localization only. Original scientific metadata, geometry, data marks, colors, scales, and numerical values are retained. The surface-projection figure is an existing geometric schematic, not an output of the sampled-figure generator.',
  figures: [],
};
const outputs = new Map();
for (const [file, specification] of Object.entries(FIGURES)) {
  const originalBytes = await fs.readFile(path.join(input, file));
  const original = originalBytes.toString('utf8');
  const labels = labelStream(original);
  const labelsHash = sha256(JSON.stringify(labels));
  if (labelsHash !== specification.sourceLabelsSha256) {
    throw new Error(`${file}: source title, description, or label changed (expected ${specification.sourceLabelsSha256}, received ${labelsHash}). Review the translation before updating the guard.`);
  }
  const expectedNodeCount = (original.match(/<(?:title|desc|text)\b/g) ?? []).length;
  if (labels.length !== expectedNodeCount) throw new Error(`${file}: mixed or unsupported label markup`);
  const translations = specification.translations;
  const seen = new Set();
  let localized = original.replace(labelPattern, (full, tag, attrs, encoded) => {
    const source = unescapeXml(encoded);
    if (!Object.hasOwn(translations, source)) return full; // Guarded unchanged math, axes, and units.
    seen.add(source);
    return `<${tag}${attrs}>${escapeXml(translations[source])}</${tag}>`;
  });
  for (const source of Object.keys(translations)) {
    if (!seen.has(source)) throw new Error(`${file}: expected translation label is missing: ${source}`);
  }
  let fontCount = 0;
  localized = localized.replace(/font-family="([^"]*)"/g, (full, family) => {
    if (!KNOWN_FONTS.has(family)) throw new Error(`${file}: unexpected font family ${family}`);
    fontCount++;
    return `font-family="${FONT_FAMILY}"`;
  });
  if (fontCount !== 1) throw new Error(`${file}: expected one shared font family, received ${fontCount}`);
  if (/\b(?:xml:)?lang=/.test(original.match(/<svg\b[^>]*>/)?.[0] ?? '')) throw new Error(`${file}: source already has language metadata; review before localizing`);
  localized = localized.replace('<svg ', '<svg lang="ja" xml:lang="ja" ');
  const originalDrawing = drawingMarkup(original);
  if (drawingMarkup(localized) !== originalDrawing) throw new Error(`${file}: drawing markup changed`);
  const provenance = {
    locale: 'ja',
    localizer: 'scripts/localize-doc-figures.mjs',
    version: VERSION,
    sourceFile: `../${file}`,
    sourceSha256: sha256(originalBytes),
    sourceLabelsSha256: labelsHash,
    preservedDrawingSha256: sha256(originalDrawing),
    sourceKind: specification.sourceKind,
  };
  localized = localized.replace('</svg>', `<metadata id="localization-provenance">${escapeXml(JSON.stringify(provenance))}</metadata></svg>`);
  if (drawingMarkup(localized) !== originalDrawing) throw new Error(`${file}: provenance changed drawing markup`);
  const sourceMetadata = [...original.matchAll(/<metadata\b[^>]*>([\s\S]*?)<\/metadata>/g)].map(([,value]) => JSON.parse(unescapeXml(value)));
  const localizedLabels = labelStream(localized);
  manifest.figures.push({
    file,
    title: localizedLabels.find(([tag]) => tag === 'title')[1],
    caption: localizedLabels.find(([tag]) => tag === 'desc')[1],
    ...provenance,
    outputSha256: sha256(localized),
    labelNodeCount: labels.length,
    translatedNodeCount: labels.filter(([,value]) => Object.hasOwn(translations, value)).length,
    originalScientificMetadata: sourceMetadata,
  });
  outputs.set(file, localized);
}
outputs.set('figure-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
if (!check) await fs.mkdir(output, {recursive: true});
for (const [file, contents] of outputs) {
  if (check) {
    const existing = await fs.readFile(path.join(output, file), 'utf8');
    if (existing !== contents) throw new Error(`${file}: localized output is stale; rerun the localizer`);
  } else await fs.writeFile(path.join(output, file), contents);
}
console.log(`${check ? 'Verified' : 'Localized'} ${manifest.figures.length} Japanese SVG figures and figure-manifest.json; English source files were not modified.`);
