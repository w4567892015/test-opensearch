import { Client } from '@opensearch-project/opensearch';

import groups from './data/groups.json' assert { type: "json" };

const client = new Client({ node: 'http://localhost:9200' });

const exists = await client.indices.exists({ index: 'group_index' });

if (!exists.body) {
  await client.indices.create({
    index: 'group_index',
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

const bulkBody = [];

// 建構 bulk API 格式
groups.forEach(group => {
  bulkBody.push({ index: { _index: 'group_index', _id: group.group_id } }); // 操作動作和ID
  bulkBody.push(group); // 真實資料
});

const response = await client.bulk({
  refresh: true,  // 插入後立即刷新索引，可立即查詢
  body: bulkBody,
});

if (response.body.errors) {
  console.error('部分資料寫入失敗', response.body.items);
} else {
  console.log('批量寫入成功');
}
