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

const exists = await client.indices.exists({ index: 'group_user_index' });

if (!exists.body) {
  await client.indices.create({
    index: 'group_user_index',
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
          users: {
            type: "nested",
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
                search_analyzer: "ngram_search_analyzer",
                fields: {
                  keyword: { type: "keyword" }
                }
              }
            }
          }
        }
      }
    }
  });
}

// 分批查詢與寫入
const BATCH_SIZE = 5;
let offset = 0;
let totalInserted = 0;

const USERS_PER_DOC = 5000;

while (true) {
  const res = await pool.query(
    `WITH target_groups AS (
      SELECT group_id
      FROM public.group_user
      GROUP BY group_id
      ORDER BY group_id
      LIMIT $1 OFFSET $2
    )
    SELECT
      g.group_id,
      json_agg(json_build_object(
        'user_id', u.id,
        'account', u.account,
        'email', u.email,
        'display_name', u.display_name
      )) AS users
    FROM target_groups g
    JOIN public.group_user gu ON gu.group_id = g.group_id
    JOIN public.user u ON gu.user_id = u.id
    GROUP BY g.group_id
    ORDER BY g.group_id;`,
    [BATCH_SIZE, offset]
  );
  const groupUsers = res.rows;
  if (groupUsers.length === 0) break;

  // 一個 group 一個 bulk 請求
  for (const groupUser of groupUsers) {
    const users = groupUser.users;
    const totalPages = Math.ceil(users.length / USERS_PER_DOC);

    for (let page = 0; page < totalPages; page++) {
      const usersSlice = users.slice(page * USERS_PER_DOC, (page + 1) * USERS_PER_DOC);
      const bulkBody = [
        { index: { _index: 'group_user_index', _id: `${groupUser.group_id}_${page}` } },
        {
          group_id: groupUser.group_id,
          page,
          users: usersSlice
        }
      ];

      const isLastGroup = (groupUsers.indexOf(groupUser) === groupUsers.length - 1);
      const isLastPage = (page === totalPages - 1);
      const isLastBatch = groupUsers.length < BATCH_SIZE;

      const response = await client.bulk({
        body: bulkBody,
        ...(isLastGroup && isLastPage && isLastBatch ? { refresh: true } : {})
      });

      if (response.body.errors) {
        console.error(`group_id=${groupUser.group_id} page=${page} 寫入失敗`, response.body.items);
      } else {
        console.log(`group_id=${groupUser.group_id} page=${page} 寫入成功`);
      }
    }
    totalInserted += 1;
  }

  offset += BATCH_SIZE;
  if (groupUsers.length < BATCH_SIZE) break;
}

console.log(`✅ 全部 group_user 寫入完成，共 ${totalInserted} group`);
await pool.end();
