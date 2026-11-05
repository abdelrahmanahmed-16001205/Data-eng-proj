# Method

The notebook is the reference implementation; this page explains the decisions behind it so a reader can
judge the results without reading 43 code cells.

## 1. Sources

| Dataset | ID | Rows | Columns used | Last updated at the time of the snapshot |
|---|---|---|---|---|
| Affordable Housing Production by Building (HPD) | `hg8x-zxpr` | 9,551 | 41 | 30 September 2026 |
| Parking Meters Locations & Status (DOT) | `693u-uax6` | 15,598 | 17 | 2 November 2026 |

Both are downloaded in full from the CSV export endpoint
(`https://data.cityofnewyork.us/api/views/{id}/rows.csv?accessType=download`). The CSV endpoint is used
rather than the SODA JSON endpoint because the JSON view exposes only 26 of the housing fields and hides
the income bands, bedroom counts and dates the questions need.

Column names are lowercased and reduced to `snake_case` before anything else, so later code cannot
depend on capitalisation or on the spaces in names such as `Meter Number`.

## 2. Cleaning: housing

- Borough text is stripped and uppercased so it matches the meter file.
- Exact duplicate rows are dropped. Records are **not** deduplicated by `building_id`, because a building
  that received more than one subsidy legitimately appears in more than one project. The cost of that
  choice is measured: 123 buildings appear in 247 project records, and those records carry 21,098 of the
  320,946 counted units (6.6%). Most of that belongs to each building's first record, so counting every
  building once instead removes only 1,154 units (0.36%).
- `project_start_date` and `building_completion_date` are parsed with `errors='coerce'`; invalid dates
  become missing. `completion_year` is kept only inside 2014 to the current year, because the dataset
  starts in 2014. `duration_days` is completion minus start, with negative values set to missing.
- Negative unit counts are treated as errors and set to missing. A blank unit count is treated as zero,
  which is an assumption: the dictionary does not define a blank. It is testable, and the validation cell
  tests it — the six income bands sum exactly to `all_counted_units` for all 9,522 records that have a
  value, so blank-as-zero is consistent with the published totals.
- `total_units` falls back to `all_counted_units` when missing and is raised to `all_counted_units` when
  it is smaller, then records with no total at all are dropped (29 records).
- Coordinates prefer the internal lot centroid (`latitude_internal`/`longitude_internal`) and fall back
  to the address estimate, then anything outside 40.4–41.0 N and 74.3–73.6 W is set to missing. 1,958
  records (20.5%) end up without coordinates.
- Confidential projects are flagged from the project name. They are kept, not dropped.
- `cb_id` is the community board as published (`BK-05`), which already carries the borough prefix; board
  numbers repeat across boroughs, so the prefix is what makes the key unique.
- Shares (`share_3br_plus`, the six income bands, `affordable_share`) are computed only where
  `all_counted_units` is present and non-zero.

## 3. Cleaning: meters

- Borough and status are stripped and uppercased. A missing status becomes `UNKNOWN` so it can never be
  counted as active.
- Facility labels are title-cased and a missing value becomes `Unknown`.
- Exact duplicates are dropped, then one row per `meter_number` is kept, because the field is documented
  as the unique meter identifier. That step removes 6 of 15,598 rows, which is why the analysis uses
  15,592 meters.
- `time_limit_hr` is the first `NN HR` value found in the free-text `meter_hours` field. It is a
  simplification: a meter with separate weekday and weekend rules is summarised by the first rule only.
  Text with no hour rule ("Rate NOT Available", minutes-based limits, blank) stays missing and those
  meters are left out of Q10 only.
- Time limits are grouped for Q10 as 1 hr, 2 hr, 3 hr, 4–6 hr and 7+ hr (all day).

## 4. Integration

There is no shared key: the meter file has no project ID, ZIP, community board or project date. The join
is therefore spatial.

- Each record is assigned a grid cell with `floor(lat / 0.0009)` and `floor(lon / 0.0012)`, which is
  about 100 m per side in New York.
- For every target record, `neighbour_total` sums the source records in the (2·`REACH`+1)² cells around
  it. With `REACH = 3` that is a 7 × 7 window, roughly 300–400 m to the edge and up to about 500 m at the
  corners.
- Building side: `meters_nearby` counts active meters, `inactive_nearby` counts inactive ones,
  `avg_time_limit_nearby` averages the parsed limits, and `near_meter` is 1 when at least one active meter
  is in the window. `near_meter` is missing, not 0, when a record has no coordinates.
- Meter side: `buildings_nearby`, `new_buildings_nearby`, `near_housing` and `near_new_housing` are built
  the same way.
- The window is square, not a circle, and is not a walking or road-network distance. The sensitivity
  check in Step 9 re-runs the building-side count at `REACH` 2, 3 and 5: 63.9%, 75.7% and 87.8% of
  geocoded housing records are near an active meter. The result therefore depends materially on the
  window definition, which is why the window is stated everywhere the result is quoted.

## 5. Aggregation

Three summaries, one per group of questions:

- **Borough** (Q1): active meters divided by affordable units per 1,000. It is a borough-wide ratio, not
  a ratio of the meters that happen to be near housing. The housing and meter borough summaries are
  outer-joined, and the join is checked for borough names that exist on only one side.
- **Community board** (Q6): new-construction records only, grouped by `cb_id`, with unit totals, average
  nearby active meters and share near a meter.
- **Completion year** (Q2): records with a usable completion year, with the share near an active meter.

## 6. Statistics

The charts show shape; one cell puts a number on each comparison.

| Test | Used for | Why |
|---|---|---|
| Spearman's rho | Q2, Q4, Q5, Q6, Q9, Q11 | The x variables are skewed shares and counts, and the relationship need not be linear. |
| Mann-Whitney U | Q3, Q12 | Two groups, a skewed count and a skewed duration; a mean difference would be led by the tail. |
| Chi-square | Q8, Q10 | Two categorical variables in a contingency table. |

Q8's table has a third status, `UNKNOWN`, that holds 36 of 15,592 meters. It is shown in the chart but
left out of the test, because expected counts that small make the chi-square statistic unreliable; the
test therefore compares ACTIVE against INACTIVE only (p = 0.002). Q10 uses all five time-limit groups
(p = 1.6 × 10⁻²²).

With about 7,500 records almost any difference is significant, so the size of the statistic matters more
than the p-value. Every record-level association is weak: |rho| between 0.16 and 0.20. Q2 has only 13
yearly points (p = 0.12) and Q6 has 59 community boards (p = 0.10), so neither reaches significance even
though both are reported.

## 7. What the results cannot support

- **Causation.** Nothing here shows that meters affect housing or the reverse.
- **Capacity.** A meter is not a parking space, and occupancy, price and demand are not in either file.
- **History.** Meter locations and status are today's snapshot; a 2015 building is compared with 2026
  meters.
- **Unique buildings.** A housing row is a dataset record. 123 buildings appear in 247 project records,
  which double-counts 1,154 counted units (0.36%) against counting each building once.
- **Distance.** The window is a square approximation. A true radius or a network distance would give
  different shares.
- **Missing coordinates.** 20.5% of housing records cannot be placed, so they are excluded from proximity
  shares rather than assumed to have no nearby meter.
- **Same-day completions.** 2,824 of the 7,865 records with a duration completed in 0 days. They are kept
  because a same-day close-and-complete is plausible for preservation records, but they pull the Q12
  medians down.
