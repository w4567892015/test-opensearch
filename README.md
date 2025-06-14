# OpenSearch + PostgreSQL FDW Demo

本專案示範如何結合 NodeJS、OpenSearch 以及 PostgreSQL（含 FDW 跨資料庫查詢）進行大數據測試與資料初始化。

## 目錄結構

```
.
├── init/
│   ├── data/                # 產生用的 CSV 測試資料
│   ├── generate_csv.js      # 產生 user/group/group_user CSV 的腳本
│   └── generate_json.js     # 產生 JSON 測試資料的腳本
├── sql/
│   ├── init.sql             # PostgreSQL 初始化腳本（建表、匯入資料）
│   └── fdw.sql              # FDW 與 materialized view 設定
├── docker-compose.yaml      # Docker Compose 設定（Postgres）
└── README.md
```

## 快速開始

1. **產生測試資料**
   ```sh
   node init/generate_csv.js
   ```

2. **啟動 PostgreSQL（含自動初始化）**
   ```sh
   docker-compose up -d
   ```

## 主要功能

- 大量 user/group/group_user 測試資料自動產生
- PostgreSQL 多資料庫自動建表、匯入資料
- FDW 跨資料庫查詢與 materialized view
- 可搭配 OpenSearch 進行全文檢索測試

## 注意事項

- `docker-entrypoint-initdb.d` 只會在資料目錄為空時自動執行
- FDW 相關 SQL 建議在所有資料庫 ready 後再執行
- 若遇到連線問題，請檢查 docker-compose 的 host 設定與權限

## 參考

- [PostgreSQL 官方 Docker 說明](https://hub.docker.com/_/postgres)
- [OpenSearch 官方文件](https://opensearch.org/docs/)
- [@faker-js/faker](https://github.com/faker-js/faker)
