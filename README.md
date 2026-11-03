# NYC Affordable Housing & Parking Meter Analysis

This project explores the geographic relationship between New York City affordable housing records and parking meter locations. The analysis is descriptive: the datasets share no record-level key, so the notebook links them with a grid-based proximity measure. Results do not establish causation, parking capacity, or historical meter availability.

- **Live dashboard:** <https://abdelrahmanahmed-16001205.github.io/Data-eng-proj/>
- **GitHub repository:** <https://github.com/abdelrahmanahmed-16001205/Data-eng-proj>

## Project contents

| Path | Contents |
|---|---|
| `Milestone1_FINAL_SUBMISSION_REVIEWED.ipynb` | Data loading, EDA, pre- and post-integration cleaning, integration, summaries, the twelve Plotly figures, findings, limitations, and team contributions. |
| `Data/` | Five integrated CSV exports: `buildings_integrated.csv`, `meters_integrated.csv`, `borough_summary.csv`, `community_board_summary.csv`, `year_summary.csv`. These are the dashboard inputs and must stay at the repository root. |
| `website/` | The static dashboard: `index.html`, `styles.css`, `app-final.js`, the generated `borough-paths.js`, and the social preview image `og.png`. No build step, no dependencies. |
| `index.html` | Redirects the repository root to `website/`. |
| `scripts/` | `build_boroughs.py` regenerates the simplified borough outlines in `website/borough-paths.js`; `make_og.py` renders `website/og.png`. Both are optional and only needed when those assets change. |
| `docs/` | `audit-2026-11-03.md` (accessibility, performance and content findings) and `plan-2026-11-03.md` (the redesign plan). |
| `*.xlsx` | Field references for the two source datasets. |

## Datasets

1. **Affordable Housing Production by Building (HPD)** — NYC Open Data ID `hg8x-zxpr`:
   <https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr>
2. **Parking Meters Locations & Status (DOT)** — NYC Open Data ID `693u-uax6`:
   <https://data.cityofnewyork.us/Transportation/Parking-Meters-Locations-and-Status/693u-uax6>

The notebook downloads both datasets in full from NYC Open Data when it runs, so no source file is committed. The snapshot in `Data/` holds 9,551 housing records (51 columns after cleaning) and 15,592 meter records (21 columns). Live data changes: six meter records have been added since this snapshot, so a later run will produce slightly different counts.

## Live dashboard

The dashboard is hosted on GitHub Pages from the `main` branch, repository root. The root `index.html` forwards to `website/`, and the page fetches its CSVs from `../Data/`, so `Data/` must remain at the repository root.

To redeploy, push to `main`. Pages rebuilds automatically; check the build under **Settings → Pages**. There is no build step, no package installation, and no server-side code.

## Run the dashboard locally

From the project root:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/website/>. The server is required: opening `website/index.html` directly from the filesystem blocks the CSV fetches. If `python` is not on PATH, use the installed Python executable.

## Dashboard features

- Four dropdown filters (borough, completion year, construction type, meter status) and a search field that recognises the same categories.
- A **Generate report** button that re-renders all twelve charts together with the current filters, plus a **Reset** that clears them. Changing a filter marks the charts as stale until a report is generated.
- Twelve charts covering Q1–Q12, drawn as SVG at request time: six bar charts, four scatter plots, one borough-by-year heatmap and one map. Hovering a bar, point or cell shows its value.
- A sticky chart index, a light/dark switch that follows the operating system until you choose one, and a story section with the question, key findings, limitations, and the case for the analysis.
- A data table under every chart, filled on first open, holding the same numbers the chart draws.
- CSV export of the filtered housing or meter rows, and **Copy link**, which puts the current filters in the URL so a view can be reopened or shared.
- A method section that states the join definition (0.0009° × 0.0012° cells, a 7 × 7 window) and the sensitivity check that gives 63.9% / 75.7% / 87.8% for 2-, 3- and 5-cell windows.
- A team section that lists each member with their student ID and the questions and pipeline work they owned.

