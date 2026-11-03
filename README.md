# From Pressure to Flow

An interactive lesson connecting pressure forces, Newtonian viscosity, velocity gradients, shear stress, and volumetric flow rate in a circular pipe, with a separate **Microfluidic mixing** tab comparing analytical and numerical transport models. The website runs in the visitor's browser; it needs no AI service, API key, database, or server-side calculation.

## Run the website locally

For the simplest local demo, open **`dist/standalone.html`** directly in a modern browser. It bundles the lesson, styling, physics, and interface in one file and needs no server or internet connection. External reference links still require internet access. A copy is also delivered as `from-pressure-to-flow.html` beside this project folder.

To work with the separate source files, use the local server below.

Use Node.js and open a terminal in this folder:

```powershell
cd 'C:\Users\ajhan\Documents\Codex\2026-10-13\plan-for-class-we-are-required\outputs\from-pressure-to-flow'
npm start
```

Alternatively, run `node serve.mjs`. Open **http://127.0.0.1:4173** in a browser. Press Ctrl+C in the terminal to stop the local server. No package installation or build step is required.

On this computer, if `node` is unavailable on the terminal's search path, the bundled runtime can run the same server:

```powershell
& 'C:\Users\ajhan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' serve.mjs
```

Use a local HTTP server rather than double-clicking `dist/index.html`: browsers commonly block the JavaScript module imports when a page is opened directly as a local file. The local address is a preview, not a publicly accessible website.

For public hosting, upload the **contents of `dist/`**, keeping all files together, to a static website host. The publish directory is `dist`; no build command is needed. Check the resulting public address in a signed-out browser before submitting it. No public deployment is claimed in this README.

The supplied `from-pressure-to-flow-hosting.zip` contains those files at its root, ready for a static host's file-upload workflow. Sites registration is preserved, but this session could not connect to the Sites source server to finish publication. A registered expected URL is not a live website.

## Files

| File | Purpose |
|---|---|
| `dist/index.html` | Page structure, project documentation, references, and presentation/transcript placeholders |
| `dist/style.css` | Responsive layout and visual presentation |
| `dist/app.js` | Guided lesson, controls, charts, linked marker, and readouts |
| `dist/physics.js` | SI-unit solver, profiles, numerical integration, and validation |
| `dist/implementation-prompt.txt` | Downloadable implementation specification |
| `dist/mixing-physics.js` | Fourier-series and finite-volume mixing models |
| `dist/mixing-ui.js` and `dist/mixing.css` | Topic tabs, mixing controls, concentration field, and comparison plots |
| `dist/mixing-specification.txt` | Student's extension request and the AI's implementation choices |
| `tests/physics.test.mjs` | Repeatable reference, scaling, boundary, and input checks |
| `tests/mixing.test.mjs` | Mixing conservation, reference scales, convergence, initial conditions, and layering checks |
| `serve.mjs` | Small local preview server |
| `make-standalone.mjs` | Regenerates the single-file offline version from the source |
| `VERIFICATION.md` | Recorded checks and outstanding submission work |

## Equations and units

The model assumes steady, fully developed laminar flow of an incompressible Newtonian fluid in a horizontal, rigid circular pipe, with constant properties and no slip. **L is the length of an already fully developed section**, and **ΔP = Pin − Pout** is its nonnegative pressure drop. This is not the total length measured from a pipe entrance.

The variable **r** selects an imaginary fluid cylinder inside the pipe, while **R** is the pipe radius. For `0 < r ≤ R`, the net pressure force on its ends balances the opposing shear force on its side:

```text
ΔP · πr² = τ(r) · 2πrL
Pa · m²  = Pa · m² = N
```

At `r < R`, surrounding fluid exerts this shear. At `r = R`, it is wall shear. Rearranging and extending continuously to the center gives:

```text
τ(r) = ΔP r / (2L)                [Pa]
τw   = ΔP R / (2L)                [Pa]
```

Here **τ is the magnitude of resisting shear stress**, not a signed stress component. With positive axial flow and radial distance measured outward from the center:

```text
τ(r) = −μ du/dr
Pa   = (Pa·s)(s⁻¹)
```

Velocity decreases toward the wall, so `du/dr` is negative. Integrating and applying `u(R) = 0` gives the parabolic profile:

```text
u(r) = ΔP (R² − r²) / (4μL)       [m/s]
du/dr = −ΔP r / (2μL)             [s⁻¹]
```

Integrate over thin annular areas `dA = 2πr dr`, rather than over radius alone:

```text
Q = ∫₀ᴿ u(r) 2πr dr = πR⁴ΔP / (8μL)    [m³/s]
uaverage = Q / (πR²)                     [m/s]
umax = 2uaverage                         [m/s]
```

