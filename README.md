# NYC Affordable Housing & Parking Meter Analysis

This project explores the geographic relationship between New York City affordable housing records and parking meter locations. The analysis is descriptive: the datasets have no shared record-level key, so the notebook uses a grid-based proximity measure. Results do not establish causation, parking capacity, or historical meter availability.

## Project contents

- `Milestone1_FINAL_SUBMISSION_REVIEWED.ipynb` — data loading, exploration, cleaning, integration, summaries, visualizations, findings, limitations, and team contributions.
- `Data/` — five integrated CSV exports used by the dashboard.
- `website/` — local interactive dashboard with a borough filter and views for all 12 research questions.
- `Affordable_Housing_Production_by_Building_Data_Dictionary__Sept_2026_.xlsx` and `Parking_Meters_Location_Status_Data_Dictionary.xlsx` — field references.
- `SUBMISSION_CHECKLIST.md` — final handoff checklist and deployment status.

## Datasets

1. **Affordable Housing Production by Building (HPD)** — NYC Open Data ID `hg8x-zxpr`: <https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr>
2. **Parking Meters Locations & Status (DOT)** — NYC Open Data ID `693u-uax6`: <https://data.cityofnewyork.us/Transportation/Parking-Meters-Locations-and-Status/693u-uax6>

The notebook downloads full CSVs from NYC Open Data when it runs. The exported integrated tables in `Data/` are the dashboard inputs. Live source data may change, so row counts can differ on a later run.

## Run the dashboard locally

From the project root, start Python's built-in static server:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/website/> in a browser. The browser must be able to load the CSVs from the sibling `Data/` folder. If `python` is not on PATH, use the Python executable installed on your machine.

The dashboard is static and has no package installation step. It includes borough, completion year, construction type, and meter status dropdowns; a search field for place/year/category queries; a central Generate Report button; all 12 charts; and a story/limitations section. The report button updates every chart together. Google Fonts are an optional visual enhancement; system fonts are used if the font service is unavailable.

## Analysis method and interpretation

Housing and meter locations are linked using a square grid neighborhood window because the files do not share a direct key. Missing coordinates cannot be assigned a reliable proximity value. A housing row represents a dataset record and is not necessarily a unique physical building. Meter status and location are a current snapshot and are not historical observations for each housing completion date. A meter is not equivalent to a parking space. Results are descriptive and sensitive to the proximity-window definition.

## Team contributions

# Data-eng-proj

## Team Contributions

| Member | Student ID | Research Questions | Charts | Data Cleaning | Integration | Website Part |
|---|---|---|---|---|---|---|
| Ahmed Sayed | 16008533 | Q1: How many parking meters does each borough have for every 1,000 affordable units built since 2014? <br> Q2: Of the affordable buildings finished each year, what share sit within 400 m of a meter, and is that share going up or down? | Chart 1: Grouped bar <br> Chart 2: Line | Housing dataset: missing values and duplicates | Aggregation of housing data | Dropdown filters |
| Mohannad Hany | 16008825 | Q3: Are new construction buildings closer to a parking meter than preservation buildings? <br> Q4: Do buildings with more 3-bedroom-plus units have fewer meters nearby? | Chart 3: Boxplot (distance to nearest meter by construction type) <br> Chart 4: Scatter (share of 3-BR+ units vs meters within 400 m) | Transport dataset: missing values and duplicates | Aggregation of transport data | Search mode |
| Abdelrahman Mohamed | 16001205 | Q5: Are the extremely low-income units built in places with fewer meters than the moderate and middle-income units? <br> Q6: Which community boards got lots of new affordable units but have almost no meters? | Chart 5: Bar by income band (average meters nearby) <br> Chart 6: Scatter with labels (units vs meters per community board) | Housing dataset: outliers (IQR + domain rules) | Merge and join-key justification | Generate Report callback |
| Mohamed Wael | 16003528 | Q7: Do affordable housing clusters and metered streets overlap on the map, or sit in different parts of the city? <br> Q8: Are meters near new affordable housing more likely to be inactive, retired or still planned than meters elsewhere? | Chart 7: Map with both layers (buildings and meters) <br> Chart 8: Stacked bar (meter status near new housing vs elsewhere) | Transport dataset: outliers (IQR + domain rules) | Post-integration cleaning | Charts layout and styling |
| Kareem Ahmad Aly Mursy Ahmad Alguineedy | 16007546 | Q9: Are bigger buildings more likely to have off-street meters (garages and lots) nearby than on-street ones? <br> Q10: Do the meter time limits near affordable housing look different from the rest of the city? | Chart 9: Bar (nearest meter type by building size group) <br> Chart 10: Bar (time limit categories, near housing vs elsewhere) | Standardizing dates, ZIPs and boroughs (both datasets) | EDA of the integrated data | Story section |
| Deema Sameh Mahmoud Abdelwahed Seada | 16002455 | Q11: In mixed-income buildings, does the share of affordable units drop where meter density is higher? <br> Q12: Do projects take longer from start to completion in metered areas than in non-metered ones? | Chart 11: Scatter (affordable share vs meters within 400 m) <br> Chart 12: Boxplot (project duration, metered vs non-metered) | Inconsistent categories and string cleaning | Feasibility check and notebook Markdown | Deployment, README, final testing |


## Deployment

**GitHub repository:** <https://github.com/abdelrahmanahmed-16001205/Data-eng-proj>

The root `index.html` forwards to the dashboard in `website/`. Once this repository is pushed to GitHub, enable GitHub Pages for the `main` branch and root folder in **Settings → Pages**. The site reads its CSVs from `Data/`, so keep that folder at the repository root. Check that the resulting public site loads all five CSVs and that the filters, search, report button, and charts work. Add the repository and deployment URLs here before submission. A public deployment and GitHub repository are not yet available from this local workspace.

## Submission

The milestone brief requests one team email containing all member IDs, the GitHub repository URL, the deployed site URL, and both dataset links. The team should send that email after the repository and deployment URLs are live and verified.
