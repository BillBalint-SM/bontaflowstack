#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePackagePath = path.join(repo, 'installers', 'npm', 'package.json');
const npmVersion = JSON.parse(fs.readFileSync(sourcePackagePath, 'utf8')).version;

export function parseArguments(args) {
  if (args.length % 2 !== 0) throw new Error('Arguments must be --name value pairs.');
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '');
    if (!args[index].startsWith('--') || !key || !args[index + 1] || args[index + 1].startsWith('--') || Object.hasOwn(options, key)) {
      throw new Error(`Unknown, duplicate, or incomplete release argument: ${args[index]}`);
    }
    options[key] = args[index + 1];
  }
  return options;
}

export function requirePublishTag(version, tag) {
  const expected = version.includes('-') ? 'rc' : 'latest';
  if (tag !== expected) throw new Error(`Version ${version} requires the explicit npm dist-tag \`${expected}\`.`);
}

export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function sriSha512File(file) {
  return `sha512-${createHash('sha512').update(fs.readFileSync(file)).digest('base64')}`;
}

function npmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);
  return candidates.find(file => fs.statSync(file, { throwIfNoEntry:false })?.isFile());
}

function runNpm(args, cwd, { interactive = false } = {}) {
  const cli = npmCliPath();
  if (!cli) throw new Error('Cannot locate npm-cli.js. Install Node.js 24+ with npm and retry.');
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd, encoding:interactive ? undefined : 'utf8', windowsHide:true,
    stdio:interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    timeout:interactive ? undefined : 120000,
    maxBuffer:interactive ? undefined : 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `npm ${args[0]} failed (${result.status ?? result.signal})`);
  return result.stdout?.trim() || '';
}

