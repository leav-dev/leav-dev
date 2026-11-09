# Profile Refresh — leav-dev/leav-dev

## Objetivo
Poner al día el repo de perfil: contenido desactualizado + bug en motor de stats + visual mejorado.

## Hallazgos (explore)
- `scripts/generate.mjs` calcula `statsSvg` pero nunca lo escribe a `stats/github-stats.svg`. Solo escribe `top-langs.svg` + `metrics.json`.
- `README.md` solo embebe `stats/top-langs.svg` (height 500px). Se pierde la stats card principal con streak, heatmap e insights.
- Contenido viejo: stack dice React/Angular/Python/AWS, experiencia "28+ months". Datos reales (`stats/metrics.json` 2026-10-03):
  - Top langs: Python 70.21% (skew por fork graphify-modules), Go 16.44%, HTML 6.96%, TypeScript 3.24%, Lua.
  - Repo más activo: `tcode` (Go, 221 commits), `tcode-extention` (57), `leav-dev` (122). Proyectos destacados del README (shaun, utilspress, api-clima, bot-detector) no incluyen tcode.
  - Nuevos repos: `tcode`, `tcode-extention`, `homebrew-tcode` (Ruby).
- Visual: `svg-templates.ts` usa paleta Tokyonight fija, sin responsive, heatmap de 26 semanas, sin card de actividad extra. README depende de servicios externos (capsule-render, typing-svg, skillicons, shields) sin fallback.
- Workflow `.github/workflows/stats.yml` OK, pero validación solo chequea `<svg` en primera línea.

## Specs

Diseño elegido: `design/profile-recruiter/02-recruiter-resume.html` (One-screen résumé).

- **S1** — Foco del perfil: un reclutador o cliente que encuentra el perfil. Propuesta de valor arriba, evidencia verificable, CTA de contacto. (Ver L2.)
- **S2** — «no es necesaria, ademas deja al descubierto mi correo pesonal»: el correo personal `luise.albor@gmail.com` **no aparece en ningún artboard ni en el README**; el contacto va por LinkedIn y GitHub.
- **S3** — «no me gusta dejar vacio lo que he hecho»: la experiencia `Grupo Educate Colombia` no puede quedar con placeholders `[N endpoints]`, `[N personas]`, `[N usuarios / sedes]`; se cierra con decisiones y tecnologías, no con métricas vacías.
- **S4** — Contenido textual del trabajo: «mis impactos son como en optimizacion de tareas, mi trabaje con un grupo 3 personas icluyendome, maneje el tema de ci/cd, ademas de pipelines para automatizacion de lismos, realice proyecto con sonar para la deteccion de psoibles errores y codigo duplicado».
- **S5** — «podemos colocar las tecnologias, que don angulr y django rest framework»: se nombran `Angular` y `Django REST Framework` explícitamente; «no se puedne colocar metricas» → no se inventan números del trabajo privado.
- **S6** — «puedes hacer que suene mas pintorezco»: redacción con imágenes concretas y en primera persona, sin grandilocuencia vacía ni métricas inventadas.
- **S7** — Restricción de plataforma (L5): GitHub sanitiza `<style>`/`<script>` y no permite layout sticky; el diseño se materializa con SVG generados por `src/renderer/svg-templates.ts` y Markdown GFM, sin servicios externos (`skillicons.dev`, `img.shields.io`).

## Tasks

- [x] T1 · S1 · Relevar bugs y desactualización (fase de exploración)
- [x] T2 · S7 · Corregir motor stats (escribir `github-stats.svg`, validar)
- [x] T3 · S1 · Actualizar contenido README (stack + proyectos + experiencia)
- [x] T4 · S1, S7 · Layout del perfil según el artboard elegido (identidad + evidencia + trabajo)
- [x] T5 · S7 · Verificar build + workflow verde
- [x] T6 · S1–S7 · Implementar el artboard «One-screen résumé»: `renderIdentityCard()` → `stats/identity-card.svg`, README reescrito sin correo personal y con la experiencia real (equipo de 3, CI/CD, Sonar, Angular, Django REST Framework)
- [x] T7 · S1, S5 · Sumar `utilspress` al trabajo seleccionado con su propuesta real (comprime imágenes y PDF en local, estilo iLovePDF) y stack verificado contra la API de GitHub

## Evidencia
- Commits work-unit por tarea en feature branch.
- `npm run build` + `npm run typecheck` verdes.
- `stats/` regenerado o validado.
- **T6 (2026-10-31):** `npm run typecheck` y `npm run build` sin errores; `stats/identity-card.svg` regenerado desde `stats/metrics.json` y verificado (XML válido, 0 `<script>`, 0 `href` externo, `head -1` empieza con `<svg` para el paso de validación del workflow, bytes idénticos a la salida actual del renderer); README sin `mailto`/`gmail`, sin `shields.io` ni `skillicons.dev`, tablas GFM consistentes y los tres `src` de `stats/` existen.

