import { Client } from '@opensearch-project/opensearch';

const client = new Client({ node: 'http://localhost:9200' });

const index = 'group_user_index';

// 根據 user_id 更新 display_name
async function updateUserDisplayName(userId, newDisplayName) {
  try {
    const response = await client.updateByQuery({
      index,
      body: {
        script: {
          lang: 'painless',
          source: `
            for (int i = 0; i < ctx._source.users.size(); i++) {
              if (ctx._source.users[i].user_id == params.user_id) {
                ctx._source.users[i].display_name = params.new_display_name;
              }
            }
          `,
          params: {
            user_id: userId,
            new_display_name: newDisplayName,
          },
        },
        query: {
          nested: {
            path: 'users',
            query: {
              term: {
                'users.user_id': userId,
              },
            },
          },
        },
      },
      refresh: true, // 立即生效，可依實際情況調整
    });
    console.log(`更新完成，共更新 ${response.body.updated} 筆 group`);
  } catch (error) {
    console.error('更新失敗:', error);
  }
}

// 範例使用
(async () => {
  const userId = '1'; // 替換為實際 user_id
  const newDisplayName = 'new test';
  await updateUserDisplayName(userId, newDisplayName);
})();
