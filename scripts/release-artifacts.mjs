import { spawnSync } from 'node:child_process';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const ZIP_LOCAL_FILE = 0x04034b50;
const ZIP_CENTRAL_FILE = 0x02014b50;
const ZIP_END = 0x06054b50;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_METHOD_DEFLATE = 8;
const ZIP_DOS_DATE_1980_01_01 = 0x0021;
const CRX_SIGNED_DATA_PREFIX = Buffer.from('CRX3 SignedData\0');
const RELEASE_ASSET_PATTERN =
  /^StyleKit-v\d+\.\d+\.\d+-(?:chrome|firefox)\.(?:zip|crx)$/;

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export const crc32 = buffer => {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
};

const uint16 = value => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
};

const uint32 = value => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
};

const assertZipSize = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${label} exceeds classic ZIP limits`);
  }
};

const collectFiles = (directory, prefix = '') =>
  readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap(entry => {
      const absolutePath = join(directory, entry.name);
      const archivePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        throw new Error(`Refusing to package symbolic link: ${archivePath}`);
      }
      if (entry.isDirectory()) return collectFiles(absolutePath, archivePath);
      if (!entry.isFile()) return [];
      return [{ absolutePath, archivePath }];
    });

export const createZipBuffer = directory => {
  const files = collectFiles(directory);
  if (files.length === 0) throw new Error(`No files found in ${directory}`);
  if (files.length > 0xffff) throw new Error('Too many files for classic ZIP');

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const file of files) {
    if (/\\/.test(file.archivePath)) {
      throw new Error(`ZIP entry contains a backslash: ${file.archivePath}`);
    }

    const name = Buffer.from(file.archivePath, 'utf8');
    const content = readFileSync(file.absolutePath);
    const compressed = deflateRawSync(content, { level: 9 });
    const checksum = crc32(content);
    assertZipSize(content.length, `${file.archivePath} uncompressed size`);
    assertZipSize(compressed.length, `${file.archivePath} compressed size`);
    assertZipSize(localOffset, `${file.archivePath} offset`);

    const localHeader = Buffer.concat([
      uint32(ZIP_LOCAL_FILE),
      uint16(20),
      uint16(ZIP_UTF8_FLAG),
      uint16(ZIP_METHOD_DEFLATE),
      uint16(0),
      uint16(ZIP_DOS_DATE_1980_01_01),
      uint32(checksum),
      uint32(compressed.length),
      uint32(content.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);
    localParts.push(localHeader, compressed);

    centralParts.push(
      Buffer.concat([
        uint32(ZIP_CENTRAL_FILE),
        uint16(0x0314),
        uint16(20),
        uint16(ZIP_UTF8_FLAG),
        uint16(ZIP_METHOD_DEFLATE),
        uint16(0),
        uint16(ZIP_DOS_DATE_1980_01_01),
        uint32(checksum),
        uint32(compressed.length),
        uint32(content.length),
        uint16(name.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0o100644 << 16),
        uint32(localOffset),
        name,
      ])
    );
    localOffset += localHeader.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  assertZipSize(centralDirectory.length, 'Central directory size');
  assertZipSize(localOffset, 'Central directory offset');
  const end = Buffer.concat([
    uint32(ZIP_END),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(localOffset),
    uint16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
};

const findZipEnd = buffer => {
  const minimumOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_END) return offset;
  }
  throw new Error('ZIP end-of-central-directory record not found');
};

const validateArchivePath = name => {
  if (
    !name ||
    name.includes('\\') ||
    name.startsWith('/') ||
    /^[A-Za-z]:/.test(name) ||
    name.split('/').includes('..')
  ) {
    throw new Error(`Unsafe ZIP entry path: ${name}`);
  }
};

export const verifyZipBuffer = buffer => {
  const endOffset = findZipEnd(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (centralOffset + centralSize > endOffset) {
    throw new Error('ZIP central directory overlaps its end record');
  }

  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_FILE) {
      throw new Error(`Invalid ZIP central header at entry ${index}`);
    }
    const method = buffer.readUInt16LE(offset + 10);
    const checksum = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');
    validateArchivePath(name);

    if (buffer.readUInt32LE(localOffset) !== ZIP_LOCAL_FILE) {
      throw new Error(`Invalid ZIP local header for ${name}`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const content =
      method === ZIP_METHOD_DEFLATE
        ? inflateRawSync(compressed)
        : method === 0
          ? compressed
          : (() => {
              throw new Error(`Unsupported ZIP method ${method} for ${name}`);
            })();
    if (content.length !== uncompressedSize || crc32(content) !== checksum) {
      throw new Error(`ZIP payload verification failed for ${name}`);
    }

    entries.push({ name, size: uncompressedSize });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (offset !== centralOffset + centralSize) {
    throw new Error('ZIP central directory size does not match its entries');
  }
  if (!entries.some(entry => entry.name === 'manifest.json')) {
    throw new Error('ZIP does not contain a root manifest.json');
  }
  return entries;
};

const encodeVarint = value => {
  const bytes = [];
  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);
    if (remaining > 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining > 0);
  return Buffer.from(bytes);
};

const encodeBytesField = (field, value) =>
  Buffer.concat([
    encodeVarint(field * 8 + 2),
    encodeVarint(value.length),
    value,
  ]);

const decodeVarint = (buffer, start) => {
  let value = 0;
  let multiplier = 1;
  let offset = start;
  while (offset < buffer.length) {
    const byte = buffer[offset];
    value += (byte & 0x7f) * multiplier;
    offset += 1;
    if (!(byte & 0x80)) return { value, offset };
    multiplier *= 128;
  }
  throw new Error('Truncated protobuf varint');
};

const decodeFields = buffer => {
  const fields = new Map();
  let offset = 0;
  while (offset < buffer.length) {
    const tag = decodeVarint(buffer, offset);
    offset = tag.offset;
    const field = Math.floor(tag.value / 8);
    const wire = tag.value % 8;
    if (wire !== 2) throw new Error(`Unsupported protobuf wire type ${wire}`);
    const length = decodeVarint(buffer, offset);
    offset = length.offset;
    const end = offset + length.value;
    if (end > buffer.length) throw new Error('Truncated protobuf field');
    const values = fields.get(field) ?? [];
    values.push(buffer.subarray(offset, end));
    fields.set(field, values);
    offset = end;
  }
  return fields;
};

const signedCrxPayload = (signedHeader, zip) =>
  Buffer.concat([
    CRX_SIGNED_DATA_PREFIX,
    uint32(signedHeader.length),
    signedHeader,
    zip,
  ]);

export const createCrx3Buffer = (zip, privateKeyPem) => {
  verifyZipBuffer(zip);
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey).export({
    type: 'spki',
    format: 'der',
  });
  const crxId = createHash('sha256').update(publicKey).digest().subarray(0, 16);
  const signedHeader = encodeBytesField(1, crxId);
  const signature = sign(
    'sha256',
    signedCrxPayload(signedHeader, zip),
    privateKey
  );
  const proof = Buffer.concat([
    encodeBytesField(1, publicKey),
    encodeBytesField(2, signature),
  ]);
  const header = Buffer.concat([
    encodeBytesField(2, proof),
    encodeBytesField(10000, signedHeader),
  ]);

  return Buffer.concat([
    Buffer.from('Cr24'),
    uint32(3),
    uint32(header.length),
    header,
    zip,
  ]);
};

export const verifyCrx3Buffer = buffer => {
  if (buffer.subarray(0, 4).toString('ascii') !== 'Cr24') {
    throw new Error('CRX magic is not Cr24');
  }
  if (buffer.readUInt32LE(4) !== 3) throw new Error('CRX version is not 3');
  const headerSize = buffer.readUInt32LE(8);
  const headerEnd = 12 + headerSize;
  if (headerEnd > buffer.length)
    throw new Error('CRX header exceeds file size');
  const headerFields = decodeFields(buffer.subarray(12, headerEnd));
  const proofBuffer = headerFields.get(2)?.[0];
  const signedHeader = headerFields.get(10000)?.[0];
  if (!proofBuffer || !signedHeader) {
    throw new Error('CRX is missing an RSA proof or signed header');
  }
  const proofFields = decodeFields(proofBuffer);
  const publicKey = proofFields.get(1)?.[0];
  const signature = proofFields.get(2)?.[0];
  const signedFields = decodeFields(signedHeader);
  const crxId = signedFields.get(1)?.[0];
  if (!publicKey || !signature || !crxId || crxId.length !== 16) {
    throw new Error('CRX proof fields are incomplete');
  }

  const expectedId = createHash('sha256')
    .update(publicKey)
    .digest()
    .subarray(0, 16);
  if (!expectedId.equals(crxId))
    throw new Error('CRX ID does not match its key');
  const zip = buffer.subarray(headerEnd);
  if (
    !verify(
      'sha256',
      signedCrxPayload(signedHeader, zip),
      {
        key: publicKey,
        type: 'spki',
        format: 'der',
      },
      signature
    )
  ) {
    throw new Error('CRX RSA-SHA256 signature is invalid');
  }

  return {
    id: crxId.toString('hex'),
    entries: verifyZipBuffer(zip),
    zip,
  };
};

const runNpmScript = (name, root) => {
  const npmCli = process.env.npm_execpath;
  const command = npmCli
    ? process.execPath
    : process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm';
  const args = npmCli ? [npmCli, 'run', name] : ['run', name];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm run ${name} failed`);
};

