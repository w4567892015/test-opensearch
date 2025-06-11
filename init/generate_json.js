import path from 'path';
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOTAL_ROWS = 10; // Number of rows to generate

const root = path.join(__dirname, 'data');

if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

const accountStream = fs.createWriteStream(path.join(root, 'users.json'));
const groupStream = fs.createWriteStream(path.join(root, 'groups.json'));

function generateAccountObj(opts) {
  const { count, id } = opts;
  const account = `user_${count}@example.com`;
  const email = account;
  const displayName = faker.person.middleName();

  return {
    id,
    account,
    email,
    displayName,
  };
}

function generateGroupObj() {
  const name = faker.company.name();

  return {
    id: randomUUID(),
    name,
  };
}

async function generateJSONFiles() {
  let i = 0;
  accountStream.write('[\n');
  groupStream.write('[\n');

  console.log('Generating account JSON file...');

  function writeChunk() {
    let ok = true;
    let ok1 = true;

    while (i < TOTAL_ROWS && ok && ok1) {
      const opts = {
        count: i,
        id: randomUUID(),
      };

      const accountObj = generateAccountObj(opts);
      const groupObj = generateGroupObj();

      const accountStr = JSON.stringify(accountObj) + (i < TOTAL_ROWS - 1 ? ',\n' : '\n');
      const greoupStr = JSON.stringify(groupObj) + (i < TOTAL_ROWS - 1 ? ',\n' : '\n');

      ok = accountStream.write(accountStr);
      ok1 = groupStream.write(greoupStr);

      i++;
      if (i % 100000 === 0) {
        console.log(`Wrote ${i.toLocaleString()} rows...`);
      }
    }

    if (i < TOTAL_ROWS) {
      if (!ok) accountStream.once('drain', writeChunk);
      if (!ok1) groupStream.once('drain', writeChunk);
    } else {
      accountStream.write(']\n');
      groupStream.write(']\n');
      accountStream.end();
      groupStream.end();
      console.log('✅ Finished generating both JSON files.');
    }
  }

  writeChunk();
}

generateJSONFiles();
