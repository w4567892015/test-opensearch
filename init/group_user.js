import { Client } from '@opensearch-project/opensearch';

const client = new Client({ node: 'http://localhost:9200' });

const exists = await client.indices.exists({ index: 'group_user_index' });

if (!exists.body) {
  await client.indices.create({
    index: 'group_user_index',
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
                search_analyzer: "ngram_search_analyzer"
              }
            }
          }
        }
      }
    }
  });
}

const bulkBody = [];

const users = [
  { user_id: '1', account:'1_extned_vs@gmail.com', email: '', display_name: 'Andy' },
  { user_id: '2', account:'test@gmail.com', email: 'test@gmail.com', display_name: 'Test' },
  { user_id: '3', account:'test1@gmail.com', email: 'test1@gmail.com', display_name: '王小明' },
  { user_id: '4', account:'test2@gmail.com', email: 'test2@gmail.com', display_name: '王大華' },
];

const groups = [
  { group_id: 'group_000', users: [users[0], users[1]] },
  { group_id: 'group_001', users: [users[1], users[2]] },
  { group_id: 'group_002', users: [users[2], users[3]] },
  { group_id: 'group_003', users: [users[3], users[0]] },
];

// 建構 bulk API 格式
groups.forEach(group => {
  bulkBody.push({ index: { _index: 'group_user_index', _id: group.group_id } }); // 操作動作和ID
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
