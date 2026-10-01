-- Mất toàn bộ dữ liệu staging (nhập lại được từ file Excel).
DROP TABLE IF EXISTS dbo.stg_daily_plans;
DROP TABLE IF EXISTS dbo.stg_color_groups;
DROP TABLE IF EXISTS dbo.stg_machines;
DROP TABLE IF EXISTS dbo.stg_batches_per_day;
DROP TABLE IF EXISTS dbo.stg_detail_orders_ext;
DROP TABLE IF EXISTS dbo.stg_detail_orders;
DROP TABLE IF EXISTS dbo.stg_dyeing_batches;
DROP TABLE IF EXISTS dbo.stg_import_runs;
