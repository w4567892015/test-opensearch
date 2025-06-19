import path from 'path';
import fs from 'fs';
import { v5 as uuidv5 } from 'uuid';
import { faker } from '@faker-js/faker';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, workerData } from 'worker_threads';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // 固定 namespace

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOTAL_USERS = 10000000;
const TOTAL_GROUPS = 1000;
const MIN_USERS_PER_GROUP = 10;
const MAX_USERS_PER_GROUP = 300000;
const WORKER_COUNT = 4; // 可依 CPU 調整

const root = path.join(__dirname, 'data');
if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

const userCsvPath = path.join(root, 'user.csv');
const groupCsvPath = path.join(root, 'group.csv');
const groupUserCsvPath = path.join(root, 'group_user.csv');

if (isMainThread) {
  const userStream = fs.createWriteStream(userCsvPath);
  const groupStream = fs.createWriteStream(groupCsvPath);

  for (let i = 0; i < TOTAL_USERS; i++) {
    const id = uuidv5(`user_${i}`, UUID_NAMESPACE);
    const account = `user_${i}@example.com`;
    const email = `user_${i}@example.com`;
    const displayName = faker.person.fullName();
    if (!userStream.write(`${id},${account},${email},${displayName}\n`)) {
      // 若 buffer 滿了，等待 drain
      await new Promise(resolve => userStream.once('drain', resolve));
    }
  }
  userStream.end();
  console.log(`✅ Finished generating ${TOTAL_USERS} users in user.csv`);

  // 產生 group
  const groups = [];
  for (let i = 0; i < TOTAL_GROUPS; i++) {
    const id = uuidv5(`group_${i}`, UUID_NAMESPACE);;
    const name = faker.company.name().replace(/,/g, '');
    if (!groupStream.write(`${id},${name}\n`)) {
      // 若 buffer 滿了，等待 drain
      await new Promise(resolve => groupStream.once('drain', resolve));
    }
    groups.push({ id, name });
  }
  groupStream.end();
  console.log(`✅ Finished generating ${TOTAL_GROUPS} groups in group.csv`);

  // 多 worker 產生 group_user 關聯，各自產生檔案
  const groupPerWorker = Math.ceil(TOTAL_GROUPS / WORKER_COUNT);
  const workers = [];
  for (let w = 0; w < WORKER_COUNT; w++) {
    const start = w * groupPerWorker;
    const end = Math.min((w + 1) * groupPerWorker, TOTAL_GROUPS);

    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'generate_csv.js'), {
          workerData: {
            count: w,
            groups: groups.slice(start, end),
          }
        });
        worker.on('exit', resolve);
        worker.on('error', reject);
      })
    );
  }
  await Promise.all(workers);
  console.log(`✅ Finished generating group-user associations in group_user_part_*.csv`);

  function appendFileStream(src, dest) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(src);
      readStream.on('error', reject);
      readStream.on('end', resolve);
      readStream.pipe(dest, { end: false });
    });
  }
  // 合併所有 group_user_part_*.csv
  const groupUserStream = fs.createWriteStream(groupUserCsvPath);
  for (let w = 0; w < WORKER_COUNT; w++) {
    const partFile = path.join(root, `group_user_part_${w}.csv`);
    await appendFileStream(partFile, groupUserStream);
    fs.unlinkSync(partFile); // 合併後立即刪除分檔
  }
  groupUserStream.end();
  console.log('✅ All group_user_part_*.csv files combined into group_user.csv');
} else {
  const { groups, count } = workerData;
  const fileName = `group_user_part_${count}.csv`;
  const groupUserStream = fs.createWriteStream(path.join(root, fileName));
  // 產生 group_user 關聯（每個 group user 數量隨機，group 內 user 隨機且不重複，極省記憶體）
  for (const group of groups) {
    const userCount = faker.number.int({ min: MIN_USERS_PER_GROUP, max: MAX_USERS_PER_GROUP });
    const userSet = new Set();
    while (userSet.size < userCount) {
      userSet.add(faker.number.int({ min: 0, max: TOTAL_USERS - 1 }));
    }
    for (const userIdx of userSet) {
      const userId = uuidv5(`user_${userIdx}`, UUID_NAMESPACE);
      if (!groupUserStream.write(`${group.id},${userId}\n`)) {
        await new Promise(resolve => groupUserStream.once('drain', resolve));
      }
    }
  }
  groupUserStream.end();
  console.log(`✅ Finished generating group-user associations in ${fileName}`);
}
