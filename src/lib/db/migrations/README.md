# Database migrations

This directory holds **idempotent SQL migration scripts** that need to be run
against the Supabase project before the corresponding code release goes live.

Each script is numbered sequentially (`0001`, `0002`, …) and is safe to re-run
— `add column if not exists`, `update where … is null`, etc.

## Applying a migration

1. Open the Supabase SQL editor for the target project
   (https://supabase.com/dashboard/project/&lt;project&gt;/sql)
2. Paste the entire migration file
3. Click **Run**
4. Verify with the bottom-of-file query block

## Migrations log

| File | Sprint | What it does |
|------|--------|--------------|
| `0001_sprints_2_3.sql` | 2 + 3 | Adds `tables jsonb` (white-label floor plan) and `eighty_six_list text[]` (live ruptures) to `restaurant_settings`. |

## After deploy

To verify the schema is in sync with prod, run from the SQL editor:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'restaurant_settings'
order by ordinal_position;
```

Expected columns include `tables` (`jsonb`) and `eighty_six_list` (`ARRAY`).
