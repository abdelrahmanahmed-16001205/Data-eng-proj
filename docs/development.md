# Development notes

## Environment

| Item | Value |
|---|---|
| Python | 3.10 or newer (the recorded run used 3.14) |
| Packages | `pandas>=2.2`, `numpy>=1.26`, `matplotlib>=3.9`, `scipy>=1.11`, `seaborn>=0.13` |
| Install | `pip install -r requirements.txt` |
| Internet | Required: both datasets are downloaded on every run |

`matplotlib>=3.9` is a real floor, not a preference: the notebook calls `ax.boxplot(..., tick_labels=...)`,
which older versions do not accept. `seaborn` draws the five EDA figures; the twelve research-question
figures use matplotlib directly. `plotly`, `nbconvert` and `kaleido` are not needed and are not imported.

## Running the notebook

```powershell
jupyter lab Milestone1_FINAL_SUBMISSION_REVIEWED.ipynb
```

Run all cells top to bottom. Two things to know before you do:

- **The notebook writes to `Data/` relative to the working directory.** Run it from the repository root
  and it refreshes the committed CSVs. Run it from anywhere else and it writes a new `Data/` folder there,
  leaving the committed snapshot untouched. That second option is how the committed snapshot was
  protected while the notebook was re-executed.
- **Every run re-downloads the source data**, so the numbers move when NYC Open Data changes. That is
  expected, not a bug.

## Refreshing the data snapshot

1. Run the notebook top to bottom from the repository root.
2. Commit the five CSVs in `Data/`.
3. Update any number quoted in the README, in `docs/method.md` and on the dashboard's story and method
   sections. They are written out, not computed at load time.

The committed snapshot was re-pulled on 5 November 2026, two days after the first one. Two of the 9,551
housing records changed their nearby-meter count (one meter moved) and the meter rows came back in a
different order, which changes which of the six duplicate `meter_number` rows is kept. Row counts, every
borough ratio and every headline share were unchanged. Expect that scale of drift for a re-run days later,
and a larger drift for a re-run months later.

## Verification

There is no test suite. The notebook checks itself:

- The income-band validation cell compares the six bands with `all_counted_units`.
- The coordinate cell prints how many records lost coordinates and why.
- The sensitivity cell re-runs the proximity count at three window sizes.
- The aggregation cell checks that both datasets use the same borough names before the merge.
- The final statistics cell prints one test result per research question with its sample size and p-value.

To check the CSV exports by hand, re-run the notebook in a scratch directory and compare the two `Data/`
folders column by column.

## Local tooling that is not part of the submission

These files exist on the development machine and are listed in `.gitignore`, so they never reach the
repository:

| Path | What it is | Why it is excluded |
|---|---|---|
| `.opencode/` | Project-scoped agent configuration: skills, commands, local rules. | Editor tooling. Nothing in the analysis or the dashboard reads it. |
| `opencode.json` | Agent and MCP server configuration for this checkout. | Same. |
| `.openchamber/` | Session and worktree state for the OpenChamber client. | Local state, may contain machine paths. |
| `.playwright-cli/` | Browser automation sessions and screenshots. | Generated artefacts, large and machine-specific. |
| `sample_data/` | Google Colab's default scratch folder. | About 56 MB of MNIST and California housing samples that nothing reads. |
| `__pycache__/`, `.ipynb_checkpoints/` | Python and Jupyter caches. | Generated. |

The project runs with none of them present: clone the repository, install `requirements.txt`, run the
notebook.

## Optional asset generators

`scripts/` holds two one-off generators. Neither is needed to run the notebook or the dashboard.

| Script | Output | When to run it |
|---|---|---|
| `build_boroughs.py` | `website/borough-paths.js` | Only if the borough outlines change. Downloads a GeoJSON file and projects it to SVG paths with the standard library. |
| `make_og.py` | `website/og.png` | Only if the social preview card changes. Requires Pillow and, as written, a Windows font directory. |

## Repository hygiene

- `Data/` must stay at the repository root. The dashboard fetches `../Data/*.csv` from `website/`.
- `index.html` at the root exists only to redirect to `website/`.
- The site is served by GitHub Pages from `main` with no build step. Push to `main` to redeploy; Pages
  rebuilds automatically and caches CSS and JS for about ten minutes.
