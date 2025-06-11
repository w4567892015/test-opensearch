import { Client } from '@opensearch-project/opensearch';

import { output } from './output.js';

const client = new Client({ node: 'http://localhost:9200' });

const index = 'group_index';

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
async function searchName(nameQuery, page = 1, pageSize = 20) {
  const body = {
    query: {
      match: {
        name: {
          query: nameQuery,
        },
      },
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

// 範例使用
(async () => {
  const nameQuery = 'Test3';
  const page = 1;
  const pageSize = 20;

  await searchAll(page, pageSize);
  console.log('--------------------');
  await searchName(nameQuery, page, pageSize);
})();
