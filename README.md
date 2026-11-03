# NYC Affordable Housing & Parking Meter Analysis

This project explores the geographic relationship between New York City affordable housing records and
parking meter locations. The two datasets share no record-level key, so the notebook links them with a
grid-based proximity measure. The analysis is descriptive: it does not establish causation, parking
capacity, or historical meter availability.

- **Live dashboard:** <https://abdelrahmanahmed-16001205.github.io/Data-eng-proj/>
- **Repository:** <https://github.com/abdelrahmanahmed-16001205/Data-eng-proj>

## Repository layout

| Path | Contents |
|---|---|
| `Milestone1_FINAL_SUBMISSION_REVIEWED.ipynb` | The analysis: loading, EDA, cleaning, integration, summaries, twelve figures, association statistics, findings, limitations. |
| `Data/` | Five CSV exports the dashboard reads: `buildings_integrated.csv`, `meters_integrated.csv`, `borough_summary.csv`, `community_board_summary.csv`, `year_summary.csv`. Must stay at the repository root. |
| `website/` | The static dashboard: `index.html`, `styles.css`, `app-final.js`, `borough-paths.js`, `og.png`. No build step, no dependencies. |
| `index.html` | Redirects the repository root to `website/`. |
| `scripts/` | `build_boroughs.py` regenerates `website/borough-paths.js`; `make_og.py` renders `website/og.png`. Both optional, only needed when those assets change. |
| `docs/` | Method notes, development notes, and the audit and plan records. See [docs/README.md](docs/README.md). |
| `requirements.txt` | Python packages the notebook needs. |
| `*.xlsx` | Field dictionaries published with the two source datasets. |

## Quick start

### The notebook

Requires Python 3.10 or newer and an internet connection, because the two source datasets are
downloaded from NYC Open Data on every run.

```powershell
pip install -r requirements.txt
jupyter lab Milestone1_FINAL_SUBMISSION_REVIEWED.ipynb
```

Run all cells top to bottom. This regenerates every figure, the statistics table and all five CSVs in
`Data/`. The figures are saved as PNG outputs, so they render in Jupyter, VS Code, Colab and the GitHub
preview without any plotting library or CDN script.

### The dashboard

From the project root:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/website/>. The server is required: opening `website/index.html` straight
from the filesystem blocks the CSV fetches. If `python` is not on PATH, use the installed executable.

## Data

1. **Affordable Housing Production by Building (HPD)** — NYC Open Data ID `hg8x-zxpr`:
   <https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr>
2. **Parking Meters Locations & Status (DOT)** — NYC Open Data ID `693u-uax6`:
   <https://data.cityofnewyork.us/Transportation/Parking-Meters-Locations-and-Status/693u-uax6>

No source file is committed. The snapshot in `Data/` holds 9,551 housing records (51 columns after
cleaning) and 15,592 unique meters (21 columns), pulled on 3 November 2026. Both datasets are live and
change without notice, so a later run produces slightly different counts; re-running the notebook
refreshes `Data/` from whatever NYC Open Data serves at that moment.

## Method

Both files carry coordinates, so proximity is measured on a grid of cells about 100 m per side
(0.0009° latitude by 0.0012° longitude). For each record the notebook counts records of the other
dataset in a 7 × 7 cell window around it. The window is square, not a radius and not a walking
distance, and the sensitivity check shows how much the result depends on it: 63.9% of housing records
are near an active meter with a 2-cell reach, 75.7% with 3 cells and 87.8% with 5.

Records without usable coordinates (1,958 housing records, 20.5%) are excluded from proximity shares
rather than counted as "no meter nearby". A housing row is a dataset record, not necessarily a unique
physical building. Meter status and location are a current snapshot, not a historical record matched to
each completion date. A meter is not a parking space. Full detail, including every cleaning rule, is in
[docs/method.md](docs/method.md).

## Key findings

| Question | Result from the recorded run |
|---|---|
| Q1 | Active meters per 1,000 affordable units: Queens 80.8, Manhattan 53.3, Staten Island 44.8, Brooklyn 40.4, Bronx 13.2. |
| Q2 | Share of records near an active meter runs from 53.6% (2016) to 87.6% (2015); every year from 2020 on is above 78%. |
| Q3 | New construction sits near a median of 9 active meters against 7 for preservation (Mann-Whitney, p < 0.001). |
| Q7 | 75.7% of geocoded housing records have an active meter in the window; 77.2% of meters have affordable housing in theirs. |
| Q8 | Inactive meters are slightly **more** common near new housing (18.4%) than elsewhere (16.4%). |
| Q10 | Two-hour limits dominate both groups, but three-hour limits are more common near housing (16.9% vs 11.2%). |
| Q12 | Median 429 days from project start to completion with a nearby meter, 628 days without (p = 0.001). |

All twelve answers, the association statistics behind them and the limitations are in the final two
sections of the notebook. The associations are weak: the largest absolute Spearman rho at record level
is 0.20, so these are screening results, not causal claims.

