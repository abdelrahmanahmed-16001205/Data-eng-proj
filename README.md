# NYC Affordable Housing & Parking Meters

An exploratory data-engineering project that links two New York City open datasets through a grid-based
proximity window. The datasets are affordable housing production and on-street parking meters. They share
no identifier, and their address fields and dates do not line up, so the join has to be spatial.

The analysis is descriptive: it measures how often housing records and meter locations fall near each
other. It cannot show that meters cause housing, or that housing changes meter availability.

**Live dashboard:** <https://abdelrahmanahmed-16001205.github.io/Data-eng-proj/>
**Repository:** <https://github.com/abdelrahmanahmed-16001205/Data-eng-proj>

---

## Quick start

### 1. Run the notebook

Requires Python 3.10 or newer and an internet connection: both datasets are downloaded from NYC Open Data
on every run.

```powershell
pip install -r requirements.txt
pip install jupyterlab
jupyter lab analysis.ipynb
```

`requirements.txt` holds the analysis libraries; Jupyter is not in that file, so install it separately.
Run all cells from top to bottom. The run rebuilds every figure, the association-statistics table and the
five CSVs in `Data/`. Figures are saved as PNG outputs, so they render in Jupyter, VS Code, Colab and the
GitHub preview without a plotting library or a CDN script.

### 2. Run the dashboard

From the project root:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/website/>. A server is required: opening `website/index.html` directly from
the filesystem blocks the CSV requests. If `python` is not on `PATH`, use the installed executable.

---

## Repository layout

| Path | Contents |
|---|---|
| `analysis.ipynb` | The full analysis: loading, EDA, cleaning, integration, aggregation, the twelve answer figures, association statistics, findings and limitations. |
| `Data/` | Five CSV exports the dashboard reads. Must stay at the repository root. |
| `website/` | The static dashboard: `index.html`, `styles.css`, `app.js`, `borough-paths.js`, `og.png`. No build step and no runtime dependencies. |
| `index.html` | Redirects the repository root to `website/`. |
| `scripts/` | `build_boroughs.py` regenerates `website/borough-paths.js`; `make_og.py` renders `website/og.png`. Both are optional and only needed when those assets change. |
| `data-dictionary-housing.xlsx` | Field definitions published with the HPD housing dataset. |
| `data-dictionary-meters.xlsx` | Field definitions published with the DOT meter dataset. |
| `requirements.txt` | Python packages the notebook needs. |

`Data/` holds `buildings_integrated.csv`, `meters_integrated.csv`, `borough_summary.csv`,
`community_board_summary.csv` and `year_summary.csv`.

---

## Data

| Dataset | NYC Open Data ID | Link |
|---|---|---|
| Affordable Housing Production by Building (HPD) | `hg8x-zxpr` | <https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr> |
| Parking Meters Locations & Status (DOT) | `693u-uax6` | <https://data.cityofnewyork.us/Transportation/Parking-Meters-Locations-and-Status/693u-uax6> |

No raw download is committed. The snapshot in `Data/` was pulled on **5 November 2026** and holds 9,551
housing records (51 columns after cleaning) and 15,592 unique meters (21 columns). Both datasets are live
and change without notice, so a later run produces slightly different counts; re-running the notebook
refreshes `Data/` from whatever NYC Open Data serves at that moment.

---

## Method

Both files carry coordinates, so proximity is measured on a grid of cells about 100 m per side
(0.0009° latitude by 0.0012° longitude). For each record the notebook counts records of the other dataset
in a 7 × 7 cell window around it. The window is square, not a radius or a walking distance, and the
sensitivity check shows how much the result depends on it:

| Window | Housing records near an active meter |
|---|---|
| 2 cells (5 × 5) | 63.9% |
| 3 cells (7 × 7) — used here | 75.7% |
| 5 cells (11 × 11) | 87.8% |

Records without usable coordinates (1,958 housing records, 20.5%) are excluded from proximity shares,
since a missing coordinate is not evidence of a missing meter. A housing row is a dataset record and may
not be a unique physical building: 123 buildings appear in 247 records, and counting each repeated
building once would remove 1,154 units (0.36% of the citywide total). Meter status and location describe
the city on the snapshot date, and the file keeps no history, so a meter cannot be matched to the
completion year of the housing beside it. A meter records paid parking equipment, not the number of
spaces it serves.

---

## Key findings

All twelve answers come from one recorded run of the notebook. The record-level associations are weak
(largest absolute Spearman rho 0.22), so these are screening results, not causal claims. The exception is
the 13-year Q2 trend (rho = 0.46), which is still not distinguishable from no trend (p = 0.12).

| Question | Result from the recorded run |
|---|---|
| Q1 | Active meters per 1,000 affordable units: Queens 80.8, Manhattan 53.3, Staten Island 44.8, Brooklyn 40.4, Bronx 13.2. |
| Q2 | Share of records near an active meter runs from 53.6% (2016) to 87.6% (2015); every year from 2020 on is above 78%. |
| Q3 | New construction sits near a median of 9 active meters against 7 for preservation (Mann-Whitney, p = 2.6 × 10⁻⁶). |
| Q4 | Larger three-bedroom-plus shares go with slightly fewer nearby meters (rho = −0.18). |
| Q5 | Only the middle-income band has a non-trivial correlation (rho = +0.16); extremely-low income is indistinguishable from zero (p = 0.43). |
| Q6 | New affordable units and average nearby meters per community board: rho = −0.22 over 59 boards (p = 0.10), not distinguishable from no relationship. |
| Q7 | 75.7% of geocoded housing records have an active meter in the window; 77.2% of meters have affordable housing in theirs. |
| Q8 | Inactive meters are slightly **more** common near new housing (18.4%) than elsewhere (16.4%); chi-square p = 0.002. |
| Q9 | Larger buildings sit near slightly more meters (rho = +0.17), consistent with a density effect. |
| Q10 | Two-hour limits dominate both groups, but three-hour limits are more common near housing (16.9% vs 11.2%); chi-square p = 1.6 × 10⁻²². |
| Q11 | A higher affordable-unit share goes with fewer nearby meters (rho = −0.20). |
| Q12 | Median 429 days from project start to completion with a nearby meter, 628 days without (Mann-Whitney, p = 0.001). |