## Decisiones
- Foco elegido por usuario: Integral todo (2026-10-15).

## Cierre 2026-10-15
- Writer: fix generate.mjs + svg-templates + README + SVGs regeneradas.
- ASSESS: risk unassessable (untracked files), plan writerSelfVerification + independentVerifier.
- Verifier independiente: npm ci + build + typecheck VERDES, SVGs válidos, diff seguro.
- Pendiente decisión usuario: commit (no auto-commit por safety), push, validación visual en GitHub.
- Hallazgos: odd/ untracked es artefacto ODD local (no commitear), .gitignore con .atl/ pre-existente, stats/github-stats.svg nuevo requiere git add explícito.

## Log
> Convención de Log agregada en 2026-10-31; las entradas anteriores a L1 quedaron en las secciones previas (Objetivo / Hallazgos / Decisiones / Cierre).

- **L1** (prompt, 2026-10-31): "quiero mejorar mi perfil de github, este es el repo de mi perfil"
- **L2** (2026-10-31, decisión de foco): objetivo elegido por el usuario = **reclutador / cliente que encuentra el perfil** (no vitrina OSS, no solo identidad visual, no limpieza estructural).
- **L3** (2026-10-31, datos frescos): `stats/metrics.json` colectado 2026-10-31 contradice al `README.md` vigente: lenguajes reales TypeScript 55,53 % / Python 26,81 % / JavaScript 6,94 % / Go 6,23 % (el README y los Hallazgos viejos decían Python 70,21 %); 422 commits / 365 días; 429 contribuciones en 40 días activos; 14 PR mergeados sobre 15; 13 repos públicos (2 forks: `graphify-modules` 1.568 commits y `atreus` 6.510 commits, **que no son commits propios**). No usarlos como métrica personal.
- **L4** (2026-10-31, diseño → alimenta Tarea 4): directions written in `design/profile-recruiter/`: `01-terminal-brief.html` (Terminal briefing), `02-recruiter-resume.html` (One-screen résumé), `03-evidence-ledger.html` (Evidence ledger). Manifiesto: `design/profile-recruiter/design.json`. Ningún artboard elegido todavía; son alternativas en paralelo, no secuencia.
- **L5** (2026-10-31, restricción de implementación): GitHub strippea `<style>` y `<script>` del README y no admite layout sticky. Estas direcciones se materializan como (a) SVG generados por `src/renderer/svg-templates.ts` + `scripts/generate.mjs`, o (b) HTML markdown/table soportado. Eliminar dependencias externas actuales (`skillicons.dev`, `img.shields.io`) porque hoy no tienen fallback.
- **L6** (2026-10-31, gap de contenido que ningún diseño resuelve): `profile.bio` vacío en GitHub, 0 followers, 0 stars, y la sección de experiencia privada tiene placeholders `[N endpoints]`, `[N personas]`, `[N usuarios / sedes]`. Falta métrica propia del usuario para cerrar la versión reclutador.
- **L7** (2026-10-31, comentarios del canvas en `02-recruiter-resume.html`): `s82607bb` «no es necesaria, ademas deja al descubierto mi correo pesonal» y `1k86zxfg` «tambien expone mi correo personal» → correo personal eliminado del artboard, contacto por LinkedIn. `mdc5xn2s`: la sección de experiencia se reescribe con impacto real (equipo de 3, CI/CD, Sonar, Angular, Django REST Framework) y sin métricas inventadas. Esto fija S2–S6.
- **L9** (2026-10-31, **implementación terminada**): T6 cerrada. Cambios: `src/renderer/svg-templates.ts` (+`renderIdentityCard()`, +`body`/`muted` en la paleta), `scripts/generate.mjs` (escribe `stats/identity-card.svg`), `stats/identity-card.svg` (nuevo, generado desde `metrics.json` sin token), `README.md` reescrito (71 líneas, 8 secciones, sin correo personal, sin servicios externos de badges). Los artboards 01 y 03 quedan como alternativas no implementadas y **todavía contienen el correo personal**: si se retoma alguno, hay que limpiarlo antes. `assets/header.svg` y `assets/footer.svg` dejan de estar embebidos en el README pero no se borraron; decidir si se archivan.
- **L11** (2026-10-31, **commit + push autorizado por el usuario**): 3 work units en `main` (`776ed91` renderer, `d49f094` design, `71025c8` README) y push a `origin/main`. Antes de publicar se limpiaron los correos personales de los artboards 01 y 03 (quedaban con `mailto:`), porque el repo es público y los comentarios del canvas pedían no exponerlo. No se commiteó: `odd/` (artefacto local por decisión previa), `design/profile-recruiter/comments.json` (cita el correo en el `excerpt`) y `handoffs.json` (estado local del canvas), ni el `.gitignore` ajeno pendiente.