## Dashboard

- Four dropdown filters (borough, completion year, construction type, meter status) and a search field
  that recognises the same categories.
- **Generate report** re-renders all twelve charts with the current filters; **Reset** clears them.
  Changing a filter marks the charts as stale until a report is generated.
- Twelve charts covering Q1–Q12, drawn as SVG at request time: six bar charts, four scatter plots, one
  borough-by-year heatmap and one map. Hovering a bar, point or cell shows its value.
- A sticky chart index, a light/dark switch that follows the operating system until you choose one, and
  a story section with the question, key findings, limitations and the case for the analysis.
- A data table under every chart, filled on first open, holding the same numbers the chart draws.
- CSV export of the filtered housing or meter rows, and **Copy link**, which puts the current filters in
  the URL so a view can be reopened or shared.
- A method section stating the join definition (0.0009° × 0.0012° cells, a 7 × 7 window) and the
  sensitivity check, plus a team section with each member's ID and ownership.

The dashboard re-draws the notebook's twelve questions by hand in SVG, so the page needs neither a
plotting library nor a build step. One deliberate difference: Q2 is a borough-by-completion-year heatmap
on the site instead of the notebook's single citywide line, because the yearly line hides the borough
differences the question is about. Cells with fewer than ten usable records show a dash rather than a
percentage, since one record would move them by tens of points.

### Accessibility and print

The dashboard is built for keyboard use (skip link, visible focus, chart containers that become
focusable only when they scroll sideways), keeps text at WCAG 2.2 AA contrast in both themes, and
respects `prefers-reduced-motion` by dropping movement while keeping colour and the chart fade, which is
a brightness change rather than motion. Charts carry text labels and accessible descriptions, and every
chart's numbers are also available as a table, so nothing depends on colour or on reading an SVG.
Printing forces the light palette and hides the interactive chrome.

## Team contributions

| Member | Student ID | Research questions and charts | Data cleaning | Integration | Website part |
|---|---|---|---|---|---|
| Ahmed Sayed | 16008533 | Q1: active meters per 1,000 affordable units by borough (bar). Q2: share of housing records near an active meter by completion year (line). | Housing dataset: missing values and duplicates | Aggregation of housing data | Dropdown filters |
| Mohannad Hany | 16008825 | Q3: nearby active meters, new construction vs preservation (box). Q4: 3-bedroom-plus share vs nearby meters (scatter). | Transport dataset: missing values and duplicates | Aggregation of transport data | Search mode |
| Abdelrahman Mohamed | 16001205 | Q5: income-band shares vs nearby meters (scatter). Q6: community-board new units vs average nearby meters (scatter). | Housing dataset: outliers (IQR + domain rules) | Merge and join-key justification | Generate report callback |
| Mohamed Wael | 16003528 | Q7: housing and meter locations on one map. Q8: meter status mix near vs far from new housing (stacked bar). | Transport dataset: outliers (domain rules) | Post-integration cleaning | Charts layout and styling |
| Kareem Ahmad Aly Mursy Ahmad Alguineedy | 16007546 | Q9: total housing units vs nearby active meters (scatter). Q10: meter time-limit groups by housing proximity (grouped bar). | Standardizing dates, ZIPs and boroughs (both datasets) | EDA of the integrated data | Story section |
| Deema Sameh Mahmoud Abdelwahed Seada | 16002455 | Q11: affordable-unit share vs nearby meters (scatter). Q12: project duration with and without a nearby meter (box). | Inconsistent categories and string cleaning | Feasibility check and notebook Markdown | Deployment, README, final testing |

## Documentation

| Document | Contents |
|---|---|
| [docs/README.md](docs/README.md) | Index of all project documentation. |
| [docs/method.md](docs/method.md) | Cleaning rules, the grid join, the statistics and the limitations. |
| [docs/development.md](docs/development.md) | Environment, refreshing the data snapshot, and the local tooling that is deliberately not committed. |
| [docs/notebook-audit-2026-11-03.md](docs/notebook-audit-2026-11-03.md) | Findings from the notebook and data audit, each with its fix. |
| [docs/audit-2026-11-03.md](docs/audit-2026-11-03.md) | Website audit record (resolved). |
| [docs/plan-2026-11-03.md](docs/plan-2026-11-03.md) | The dashboard redesign plan. |

## Notes

- The notebook's saved outputs come from a full top-to-bottom run, and every code cell carries its
  execution count, so the cells appear in the order they ran.
- `sample_data/` is the default folder created by Google Colab. Nothing in the analysis reads it.
- Local agent tooling (`.opencode/`, `opencode.json`, `.openchamber/`, `.playwright-cli/`) is excluded by
  `.gitignore` and is not part of the submission. See [docs/development.md](docs/development.md).

## Submission

The milestone brief asks for one team email containing all member IDs, the repository URL, the deployed
site URL and both dataset links. GitHub Pages serves the site from `main`; the checks recorded in
`docs/audit-2026-11-03.md` were run against the deployed URL, not a local server.