The notebook renders the same questions as Plotly figures, including line and box views. The website re-draws them with a small amount of hand-written SVG so the page needs neither a plotting library nor a build step. One deliberate difference: Q2 is a borough-by-completion-year heatmap on the site instead of the notebook's single line, because the yearly citywide line hides the borough differences the question is about. Cells with fewer than ten usable records are shown as a dash rather than a percentage, since a single record would move them by tens of points.

### Accessibility and print

The dashboard is built for keyboard use (skip link, visible focus, chart containers that become focusable only when they scroll sideways), keeps text at WCAG 2.2 AA contrast in both themes, and respects `prefers-reduced-motion` by dropping movement — transforms and the theme reveal — while keeping colour and the chart fade, which is a brightness change rather than motion. Charts carry text labels and accessible descriptions, and every chart's numbers are also available as a table, so nothing depends on colour or on reading an SVG. Printing forces the light palette and hides the interactive chrome.

## Analysis method and interpretation

Housing and meter locations are linked using a square grid neighbourhood window because the files do not share a direct key. Missing coordinates cannot be assigned a reliable proximity value, so records without coordinates are excluded from proximity shares rather than counted as "no meter nearby" — 20.5% of housing records fall into that group. A housing row represents a dataset record and is not necessarily a unique physical building. Meter status and location are a current snapshot and are not historical observations for each housing completion date. A meter is not equivalent to a parking space. Results are descriptive and sensitive to the proximity-window definition.

## Team contributions

| Member | Student ID | Research questions and charts | Data cleaning | Integration | Website part |
|---|---|---|---|---|---|
| Ahmed Sayed | 16008533 | Q1: active meters per 1,000 affordable units by borough (bar). Q2: share of housing records near an active meter by completion year (line). | Housing dataset: missing values and duplicates | Aggregation of housing data | Dropdown filters |
| Mohannad Hany | 16008825 | Q3: median nearby active meters, new construction vs preservation (bar). Q4: 3-bedroom-plus share vs nearby meters (scatter). | Transport dataset: missing values and duplicates | Aggregation of transport data | Search mode |
| Abdelrahman Mohamed | 16001205 | Q5: mean nearby meters by income band (bar). Q6: community-board new units vs average nearby meters (scatter). | Housing dataset: outliers (IQR + domain rules) | Merge and join-key justification | Generate Report callback |
| Mohamed Wael | 16003528 | Q7: housing and meter locations on one map. Q8: meter status mix near vs far from new housing (grouped bar). | Transport dataset: outliers (domain rules) | Post-integration cleaning | Charts layout and styling |
| Kareem Ahmad Aly Mursy Ahmad Alguineedy | 16007546 | Q9: total housing units vs nearby active meters (scatter). Q10: meter time-limit groups by housing proximity (bar). | Standardizing dates, ZIPs and boroughs (both datasets) | EDA of the integrated data | Story section |
| Deema Sameh Mahmoud Abdelwahed Seada | 16002455 | Q11: affordable-unit share vs nearby meters (scatter). Q12: median project duration with and without a nearby meter (bar). | Inconsistent categories and string cleaning | Feasibility check and notebook Markdown | Deployment, README, final testing |

## Notebook notes

- Run the notebook top to bottom to regenerate every CSV in `Data/` and every figure. The notebook downloads the two source datasets, so an internet connection is required.
- The submitted copy was exported with cleared execution counters; the saved outputs come from the recorded run described in the markdown.
- `sample_data/` is the default folder created by Google Colab. Nothing in the analysis reads it.

## Submission

The milestone brief asks for one team email containing all member IDs, the GitHub repository URL, the deployed site URL, and both dataset links. GitHub Pages serves the site from `main`; the checks in `docs/audit-2026-11-03.md` were re-run against the deployed URL, not a local server.
