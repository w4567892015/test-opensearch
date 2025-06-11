import path from 'path';
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOTAL_USERS = 10;    // 產生 10 個 user
const TOTAL_GROUPS = 5;    // 產生 5 個 group

const root = path.join(__dirname, 'data');
if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

const userStream = fs.createWriteStream(path.join(root, 'users.json'));
const groupStream = fs.createWriteStream(path.join(root, 'groups.json'));
const groupUserStream = fs.createWriteStream(path.join(root, 'group_user.json'));

// 產生所有 user
const users = Array.from({ length: TOTAL_USERS }).map((_, i) => ({
  id: randomUUID(),
  account: `user_${i}@example.com`,
  email: `user_${i}@example.com`,
  displayName: faker.person.fullName(),
}));

// 寫入 users.json
userStream.write('[\n');
users.forEach((user, i) => {
  userStream.write(JSON.stringify(user) + (i < users.length - 1 ? ',\n' : '\n'));
});
userStream.write(']\n');
userStream.end();

// 產生 group
const groups = Array.from({ length: TOTAL_GROUPS }).map(() => ({
  id: randomUUID(),
  name: faker.company.name(),
}));

// 寫入 groups.json
groupStream.write('[\n');
groups.forEach((group, i) => {
  groupStream.write(JSON.stringify(group) + (i < groups.length - 1 ? ',\n' : '\n'));
});
groupStream.write(']\n');
groupStream.end();

// 產生 group_user 關聯，每組隨機分配 USERS_PER_GROUP 個 user
const groupUsers = groups.map(group => {
  // 隨機決定本組人數 (1 ~ TOTAL_USERS)
  const userCount = faker.number.int({ min: 1, max: TOTAL_USERS });
  const shuffled = faker.helpers.shuffle(users);
  return {
    group_id: group.id,
    users: shuffled.slice(0, userCount).map(u => ({
      user_id: u.id,
      account: u.account,
      email: u.email,
      display_name: u.displayName,
    })),
  };
});

// 寫入 group_user.json
groupUserStream.write('[\n');
groupUsers.forEach((gu, i) => {
  groupUserStream.write(JSON.stringify(gu) + (i < groupUsers.length - 1 ? ',\n' : '\n'));
});
groupUserStream.write(']\n');
groupUserStream.end();

console.log('✅ Finished generating users.json, groups.json, and group_user.json');
