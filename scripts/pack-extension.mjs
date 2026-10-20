#!/usr/bin/env node
/**
 * Package extension/ as a store-ready ZIP with manifest.json at the archive root.
 * Usage: node scripts/pack-extension.mjs [--check-only] [--list-only]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT, 'extension');
const DIST_DIR = path.join(ROOT, 'dist');

const PACK_ROOT_FILES = ['manifest.json', 'background.js'];
const PACK_DIRS = ['icons', 'lib', 'popup'];

const REMOTE_SCRIPT_RE = /<script[^>]+src\s*=\s*["']https?:\/\/[^"']+["']/i;
const REMOTE_IMPORT_RE = /\bimport\s*\(\s*["']https?:\/\/|(?:import\s+[\s\S]*?from\s+|require\s*\(\s*)["']https?:\/\//;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; };

function buildZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const deflated = deflateRawSync(data);
    const useStore = deflated.length >= data.length;
    const payload = useStore ? data : deflated;
    const method = useStore ? 0 : 8;

    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0),
      u32(crc), u32(payload.length), u32(data.length), u16(nameBuf.length), u16(0), nameBuf,
    ]);
    locals.push(localHeader, payload);

    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0),
      u32(crc), u32(payload.length), u32(data.length), u16(nameBuf.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf,
    ]));
    offset += localHeader.length + payload.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBuf.length), u32(offset), u16(0),
  ]);
  return Buffer.concat([...locals, centralBuf, eocd]);
}

function readManifest() {
  return JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8'));
}

function walkDir(absDir, onFile) {
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (ent.name === '.DS_Store' || ent.name === 'Thumbs.db') continue;
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) walkDir(abs, onFile);
    else onFile(path.relative(EXT_DIR, abs).replace(/\\/g, '/'));
  }
}

function collectPackFiles() {
  const files = [];
  for (const name of PACK_ROOT_FILES) {
    if (!fs.existsSync(path.join(EXT_DIR, name))) throw new Error(`Missing package file: extension/${name}`);
    files.push(name);
  }
  for (const dir of PACK_DIRS) {
    const absDir = path.join(EXT_DIR, dir);
    if (!fs.existsSync(absDir)) throw new Error(`Missing package directory: extension/${dir}`);
    walkDir(absDir, (rel) => files.push(rel));
  }
  return files.sort();
}

function listExtras(packed) {
  const extras = [];
  walkDir(EXT_DIR, (rel) => { if (!packed.has(rel)) extras.push(rel); });
  return extras;
}

function checkManifestRefs(files) {
  const errors = [];
  const set = new Set(files);
  const manifest = readManifest();
  const refs = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {}),
  ].filter(Boolean);
  for (const ref of refs) {
    if (!set.has(ref)) errors.push(`The manifest references a missing file: ${ref}`);
  }
  return errors;
}

function checkNoRemoteJs(files) {
  const errors = [];
  for (const rel of files) {
    if (!/\.(js|html)$/i.test(rel)) continue;
    const text = fs.readFileSync(path.join(EXT_DIR, rel), 'utf8');
    if (REMOTE_SCRIPT_RE.test(text)) errors.push(`${rel}: contains a remote <script src="http(s)://...">`);
    if (REMOTE_IMPORT_RE.test(text)) errors.push(`${rel}: contains a remote import/require URL (MV3 requires all code to be local)`);
  }
  return errors;
}

function main() {
  const checkOnly = process.argv.includes('--check-only');
  const listOnly = process.argv.includes('--list-only');
  const manifest = readManifest();
  const files = collectPackFiles();

  if (listOnly) {
    files.forEach((f) => console.log(f));
    return;
  }

  const extras = listExtras(new Set(files));
  if (extras.length) {
    console.warn('Note: files under extension/ excluded from the ZIP (add new directories to the allowlist):');
    extras.forEach((f) => console.warn(`  - ${f}`));
  }

  const errors = [...checkManifestRefs(files), ...checkNoRemoteJs(files)];
  if (errors.length) {
    console.error('Validation failed:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`Package allowlist: ${files.length} files`);
  if (checkOnly) {
    console.log('--check-only: validation passed; no ZIP generated.');
    return;
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  const outZip = path.join(DIST_DIR, `NokiaPulse-${manifest.version}.zip`);
  const entries = files.map((name) => ({ name, data: fs.readFileSync(path.join(EXT_DIR, name)) }));
  fs.writeFileSync(outZip, buildZip(entries));
  const sizeKb = Math.round(fs.statSync(outZip).size / 1024);
  console.log(`Generated ${path.relative(ROOT, outZip)} (approximately ${sizeKb} KiB)`);
}

main();
