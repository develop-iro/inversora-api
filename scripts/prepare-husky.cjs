#!/usr/bin/env node
'use strict';

const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

/**
 * Runs husky hook setup after install when devDependencies are present.
 * Skips silently in Docker/CI installs that omit husky (npm ci --omit=dev).
 */
const huskyBin = join(__dirname, '..', 'node_modules', 'husky', 'bin.js');

if (process.env.HUSKY === '0' || !existsSync(huskyBin)) {
  process.exit(0);
}

execSync(`node "${huskyBin}"`, { stdio: 'inherit' });
