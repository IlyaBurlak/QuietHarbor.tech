import assert from 'node:assert/strict';
import { PassThrough, Writable } from 'node:stream';
import test from 'node:test';
import { input } from '../src/tui.mjs';

test('при вставке пароля сохраняются все символы, а вывод остаётся скрытым', async () => {
  const stdin = new PassThrough();
  let output = '';
  const out = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk;
      callback();
    },
  });
  const password = "Sample'$-key-782!";
  const answer = input({ message: 'Пароль', secret: true, stdin, out });

  stdin.write(`${password}\r`);

  assert.equal(await answer, password);
  assert.ok(output.includes('•'.repeat(password.length)));
  assert.ok(!output.includes(password));
});