In the fixed-flow mode, the required pressure drop is calculated:

```text
ΔP = 8μLQ / (πR⁴)                       [Pa]
τw = 4μQ / (πR³)                        [Pa]
```

The total force magnitudes are `Fpressure = ΔPπR²` and `Fwall = τw2πRL`, both in **N**. Stress in Pa is force per area; it is not total force.

All internal calculations use meters, seconds, pascals, and Pa·s. The flow control displays L/min, with **1 m³/s = 60,000 L/min**. Equation terms display their units directly underneath them in the guided lesson.

## Teaching and interface choices

The six-step lesson builds the model from a fluid element and a force balance, then connects stress to slope, integrates for velocity, and adds the flow through annuli. Steady flow alone does not imply zero acceleration; fully developed axial flow makes axial acceleration zero in this model.

The explorer initially unlocks only pressure drop. Later experiments unlock length, viscosity, and radius, followed by free exploration. Each experiment asks for a prediction before revealing an explanation. The pressure and flow modes make the prescribed input and calculated output explicit, and changing mode preserves the operating point.

Velocity and shear-magnitude plots stay visible together. They share a position axis in **meters** across the diameter. The linked marker uses `r = |y|`; its slope readout is the **outward radial derivative du/dr**, which is nonpositive for positive flow. The tangent drawn on the full-diameter velocity graph follows the signed derivative with respect to its position axis. These two derivative directions differ on the left half of the graph.

The dashed baseline stores a complete operating state. Both curves use shared axes sized to include the current and baseline states, retaining physical values rather than normalizing each curve to its own maximum. The axes can rescale, so compare the labeled values and the baseline together.

Important guided predictions include:

| Change | Quantities held fixed | Result |
|---|---|---|
| Double ΔP | R, L, μ | Q and τw double |
| Double L | ΔP, R, μ | Q and τw halve; total wall force stays unchanged |
| Double μ | ΔP, R, L | Q halves; τw stays unchanged |
| Double R | ΔP, L, μ | Q increases by 16; τw doubles |
| Double R | Q, L, μ | Required ΔP decreases by 16; τw decreases by 8 |

Reynolds number, density, and entrance development appear only in the optional final section. An approximate upstream entrance estimate cannot certify this already developed section; entrance pressure loss is excluded.

## Validation

Run the automated checks from this folder:

```powershell
node --test tests/physics.test.mjs tests/mixing.test.mjs
```

Or run `npm test`. With the bundled runtime:

```powershell
& 'C:\Users\ajhan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/physics.test.mjs tests/mixing.test.mjs
```

The current test suite contains 18 tests: nine original pipe-flow checks and nine mixing checks. All 18 passed. The original checks cover a hand-calculated reference, local profiles and the Newtonian relation, independent numerical area integration, scaling in both modes, zero drive, invalid inputs, radial limits, and numerical range handling. Simpson's rule integrates the velocity profile over annular area without using the stored analytical Q. Mixing tests cover SI scales, inlet conditions, symmetry, mass conservation, concentration bounds, analytical/numerical agreement, refinement, layering scaling, target definition, and invalid input rejection.

The common reference case is:

| Quantity | Value |
|---|---:|
| R | 0.005 m |
| L | 1 m |
| μ | 0.01 Pa·s |
| ΔP | 100 Pa |
| Q | 2.4543692606 × 10⁻⁶ m³/s |
| Q in display units | 0.1472621556 L/min |
| Average velocity | 0.03125 m/s |
| Maximum velocity | 0.0625 m/s |
| Wall shear stress | 0.25 Pa |
| Both force magnitudes | 0.007853981634 N |
| Outward wall velocity gradient | −25 s⁻¹ |

Also check the browser interface manually: inputs and sliders agree; invalid inputs retain the last valid state with feedback; zero drive gives zero outputs; mode changes preserve the operating point; baseline comparisons are visible; the local marker works with keyboard and touch; and the page remains readable on a phone. Automated physics checks do not establish teaching effectiveness. Actual peer feedback should be collected and documented separately.

## Microfluidic mixing tab

Select **Microfluidic mixing** at the top of the website, or append `#mixing` to the page address. The two topic tabs preserve separate physical inputs. The header's original lesson/explorer links return to the pipe-flow tab.

The mixing tab extends the force-balance discussion to a passive species balance. With no reaction, constant diffusivity, uniform representative axial speed U, no axial diffusion, and no wall solute flux, the reduced equation is:

```text
U dc/dx = D_m d²c/dy²
t = x/U  =>  dc/dt = D_m d²c/dy²
```

