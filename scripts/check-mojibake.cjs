const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const SEARCH_ROOTS = ['src', 'docs', '.github', 'test', 'scripts', 'prisma'];
const MOJIBAKE_PATTERN = /[\u00c3\u00c2\ufffd]/;

function listFiles() {
  const output = execFileSync('git', ['ls-files', ...SEARCH_ROOTS], {
    cwd: join(__dirname, '..'),
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function main() {
  const offenders = [];

  for (const file of listFiles()) {
    const content = readFileSync(join(__dirname, '..', file), 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (MOJIBAKE_PATTERN.test(line)) {
        offenders.push(`${file}:${index + 1}`);
      }
    });
  }

  if (offenders.length > 0) {
    throw new Error(
      `Mojibake-like characters found:\n${offenders.join('\n')}`,
    );
  }

  console.log('[check-mojibake] no mojibake-like characters found');
}

main();
