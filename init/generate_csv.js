import path from 'path';
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOTAL_USERS = 100000;    // 產生 10 個 user
const TOTAL_GROUPS = 100;    // 產生 5 個 group

const root = path.join(__dirname, 'data');
if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

const userStream = fs.createWriteStream(path.join(root, 'user.csv'));
const groupStream = fs.createWriteStream(path.join(root, 'group.csv'));
const groupUserStream = fs.createWriteStream(path.join(root, 'group_user.csv'));

// 產生所有 user
const users = Array.from({ length: TOTAL_USERS }).map((_, i) => ({
  id: randomUUID(),
  account: `user_${i}@example.com`,
  email: `user_${i}@example.com`,
  displayName: faker.person.fullName(),
}));

// 寫入 users.csv
users.forEach((user, i) => {
  userStream.write(`${user.id},${user.account},${user.email},${user.displayName}\n`);
});
userStream.end();

console.log(`✅ Finished generating ${TOTAL_USERS} users in user.csv`);

// 產生 group
const groups = Array.from({ length: TOTAL_GROUPS }).map(() => ({
  id: randomUUID(),
  name: faker.company.name().replace(/,/g, ''),
}));
// 寫入 groups.csv
groups.forEach((group, i) => {
  groupStream.write(`${group.id},${group.name}\n`);
});
groupStream.end();

console.log(`✅ Finished generating ${TOTAL_GROUPS} groups in group.csv`);

// 產生 group_user 關聯，每組隨機分配 USERS_PER_GROUP 個 user
const groupUsers = groups.map(group => {
  // 隨機決定本組人數 (1 ~ TOTAL_USERS)
  const userCount = faker.number.int({ min: 1, max: TOTAL_USERS });
  // 直接隨機抽取 userCount 個 user（不重複且不需洗牌整個陣列）
  const selectedUsers = faker.helpers.arrayElements(users, userCount);
  return selectedUsers.map(user => ({
    groupId: group.id,
    userId: user.id,
  }));
}).flat();
// 寫入 group_user.csv
groupUsers.forEach((groupUser, i) => {
  groupUserStream.write(`${groupUser.groupId},${groupUser.userId}\n`);
});
groupUserStream.end();

console.log(`✅ Finished generating group-user associations in group_user.csv`);
