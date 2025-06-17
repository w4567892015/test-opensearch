import { Client } from '@opensearch-project/opensearch';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  user: 'admin',
  password: 'admin',
  database: 'combine_test',
  port: 5432,
  max: 20,
});

const client = new Client({ node: 'http://localhost:9200' });

const exists = await client.indices.exists({ index: 'group_index' });

if (!exists.body) {
  await client.indices.create({
    index: 'group_index',
    body: {
      settings: {
        index: {
          max_ngram_diff: 9,
        },
        analysis: {
          tokenizer: {
            ngram_tokenizer: {
              type: "ngram",
              min_gram: 1,
              max_gram: 10,
              token_chars: ["letter", "digit"]
            }
          },
          analyzer: {
            ngram_analyzer: {
              type: "custom",
              tokenizer: "ngram_tokenizer",
              filter: ["lowercase"]
            },
            ngram_search_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase"]
            }
          }
        }
      },
      mappings: {
        properties: {
          group_id: { type: "keyword" },
          name: {
            type: "text",
            analyzer: "ngram_analyzer",
            search_analyzer: "ngram_search_analyzer"
          }
        }
      }
    }
  });
}

// 分批查詢與寫入
const BATCH_SIZE = 1000;
let offset = 0;
let totalInserted = 0;

while (true) {
  const res = await pool.query(
    'SELECT id AS group_id, name FROM public.group ORDER BY id LIMIT $1 OFFSET $2',
    [BATCH_SIZE, offset]
  );
  const groups = res.rows;
  if (groups.length === 0) break;

  const bulkBody = [];
  groups.forEach(group => {
    bulkBody.push({ index: { _index: 'group_index', _id: group.group_id } });
    bulkBody.push(group);
  });

  const isLastBatch = groups.length < BATCH_SIZE;
  const response = await client.bulk({
    body: bulkBody,
    ...(isLastBatch ? { refresh: true } : {})
  });

  if (response.body.errors) {
    console.error(`第 ${offset} 筆開始的部分資料寫入失敗`, response.body.items);
  } else {
    console.log(`批量寫入成功: ${offset} ~ ${offset + groups.length - 1}`);
  }

  totalInserted += groups.length;
  offset += BATCH_SIZE;

  if (isLastBatch) break;
}

console.log(`✅ 全部 group 寫入完成，共 ${totalInserted} 筆`);
await pool.end();
