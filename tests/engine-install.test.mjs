import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(repo, 'plugins', 'bontaflowstack');
const output = path.join(repo, '.tmp', `engine-install-${randomUUID()}`);
const fixture = path.join(output, 'fixture');
const archive = path.join(output, 'fixture.zip');
const stateHome = path.join(output, 'isolated-state');
const attempts = path.join(output, 'build-attempts.txt');
const lock = JSON.parse(fs.readFileSync(path.join(plugin, 'engines.lock.json'), 'utf8'));
const installer = path.join(plugin, 'scripts', 'install-engines.ps1');
const zipScript = path.join(output, 'make-archive.ps1');
const ps = (script, args = [], env = process.env) => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { cwd: repo, env, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });

fs.mkdirSync(fixture, { recursive: true });
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.mkdirSync(path.join(fixture, 'scripts'), { recursive: true });
fs.writeFileSync(zipScript, "param([string]$Source,[string]$Destination)\nAdd-Type -AssemblyName System.IO.Compression.FileSystem\n[IO.Compression.ZipFile]::CreateFromDirectory($Source,$Destination)\n");
fs.writeFileSync(path.join(fixture, 'scripts', 'build.ps1'), `
$ErrorActionPreference = 'Stop'
$attempt = if (Test-Path -LiteralPath $env:BFS_INSTALL_FIXTURE_ATTEMPTS) { [int](Get-Content -LiteralPath $env:BFS_INSTALL_FIXTURE_ATTEMPTS -Raw) } else { 0 }
$attempt++
Set-Content -LiteralPath $env:BFS_INSTALL_FIXTURE_ATTEMPTS -Value $attempt -NoNewline
if ($attempt -eq 1) { exit 17 }
@{schema=1;name='bontaflowstack-engines';version='${lock.version}';platform='win32-x64';browserDirectory='.browsers';commands=@{};files=@{}} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot '../engine.json') -Encoding utf8
`);
const zip = ps(zipScript, [fixture, archive]);
assert.equal(zip.status, 0, zip.stderr || zip.stdout);
const archiveSha = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
assert.equal(archiveSha.length, 64);
const installRoot = path.join(stateHome, 'engines', `${lock.version}-${archiveSha.slice(0, 16)}`);

// Avoid the host-injected PowerShell 7 module shim shadowing Windows PowerShell 5.1 in this focused installer test.
const env = { ...process.env, PSModulePath: path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules'), BFS_STATE_HOME: stateHome, BFS_INSTALL_FIXTURE_ATTEMPTS: attempts };
const runInstall = () => ps(installer, ['-Archive', archive, '-Sha256', archiveSha], env);
const first = runInstall();
assert.equal(first.error, undefined, first.error?.message);
assert.notEqual(first.status, 0, 'the fixture build must fail on its first attempt');
assert.ok(fs.existsSync(attempts), `${first.stderr}\n${first.stdout}`);
assert.match(`${first.stdout}\n${first.stderr}`, /Engine build failed \(17\)/);
assert.equal(fs.readFileSync(attempts, 'utf8'), '1');
assert.equal(fs.existsSync(installRoot), false, 'a failed build must not publish a partial final installation');
const enginesDir = path.join(stateHome, 'engines');
const failedStaging = fs.readdirSync(enginesDir).filter(name => /^\.staging-[0-9a-f-]+$/i.test(name));
assert.equal(failedStaging.length, 1, 'the failed attempt should remain in its unique staging directory');

const retry = runInstall();
assert.equal(retry.status, 0, retry.stderr || retry.stdout);
assert.equal(fs.readFileSync(attempts, 'utf8'), '2', 'retry must execute a fresh build');
const manifest = JSON.parse(fs.readFileSync(path.join(installRoot, 'engine.json'), 'utf8').replace(/^\uFEFF/, ''));
assert.equal(manifest.version, lock.version);
const registered = JSON.parse(fs.readFileSync(path.join(stateHome, 'engines.json'), 'utf8'));
assert.equal(path.resolve(registered.root), path.resolve(installRoot));
assert.equal(registered.manifestSha256, createHash('sha256').update(fs.readFileSync(path.join(installRoot, 'engine.json'))).digest('hex'));
assert.ok(fs.existsSync(path.join(enginesDir, failedStaging[0])), 'the retry must preserve the prior incomplete staging directory');
assert.equal(fs.readdirSync(enginesDir).filter(name => /^\.staging-[0-9a-f-]+$/i.test(name)).length, 1);

fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ status: 'completed', firstAttemptExitCode: first.status, retryExitCode: retry.status, attempts: 2, installRoot, registeredRoot: registered.root, preservedFailedStaging: path.join(enginesDir, failedStaging[0]), scope: 'Actual shared installer with a synthetic checksum-verified local ZIP; isolated BFS_STATE_HOME; first build exits 17, second succeeds. No npm/network/global registry activity.' }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'completed', firstAttemptExitCode: first.status, retryExitCode: retry.status, installRoot, evidence: output }));
