import { Pool } from 'pg'
import { Client } from '@opensearch-project/opensearch';

const pool = new Pool({
  host: 'localhost',
  user: 'admin',
  password: 'admin',
  database: 'combine_test',
  port: 5432,
  max: 20,
});

const client = new Client({
  node: 'http://localhost:9200'
});

const exists = await client.indices.exists({ index: 'user_index' });

if (!exists.body) {
  await client.indices.create({
    index: 'user_index',
    body: {
      settings: {
        index: {
          max_ngram_diff: 9, // 允許的最大 ngram 差異
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
          user_id: { type: "keyword" },
          account: { type: "keyword" },
          email: {
            type: "text",
            analyzer: "ngram_analyzer",
            search_analyzer: "ngram_search_analyzer"
          },
          display_name: {
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
    'SELECT id AS user_id, account, email, display_name FROM public.user ORDER BY id LIMIT $1 OFFSET $2',
    [BATCH_SIZE, offset]
  );
  const users = res.rows;
  if (users.length === 0) break;

  const bulkBody = [];
  users.forEach(user => {
    bulkBody.push({ index: { _index: 'user_index', _id: user.user_id } });
    bulkBody.push(user);
  });

  const isLastBatch = users.length < BATCH_SIZE;
  const response = await client.bulk({
    body: bulkBody,
    ...(isLastBatch ? { refresh: true } : {})
  });

  if (response.body.errors) {
    console.error(`第 ${offset} 筆開始的部分資料寫入失敗`, response.body.items);
  } else {
    console.log(`批量寫入成功: ${offset} ~ ${offset + users.length - 1}`);
  }

  totalInserted += users.length;
  offset += BATCH_SIZE;
}

console.log(`✅ 全部寫入完成，共 ${totalInserted} 筆`);
await pool.end();