This is a 1D transverse diffusion model marched in residence time. It does not solve the flow field or actual 2D/3D mixer geometry, and does not apply circular-pipe resistance to a rectangular channel. Units are explicit: W in m, L in m, U in m/s, D_m in m²/s; displayed μm, mm, and mm/s are converted to SI. The normalized concentration c is dimensionless.

At the baseline inlet, the left half has c=0 and the right half c=1. No-flux walls conserve the mean concentration 0.5. A cosine Fourier series gives the analytical profile, and a conservative cell-centered finite-volume solver with backward Euler gives the numerical result. The numerical solution is computed independently, not copied from the analytical profile. Analytical cell averages are compared with numerical cell averages. The series is truncated numerically; the inlet is handled directly.

The mixing index is M=1−2σ, where σ is concentration standard deviation across the width. Segregated equal streams have M=0; uniform concentration gives M=1. The analytical index uses continuous variance, while the numerical index uses cell-average variance. Coarse averaging can hide unresolved gradients. A high index is neither reaction yield nor proof of uniformity at every physical scale.

Reference values:

| Quantity | Reference value |
|---|---:|
| Width W | 100 μm |
| Length L | 10 mm |
| Speed U | 1 mm/s |
| Diffusivity D_m | 1e−10 m²/s |
| Residence time | 10 s |
| Width-based Pe | 1000 |
| Fo = D_m t / W² | 0.1 |
| Diffusion timescale W²/D_m | 100 s |
| Analytical index | About 66.44% |
| Length for M=0.9 | About 22.27 mm |

At the default grid/time settings (128 cells, 400 steps), maximum outlet cell-average error is about 3.09e−4. Refining a 64-cell/100-step calculation to 128 cells/400 steps lowers this error from about 0.001231 to 0.0003091. This verifies the simplified model, not a physical device.

The ideal-layering control imposes 1, 2, 4, or 8 interfaces at the inlet. The pattern is alternating bands with half-bands at the walls and equal total amounts of each inlet stream. It replaces Fourier wavenumber mπ/W with mnπ/W, so a corresponding mixing target scales as 1/n². It does not simulate the splitting/recombination process, hydrodynamic focusing, a herringbone mixer, acoustic actuation, or their pressure costs. Those strategies are discussed conceptually with references, and the page explains what a full CFD study would add.

## Complete the course documentation

Edit the existing documentation cards in **`dist/index.html`**, in the section with `id="project"`. They are explicitly marked pending where evidence is missing.

After source edits, run `npm run standalone` (or `node make-standalone.mjs`) to refresh `dist/standalone.html`. Publish updated `dist/` files to update what public visitors see; edits made only to a local copy do not update a hosted website.

1. **AI methods & prompts:** Add exact model identifiers, dates, original outputs, follow-up prompts, and your guidance. Preserve the supplied specification in `dist/implementation-prompt.txt`.
2. **Critique decisions:** Attach the other model's original critique and identify that model. Explain your accept/modify/defer/reject decisions in your own words.
3. **Model comparison:** Have a different AI model implement the same specification independently. Preserve its initial version, apply the same reference and scaling checks, record corrections, compare teaching clarity, and justify the implementation selected. **The requirement to implement with at least two different AI models is not yet fulfilled.** Separate same-model implementation/review tasks do not meet it.
4. **My contributions & learning:** Add your actual revisions, what you learned, remaining questions, peer feedback, and final decisions. This is an individual project.
5. **References & attribution:** Retain the linked university teaching sources. Add course materials or property-data sources if you use them. The current fluid properties are hypothetical constant inputs, not sourced material presets.
6. **Presentation:** Replace the YouTube-link placeholder with the actual uploaded presentation link.
7. **Verbatim transcript:** Insert the actual YouTube auto-generated transcript in a viewable section. Preserve its wording and errors. Formatting and a separately labeled corrected copy may improve readability, but the required verbatim version must remain available. Escape HTML characters such as `&`, `<`, and `>` if inserting transcript text into the source.

The independent model comparison, presentation video, verbatim transcript, final reflection, and peer feedback are incomplete. Do not replace placeholders with invented evidence.

## Limitations

This is an analytical teaching model with numerical visualization, not a general pipe-flow CFD simulation. It does not simulate transient acceleration, turbulence, developing flow, fittings or entrance losses, non-Newtonian behavior, changing temperature/properties, slip, compressibility, or pipe deformation. Moving a slider computes a new steady state; it does not predict the time needed to reach it. Nonnegative driving inputs support one flow direction. Positive R, L, and μ are required, and numerical states outside the representable range are rejected.

The optional regime and entrance discussion provides context; it does not validate every freely chosen operating state. The core explorer continues to display idealized laminar predictions under its stated assumptions.
