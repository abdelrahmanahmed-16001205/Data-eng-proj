# Notebook and data audit — 3 November 2026

Scope: everything except `website/`, which has its own audit in
[audit-2026-11-03.md](audit-2026-11-03.md). Standard: the Milestone 1 brief in
`Project Information/Project Description.pdf` and the two published data dictionaries.

Every finding below was reproduced against the committed files before it was fixed, and every fix was
verified by re-running the notebook and re-reading the saved output.

## Findings and fixes

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | All twelve research-question charts were blank in the GitHub notebook preview. | The rendered page held twelve `.plotly-graph-div` elements at 0 px height, `window.Plotly` was undefined and there were no canvases or SVGs, because GitHub's notebook iframe does not load `cdn.plot.ly`. | All charts rewritten in matplotlib and saved as PNG outputs. The notebook now holds 17 PNG figures and zero Plotly references. |
| 2 | The README claimed "six meter records have been added since this snapshot". | The live meter dataset still returned 15,598 rows. The six is the number of duplicate `meter_number` rows the notebook removes, not new meters. | Sentence removed; the README now states the snapshot counts and that live data changes. |
| 3 | No association statistics. The charts showed shape and nothing quantified it. | No test appeared anywhere in the notebook. | A new statistics cell: Spearman's rho for the continuous comparisons, Mann-Whitney U for Q3 and Q12, chi-square for Q8 and Q10, printed with sample size and p-value. |
| 4 | The findings section answered 4 of the 12 research questions. | Only proximity, borough and window sensitivity were covered. | The final section now answers all twelve in a table, followed by a paragraph on what the statistics add, then limitations, impact and final interpretation. |
| 5 | `duration_days` was described as construction time. | The field is completion date minus project start date, and the start date is the loan closing or regulatory agreement, not a construction start. | Relabelled in the chart axis, in the cleaning comments and in the findings: days from project start (loan closing) to completion, not construction time. |
| 6 | Repetitive chart design: most questions were drawn with the same two chart forms. | The original cells produced repeated bar and scatter variants with no visual distinction between questions. | Seven forms across the twelve charts: bar, line, box, a six-panel scatter grid, map, stacked bar and grouped bar, with log and percent axes and per-borough colour where the data needs them. |
| 7 | No dependency or setup instructions. | The README jumped straight to the dashboard; nothing said what the notebook imports or how to install it. | `requirements.txt` added, with a Quick start section for both the notebook and the dashboard, and a real minimum version for matplotlib. |
| 8 | Dead code in `clean_housing`: a `cb_num` branch that could never run. | `community_board` is text in 100% of rows (`BK-05` style), so the numeric branch was unreachable. | Removed; the comment now states why the published value is already the correct key. |
| 9 | Repeated buildings were mentioned as a caveat but never quantified. | 123 buildings appear in 2–3 projects across 247 records. | The aggregation note now states the size of the effect: 247 records, 21,098 of 320,946 counted units (6.6%), of which 1,154 units (0.36%) are the extra over counting each building once. |
| 10 | The saved outputs and the text describing them disagreed in two places. | The Step 7 note said the income bands matched for "99.7% of buildings" when all 9,522 records with a value match exactly, and the README said execution counters were cleared when the notebook had none. | Both statements corrected to what the recorded run actually shows. |

## Checks that passed without a fix

These were verified rather than changed, so the record shows what was actually tested:

- **Datasets are the right ones.** `hg8x-zxpr` and `693u-uax6` both appear in
  `Project Information/Data Catalog.pdf`, so no feasibility substitution was needed.
- **The CSV exports are reproducible.** Rebuilding `buildings_integrated`, `meters_integrated`,
  `borough_summary`, `community_board_summary` and `year_summary` from a clean run reproduced every
  committed file, with the two-row drift described in [development.md](development.md) as the only
  difference. The committed CSVs now come from the same run as the notebook's saved outputs.
- **Headline numbers hold.** 75.69% of geocoded housing records are near an active meter, 77.19% of
  meters are near housing, the sensitivity check gives 63.9 / 75.7 / 87.8%, 20.5% of housing records lack
  coordinates, and the borough ratios are 13.2 / 40.4 / 53.3 / 80.8 / 44.8.
- **Data quality.** No negative unit counts, no completion dates in the future, `all_counted_units` never
  exceeds `total_units`, no share above 1, and the six income bands sum to `all_counted_units` for all
  9,522 records that have a value.
- **The CSV endpoint is the right one.** The SODA JSON view exposes only 26 of the 41 housing fields and
  hides the income bands, bedroom counts and dates, so the notebook correctly uses the CSV download.

## Follow-up pass — 5 November 2026

A second read of the shipped artifacts found five more problems. All are fixed in the same commit.

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 11 | A clean install could not run the notebook. | `requirements.txt` listed pandas, numpy, matplotlib and scipy, but the import cell also imported `seaborn`, which draws the five EDA figures. | `seaborn>=0.13` added to `requirements.txt` and to the environment table in [development.md](development.md). |
| 12 | The import cell imported `plotly`, which nothing used. | `px.` appeared zero times in the code; only the import remained after the charts moved to matplotlib. | Import removed, so the notebook now has no Plotly reference at all. |
| 13 | Q8's chi-square was inflated by a sparse cell. | Including the 36 `UNKNOWN` meters left expected counts far below 5 and produced p = 2.2 × 10⁻⁵, which overstated a 2-point difference. | The test now uses the ACTIVE and INACTIVE rows only (n = 15,556, p = 0.002); the chart still shows all three groups and the docs state the exclusion. |
| 14 | The repeated-building caveat overstated the double count. | 21,098 units sit in the 247 records of repeated buildings, but most belong to each building's first record. The extra over counting every building once is 1,154 units (0.36%), not the 13,072 (4.1%) the text claimed. | Notebook, method notes and this record now quote 1,154 units (0.36%) and keep the 21,098 (6.6%) figure as the total in repeated records. |
| 15 | Step 13 was one long cell containing all twelve charts. | Every question shared a single code cell, so the figure and the code that drew it could not be read together. | Split into one markdown and one code cell per question, each naming the team member who owns it: 43 code cells in total. |

## Result

The notebook now renders in any viewer, quantifies every comparison, answers every research question and
states its own limits. It runs end to end with no cell failing: 43 code cells, 17 PNG figures, and one
printed statistics table.