function git(args) {
  const result = spawnSync('git', args, { cwd:repo, encoding:'utf8', windowsHide:true });
  if (result.error || result.status !== 0) throw new Error(`Cannot verify source tag: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safePath(root, relative) {
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error('Artifact path escapes its release directory.');
  return resolved;
}

function getArtifact(directory, expectedTag) {
  const root = path.resolve(directory);
  if (!fs.statSync(root, { throwIfNoEntry:false })?.isDirectory() || fs.lstatSync(root).isSymbolicLink()) throw new Error(`Release artifact directory is missing or unsafe: ${root}`);
  const receiptPath = path.join(root, 'release.json');
  if (fs.lstatSync(receiptPath).isSymbolicLink()) throw new Error('Release receipt must be a regular file.');
  const receipt = readJson(receiptPath);
  if (receipt.schema !== 1 || receipt.name !== 'bontaflowstack' || receipt.version !== npmVersion || receipt.tag !== expectedTag || receipt.releaseTag !== `v${receipt.version}` || !/^[a-f0-9]{40,64}$/.test(receipt.sourceRevision)) {
    throw new Error('Release receipt does not match the current package version, exact source tag, and requested dist-tag.');
  }
  requirePublishTag(receipt.version, receipt.tag);
  const tarball = safePath(root, receipt.tarball);
  if (!fs.statSync(tarball, { throwIfNoEntry:false })?.isFile() || fs.lstatSync(tarball).isSymbolicLink()) throw new Error('The recorded npm tarball is missing or unsafe.');
  if (sha256File(tarball) !== receipt.sha256 || sriSha512File(tarball) !== receipt.integrity) throw new Error('The npm tarball changed after release preparation.');
  return { root, receipt, tarball };
}

function prepare(outputValue, tag, releaseTag) {
  requirePublishTag(npmVersion, tag);
  if (releaseTag !== `v${npmVersion}`) throw new Error(`Release tag must exactly match this package version: v${npmVersion}`);
  const output = path.resolve(outputValue);
  if (fs.existsSync(output)) throw new Error(`Output already exists; choose a new directory: ${output}`);
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive:true });
  const stage = fs.mkdtempSync(path.join(parent, `.${path.basename(output)}-${randomUUID()}-`));
  try {
    const packageRoot = path.join(stage, 'package');
    const built = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-npm-package.mjs'), '--output', packageRoot], {
      cwd:repo, encoding:'utf8', windowsHide:true, timeout:120000, maxBuffer:16 * 1024 * 1024
    });
    if (built.error) throw built.error;
    if (built.status !== 0) throw new Error(built.stderr || built.stdout || 'Universal npm package generation failed.');
    const actualPackage = readJson(path.join(packageRoot, 'package.json'));
    if (actualPackage.name !== 'bontaflowstack' || actualPackage.version !== npmVersion || actualPackage.private || actualPackage.bin?.bontaflowstack !== 'bin/setup.mjs') {
      throw new Error('Built package identity or public CLI entry does not match the release source.');
    }
    const packed = JSON.parse(runNpm(['pack', '--json', '--pack-destination', stage], packageRoot));
    const details = Array.isArray(packed) ? packed[0] : packed?.[actualPackage.name] ?? Object.values(packed ?? {})[0];
    if (!details || details.name !== actualPackage.name || details.version !== actualPackage.version || typeof details.filename !== 'string') {
      throw new Error('npm pack returned an unexpected name/version/tarball result.');
    }
    const temporaryTarball = safePath(stage, details.filename);
    const filename = `${actualPackage.name}-${actualPackage.version}.tgz`;
    const packedFiles = details.files?.map(file => file.path) ?? [];
    const required = [
      'package.json', 'README.md', 'LICENSE', 'bin/setup.mjs',
      'hosts/codex/.agents/plugins/marketplace.json', 'hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json',
      'hosts/codex/plugins/bontaflowstack/.mcp.json', 'hosts/codex/plugins/bontaflowstack/hooks/hooks.json',
      'hosts/claude/.claude-plugin/plugin.json', 'hosts/claude/.claude-plugin/marketplace.json',
      'hosts/claude/.mcp.json', 'hosts/claude/hooks/hooks.json',
    ];
    if (required.some(file => !packedFiles.includes(file))) throw new Error('npm tarball is missing a required host or installer file.');
    if (!packedFiles.every(file => /^(?:package\.json|README\.md|LICENSE|bin\/|hosts\/)/.test(file)) || packedFiles.some(file => /(?:^|\/)(?:tests?|evidence|artifacts|\.tmp|docs)(?:\/|$)/i.test(file))) {
      throw new Error('npm tarball contains files outside the user-installable payload.');
    }
    for (const prefix of ['hosts/codex/plugins/bontaflowstack', 'hosts/claude']) {
      if (packedFiles.filter(file => file.startsWith(`${prefix}/skills/`) && file.endsWith('/SKILL.md')).length !== 34 ||
          !packedFiles.some(file => file.startsWith(`${prefix}/engines/`) && file.endsWith('.zip'))) {
        throw new Error(`npm tarball does not contain the complete ${prefix} plugin.`);
      }
    }
    const tarball = path.join(stage, filename);
    if (temporaryTarball !== tarball) fs.renameSync(temporaryTarball, tarball);
    const receipt = {
      schema:1,
      name:actualPackage.name,
      version:actualPackage.version,
      tag,
      releaseTag,
      tarball:filename,
      sha256:sha256File(tarball),
      integrity:sriSha512File(tarball),
      packedFiles,
      sourceRevision:git(['rev-parse', 'HEAD']),
      preparedAt:new Date().toISOString(),
    };
    if (!receipt.packedFiles.length || (details.integrity && details.integrity !== receipt.integrity)) throw new Error('npm pack did not return the expected archive inventory or integrity.');
    fs.rmSync(packageRoot, { recursive:true, force:true });
    fs.writeFileSync(path.join(stage, 'release.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag:'wx' });
    if (fs.existsSync(output)) throw new Error(`Output appeared while preparing; choose a new directory: ${output}`);
    fs.renameSync(stage, output);
    return { outcome:'prepared', directory:output, name:receipt.name, version:receipt.version, tag:receipt.tag, tarball:path.join(output, filename), sha256:receipt.sha256, integrity:receipt.integrity };
  } catch (error) {
    fs.rmSync(stage, { recursive:true, force:true });
    throw error;
  }
}

export function validateRegistryRelease(receipt, identity, tags) {
  const single = value => Array.isArray(value) && value.length === 1 ? value[0] : value;
  identity = single(identity); tags = single(tags);
  if (identity?.name !== receipt.name || identity?.version !== receipt.version || identity?.['dist.integrity'] !== receipt.integrity) {
    throw new Error('Registry name/version/integrity do not match the prepared npm tarball.');
  }
  if (tags?.[receipt.tag] !== receipt.version) throw new Error(`Registry dist-tag ${receipt.tag} does not point to ${receipt.version}.`);
  return { distTags:tags, registryAssignedLatest:receipt.version.includes('-') && tags.latest === receipt.version };
}

async function verify(directory, tag) {
  const { receipt, tarball } = getArtifact(directory, tag);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const identity = JSON.parse(runNpm(['view', `${receipt.name}@${receipt.version}`, 'name', 'version', 'dist.integrity', '--json', '--registry', 'https://registry.npmjs.org'], repo));
      const registryTags = JSON.parse(runNpm(['view', receipt.name, 'dist-tags', '--json', '--registry', 'https://registry.npmjs.org'], repo));
      const tagState = validateRegistryRelease(receipt, identity, registryTags);
      return { outcome:'verified', name:receipt.name, version:receipt.version, tag, sha256:sha256File(tarball), integrity:receipt.integrity, ...tagState,
        ...(tagState.registryAssignedLatest ? { warning:'The registry also assigns latest to this prerelease.' } : {}) };
    } catch (error) {
      lastError = error;
      if (attempt < 7) await new Promise(resolve => setTimeout(resolve, Math.min(30000, 1000 * (2 ** attempt))));
    }
  }
  throw new Error(`Registry verification did not converge after eight attempts: ${lastError?.message || 'unknown error'}. Do not republish; rerun verify after registry processing finishes.`);
}

async function publish(directory, tag) {
  const { receipt, tarball } = getArtifact(directory, tag);
  const currentRevision = git(['rev-parse', 'HEAD']);
  const taggedRevision = git(['rev-parse', `${receipt.releaseTag}^{commit}`]);
  if (currentRevision !== receipt.sourceRevision || taggedRevision !== receipt.sourceRevision) {
    throw new Error('Publishing requires a clean checkout of the exact source tag recorded during preparation.');
  }
  if (git(['status', '--porcelain', '--untracked-files=all'])) throw new Error('Publishing requires a clean source checkout.');
  // Keep the local bootstrap path interactive so npm can request web login or an OTP without being swallowed by a child-process buffer.
  runNpm(['publish', tarball, '--tag', tag, '--access', 'public', '--registry', 'https://registry.npmjs.org'], repo, { interactive:true });
  try {
    return await verify(directory, tag);
  } catch (error) {
    throw new Error(`npm publish completed, but registry verification remains unresolved: ${error.message}`);
  }
}

export async function main(args) {
  const [command, ...rest] = args;
  const options = parseArguments(rest);
  if (command === 'prepare' && Object.keys(options).length === 3 && options.output && options.tag && options['release-tag']) {
    return prepare(options.output, options.tag, options['release-tag']);
  }
  if (command === 'publish' && Object.keys(options).length === 2 && options.artifact && options.tag) return await publish(options.artifact, options.tag);
  if (command === 'verify' && Object.keys(options).length === 2 && options.artifact && options.tag) return await verify(options.artifact, options.tag);
  throw new Error('Usage: npm-release.mjs prepare --output DIR --tag rc|latest --release-tag v<version> | publish/verify --artifact DIR --tag rc|latest');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(result => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
