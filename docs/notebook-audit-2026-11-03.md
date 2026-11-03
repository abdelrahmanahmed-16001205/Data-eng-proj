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
| 3 | No association statistics. The charts showed shape and nothing quantified it. | No test appeared anywhere in the notebook. | New Step 14 cell: Spearman's rho for the six continuous comparisons, Mann-Whitney U for Q3 and Q12, chi-square for Q8 and Q10, printed with sample size and p-value. |
| 4 | The findings section answered 4 of the 12 research questions. | Only proximity, borough and window sensitivity were covered. | Step 15 now answers all twelve in a table, followed by a paragraph on what the statistics add, then limitations, impact and final interpretation. |
| 5 | `duration_days` was described as construction time. | The field is completion date minus project start date, and the start date is the loan closing or regulatory agreement, not a construction start. | Relabelled in the chart axis, in the cleaning comments and in the findings: days from project start (loan closing) to completion, not construction time. |
| 6 | Repetitive chart design: most questions were drawn with the same two chart forms. | The original cells produced repeated bar and scatter variants with no visual distinction between questions. | Seven forms across the twelve charts: bar, line, box, a six-panel scatter grid, map, stacked bar and grouped bar, with log and percent axes and per-borough colour where the data needs them. |
| 7 | No dependency or setup instructions. | The README jumped straight to the dashboard; nothing said what the notebook imports or how to install it. | `requirements.txt` added, with a Quick start section for both the notebook and the dashboard, and a real minimum version for matplotlib. |
| 8 | Dead code in `clean_housing`: a `cb_num` branch that could never run. | `community_board` is text in 100% of rows (`BK-05` style), so the numeric branch was unreachable. | Removed; the comment now states why the published value is already the correct key. |
| 9 | Repeated buildings were mentioned as a caveat but never quantified. | 123 buildings appear in 2–3 projects across 247 records. | The aggregation cell now prints records in a repeated building and their counted units (247 records, 21,098 of 320,946 units, 6.6%), and the findings and method docs quote it. |
| 10 | The saved outputs and the text describing them disagreed in two places. | The Step 7 note said the income bands matched for "99.7% of buildings" when all 9,522 records with a value match exactly, and the README said execution counters were cleared when the notebook had none. | Both statements corrected to what the recorded run actually shows. |

## Checks that passed without a fix

These were verified rather than changed, so the record shows what was actually tested:

- **Datasets are the right ones.** `hg8x-zxpr` and `693u-uax6` both appear in
  `Project Information/Data Catalog.pdf`, so no feasibility substitution was needed.
- **The CSV exports are reproducible.** Rebuilding `buildings_integrated`, `meters_integrated`,
  `borough_summary`, `community_board_summary` and `year_summary` from a clean run reproduced every
  committed file, with the two-row drift described in [development.md](development.md) as the only
  difference.
- **Headline numbers hold.** 75.69% of geocoded housing records are near an active meter, 77.19% of
  meters are near housing, the sensitivity check gives 63.9 / 75.7 / 87.8%, 20.5% of housing records lack
  coordinates, and the borough ratios are 13.2 / 40.4 / 53.3 / 80.8 / 44.8.
- **Data quality.** No negative unit counts, no completion dates in the future, `all_counted_units` never
  exceeds `total_units`, no share above 1, and the six income bands sum to `all_counted_units` for all
  9,522 records that have a value.
- **The CSV endpoint is the right one.** The SODA JSON view exposes only 26 of the 41 housing fields and
  hides the income bands, bedroom counts and dates, so the notebook correctly uses the CSV download.

## Result

The notebook now renders in any viewer, quantifies every comparison, answers every research question and
states its own limits. It runs end to end with no cell failing: 32 code cells, 17 PNG figures, and one
printed statistics table.
