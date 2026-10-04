-- Mất toàn bộ lịch sử đồng bộ và nhật ký thay đổi (không khôi phục được từ file Excel).
DROP TABLE IF EXISTS dbo.stg_change_log;
DROP TABLE IF EXISTS dbo.stg_sync_run_tables;
DROP TABLE IF EXISTS dbo.stg_sync_runs;
