# Project documentation

Start with the [README](../README.md) for the project overview and how to run it. Everything below is
the detail behind that page.

| Document | What it answers |
|---|---|
| [method.md](method.md) | How the data is cleaned, how the two datasets are linked, which statistical test each question uses, and what the results cannot support. |
| [development.md](development.md) | What to install, how to refresh the data snapshot, and which local files are deliberately not committed. |
| [notebook-audit-2026-11-03.md](notebook-audit-2026-11-03.md) | The notebook and data audit of 3 November 2026: every finding with the fix that closed it. |
| [audit-2026-11-03.md](audit-2026-11-03.md) | The website audit record, kept as written on the day, with a status header for what was fixed afterwards. |
| [plan-2026-11-03.md](plan-2026-11-03.md) | The dashboard redesign plan and the three places where the shipped site differs from it. |

## Where things live

| Need | File |
|---|---|
| The analysis and every figure | `Milestone1_FINAL_SUBMISSION_REVIEWED.ipynb` |
| The numbers the dashboard draws | `Data/*.csv` |
| The dashboard | `website/` |
| Dependencies | `requirements.txt` |
| Source field definitions | the two `.xlsx` data dictionaries at the repository root |

## Conventions used in this documentation

- Numbers quoted in the docs come from the recorded run of the notebook against the 3 November 2026
  snapshot: 9,551 housing records and 15,592 unique meters.
- "Proximity window" always means the 7 × 7 cell window with `REACH = 3`, unless a different reach is
  named.
- Percentages of housing records are shares of the 7,593 records that have usable coordinates, not of
  all 9,551.
