#!/usr/bin/env node

const { readdirSync } = require('node:fs');
const { extname, join, sep } = require('node:path');

const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  '.expo',
  '.next',
  '.tmp-tests',
  'coverage',
  'dist',
  'build',
  'node_modules',
]);

function normalizeExtensions(extensions) {
  return new Set(
    extensions.map((extension) => (extension.startsWith('.') ? extension : `.${extension}`)),
  );
}

function toPosixPath(value) {
  return value.split(sep).join('/');
}

function listFiles(targets, options = {}) {
  const {
    extensions = ['.ts', '.tsx'],
    ignoredDirs = DEFAULT_IGNORED_DIRS,
  } = options;
  const allowedExtensions = normalizeExtensions(extensions);
  const files = [];

  function walk(relativeDir) {
    const entries = readdirSync(relativeDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        walk(join(relativeDir, entry.name));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!allowedExtensions.has(extname(entry.name))) {
        continue;
      }

      files.push(toPosixPath(join(relativeDir, entry.name)));
    }
  }

  for (const target of targets) {
    walk(target);
  }

  return files.sort();
}

module.exports = {
  listFiles,
};