The full table of tests, with sample sizes and p-values, is printed by the association-statistics cell.
Every answer is discussed with its limitations in the final notebook section.

---

## Dashboard

- Four dropdown filters (borough, completion year, construction type, meter status) and a search field
  that recognises the same categories, with example queries one click away.
- **Generate report** re-renders all twelve charts with the current filters; **Reset** clears them.
  Changing a filter marks the charts as stale until a report is generated.
- Twelve charts covering Q1–Q12, drawn as SVG at request time: six bar charts, four scatter plots, one
  borough-by-year heatmap and one map. Hovering a bar, point or cell shows its value.
- A sticky chart index, a light/dark switch that follows the operating system until you choose one, and
  a story section with the question, key findings, limitations and the case for the analysis.
- A sortable data table under every chart, filled on first open, holding the same numbers the chart draws.
- CSV export of the filtered housing or meter rows, **Copy link** (which puts the current filters in the
  URL so a view can be reopened or shared), and **Print / PDF** for a paper copy.
- Keyboard support: skip link, visible focus, `/` to jump to search, `Esc` to leave it, and chart
  containers that become focusable only when they scroll sideways.

The dashboard redraws the notebook’s twelve questions by hand in SVG, so the page needs neither a plotting
library nor a build step. Five charts change type. Q2 becomes a heatmap of borough against completion year,
because the notebook’s single citywide line hides the borough differences the question is about, and cells
with fewer than ten usable records show a dash, since one record would move a percentage by tens of points.
Q3 and Q12 show the notebook’s medians as bars instead of box plots. Q5 collapses six scatter panels into
one bar chart of mean nearby meters per income band. Q7 draws the same two point layers over simplified
borough outlines. Q1 and Q10 keep their bars but turn them through 90°. The distributions and scatter
clouds behind the other charts stay in the notebook.

The page keeps text at WCAG 2.2 AA contrast in both themes, respects `prefers-reduced-motion` by dropping
movement while keeping colour changes, labels every chart and gives its numbers as a table.
Printing forces the light palette and hides the interactive chrome.

---

## Deployment

The site is plain HTML, CSS and JavaScript, so it needs no build step. It is deployed on **GitHub Pages**:

1. Push the repository to GitHub with the site files on `main`.
2. In **Settings → Pages**, set **Source** to *Deploy from a branch*, then choose branch `main` and folder
   `/ (root)`.
3. GitHub publishes the repository root. `index.html` there redirects to `website/`, and Pages serves the
   dashboard at `https://<user>.github.io/Data-eng-proj/website/`.

All asset and CSV paths are relative (`../Data/*.csv`), so the same files also work on Netlify, Vercel,
Render or any static host that publishes the repository root. No environment variables, server code or
API keys are involved.

If the repository is renamed or forked, update the canonical, Open Graph and footer links in
`website/index.html` to the new URL.

---

## Team contributions

| Member | Student ID | Research questions and charts | Data cleaning | Integration | Website part |
|---|---|---|---|---|---|
| Ahmed Sayed | 16008533 | Q1: active meters per 1,000 affordable units by borough (bar). Q2: share of housing records near an active meter by completion year (line). | Housing dataset: missing values and duplicates | Aggregation of housing data | Dropdown filters |
| Mohannad Hany | 16008825 | Q3: nearby active meters, new construction vs preservation (box). Q4: 3-bedroom-plus share vs nearby meters (scatter). | Transport dataset: missing values and duplicates | Aggregation of transport data | Search mode |
| Abdelrahman Mohamed | 16001205 | Q5: income-band shares vs nearby meters (scatter). Q6: community-board new units vs average nearby meters (scatter). | Housing dataset: outliers (IQR + domain rules) | Merge and join-key justification | Generate report callback |
| Mohamed Wael | 16003528 | Q7: housing and meter locations on one map. Q8: meter status mix near vs far from new housing (stacked bar). | Transport dataset: outliers (domain rules) | Post-integration cleaning | Chart layout and styling |
| Kareem Ahmad Aly Mursy Ahmad Alguineedy | 16007546 | Q9: total housing units vs nearby active meters (scatter). Q10: meter time-limit groups by housing proximity (grouped bar). | Standardising dates, ZIPs and boroughs (both datasets) | EDA of the integrated data | Story section |
| Deema Sameh Mahmoud Abdelwahed Seada | 16002455 | Q11: affordable-unit share vs nearby meters (scatter). Q12: project duration with and without a nearby meter (box). | Inconsistent categories and string cleaning | Feasibility check and notebook Markdown | Deployment, README, final testing |

---

## Reproducibility notes

- The notebook’s saved outputs come from a full top-to-bottom run, and every code cell carries its
  execution count, so the cells appear in the order they ran.
- Re-running the notebook downloads live data. Counts can move by a few records and the CSVs in `Data/`
  are replaced; the dashboard then shows the new snapshot.
- `sample_data/` is the default folder created by Google Colab. Nothing in the analysis reads it.
- Local agent tooling (`.opencode/`, `opencode.json`, `.openchamber/`, `.playwright-cli/`) is excluded by
  `.gitignore` and is not part of the submission.

## Submission

The milestone brief asks for one team email containing all member IDs, the repository URL, the deployed
site URL and both dataset links.
