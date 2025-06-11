import { Client } from '@opensearch-project/opensearch';

import { output } from './output.js';

const client = new Client({ node: 'http://localhost:9200' });

const index = 'group_user_index';

async function searchAll(page = 1, pageSize = 20) {
  const body = {
    query: {
      match_all: {},
    },
    from: (page - 1) * pageSize,
    size: pageSize,
  };

  const result = await client.search({
    index,
    body,
  });

  output({
    total: result.body.hits.total.value,
    results: result.body.hits.hits.map((hit) => hit._source),
  });
}

// 搜尋單一 group 裡面的 display_name，支援分頁
async function searchDisplayNameByGroupId(groupId, displayNameQuery, page = 1, pageSize = 20) {
  const body = {
    _source: false,
    query: {
      bool: {
        filter: [
          { term: { group_id: groupId } },
          {
            nested: {
              path: 'users',
              query: {
                match: {
                  "users.display_name": {
                    query: displayNameQuery,
                  },
                },
              },
              inner_hits: {},
            }
          },
        ]
      }
    },
    from: (page - 1) * pageSize,
    size: pageSize,
  };

  const result = await client.search({
    index,
    body,
  });

  output({
    total: result.body.hits.total.value,
    results: result.body.hits.hits[0].inner_hits.users.hits.hits.map((hit) => hit._source),
  });
}

// 範例使用
(async () => {
  const groupId = 'fc045720-9c2d-4917-a66c-5321f62fe6bf'; // 替換為實際的 group_id
  const displayNameQuery = 'M';
  const page = 1;
  const pageSize = 20;

  await searchAll(page, pageSize);
  console.log('--------------------');
  await searchDisplayNameByGroupId(groupId, displayNameQuery, page, pageSize);
})();