const removeOldArtifacts = root => {
  const removed = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && RELEASE_ASSET_PATTERN.test(entry.name)) {
      unlinkSync(join(root, entry.name));
      removed.push(entry.name);
    }
  }
  return removed.sort();
};

export const buildReleaseArtifacts = (root = process.cwd()) => {
  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8')
  );
  const version = packageJson.version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Package version is not release-safe: ${version}`);
  }

  const removed = removeOldArtifacts(root);
  runNpmScript('build', root);
  runNpmScript('build:firefox', root);

  const chromeName = `StyleKit-v${version}-chrome.zip`;
  const firefoxName = `StyleKit-v${version}-firefox.zip`;
  const chromeZip = createZipBuffer(join(root, 'dist'));
  const firefoxZip = createZipBuffer(join(root, 'firefox-dist'));
  writeFileSync(join(root, chromeName), chromeZip);
  writeFileSync(join(root, firefoxName), firefoxZip);
  const chromeEntries = verifyZipBuffer(chromeZip);
  const firefoxEntries = verifyZipBuffer(firefoxZip);

  const configuredKey = process.env.STYLEKIT_CRX_KEY;
  const keyPath = resolve(root, configuredKey || 'dist.pem');
  let crx = null;
  if (existsSync(keyPath) && statSync(keyPath).isFile()) {
    const crxName = `StyleKit-v${version}-chrome.crx`;
    const crxBuffer = createCrx3Buffer(chromeZip, readFileSync(keyPath));
    writeFileSync(join(root, crxName), crxBuffer);
    const verified = verifyCrx3Buffer(crxBuffer);
    crx = { name: crxName, id: verified.id, entries: verified.entries.length };
  }

  return {
    version,
    removed,
    chrome: { name: chromeName, entries: chromeEntries.length },
    firefox: { name: firefoxName, entries: firefoxEntries.length },
    crx,
    keyPath,
  };
};

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = buildReleaseArtifacts();
    console.log(`\nVerified StyleKit v${result.version} release artifacts:`);
    console.log(`  ${result.chrome.name} (${result.chrome.entries} entries)`);
    console.log(`  ${result.firefox.name} (${result.firefox.entries} entries)`);
    if (result.crx) {
      console.log(
        `  ${result.crx.name} (${result.crx.entries} entries, CRX ID ${result.crx.id})`
      );
    } else {
      console.log(`  CRX skipped: signing key not found at ${result.keyPath}`);
    }
    console.log(`Removed old artifacts: ${result.removed.length}`);
  } catch (error) {
    console.error(`Release artifact verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
