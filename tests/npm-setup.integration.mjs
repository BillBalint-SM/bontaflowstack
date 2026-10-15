import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {dataPaths} from '../plugins/bontaflowstack/core/state.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeCommandEvidence ,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

if (process.env.BFS_RUN_NPM_SETUP_INTEGRATION !== '1') {
  console.log('SKIP: set BFS_RUN_NPM_SETUP_INTEGRATION=1 to run real npm pack/npx setup for Codex and Claude (downloads pinned browser engines).');
} else {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const evidenceDir = path.join(process.platform==='win32'?path.join(repo,'.tmp'):fs.realpathSync.native(os.tmpdir()), `npm-setup-integration-${randomUUID()}`);
  const version = JSON.parse(fs.readFileSync(path.join(repo,'installers/npm/package.json'),'utf8')).version;
  const packageRoot = path.join(evidenceDir, 'source-package');
  const upgradeRoot = path.join(evidenceDir, 'synthetic-upgrade-package');
  const packDir = path.join(evidenceDir, 'packed');
  const stateHome = path.join(evidenceDir, 'shared-state');
  const npmCache = path.join(evidenceDir, 'npm-cache');
  const env = {
    ...process.env,
    LOCALAPPDATA:path.join(evidenceDir, 'LocalAppData'),
    USERPROFILE:path.join(evidenceDir, 'UserProfile'),
    CODEX_HOME:path.join(evidenceDir, 'Codex'),
    CLAUDE_CONFIG_DIR:path.join(evidenceDir, 'Claude'),
    GEMINI_CLI_HOME:path.join(evidenceDir, 'Gemini'),
    BFS_STATE_HOME:stateHome,
    npm_config_cache:npmCache,
    npm_config_yes:'true',
  };
  env.CODEX_THREAD_ID ||= 'npm-setup-validation';
  if(process.platform!=='win32')Object.assign(env,{HOME:path.join(evidenceDir,'Home'),XDG_DATA_HOME:path.join(evidenceDir,'xdg-data'),XDG_CONFIG_HOME:path.join(evidenceDir,'xdg-config'),XDG_STATE_HOME:path.join(evidenceDir,'xdg-state')});
  const {installRoot}=dataPaths(env);
  const versionRoot=path.join(installRoot,'versions',...(process.platform==='win32'?[]:[`${process.platform}-${process.arch}`]));
  for (const directory of [evidenceDir, env.LOCALAPPDATA, env.USERPROFILE, env.CODEX_HOME, env.CLAUDE_CONFIG_DIR, stateHome, packDir, npmCache]) fs.mkdirSync(directory, { recursive:true });

  delete env.BFS_IMPECCABLE_COMMAND;
  const commandLogs = [];
  function execute(name, command, args, { cwd = repo, allowFailure = false, commandEnv = env } = {}) {
    console.log(`Running ${name}; evidence: ${evidenceDir}`);
    const result = spawnSync(command, args, { cwd, env:commandEnv, encoding:'utf8', windowsHide:true, timeout:45 * 60 * 1000, maxBuffer:32 * 1024 * 1024 });
    const record = { name, command, args, cwd, status:result.status, signal:result.signal, error:result.error?.message, stdout:result.stdout || '', stderr:result.stderr || '' };
    const diagnostic=writeCommandEvidence(path.join(evidenceDir, `${name}.command-evidence.json`),record);
    commandLogs.push({ name, ...diagnostic });
    if (result.error) throw result.error;
    if (!allowFailure) {
      const reason=result.stderr.split(/\r?\n/).filter(line=>/^(?:BontaFlowStack setup:|Setup incomplete|npm (?:error|ERR!)|\w*Error(?: \[[A-Z_]+\])?:)|sandbox|error while loading shared libraries|browserType.launch|Operation not permitted/.test(line)).slice(0,8).join('; ').replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]+|(?:gh[pousr]_|sk-)[\w-]+/gi,'[redacted]');
      assert.equal(result.status, 0, `${name} failed${reason?`: ${reason}`:''}; retained command evidence contains the exit code and output sizes`);
    }
    return record;
  }
  function resolveNpmCli(fileName) {
    const candidates = [
      process.env.npm_execpath && path.join(path.dirname(process.env.npm_execpath), fileName),
      env.APPDATA && path.join(env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', fileName),
      path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', fileName),
      path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin', fileName),
    ].filter(Boolean);
    return candidates.find(file => fs.statSync(file, { throwIfNoEntry:false })?.isFile());
  }
  function findNative(name) {
    if(process.platform!=='win32') {
      const command=name.replace(/\.exe$/,'');
      const file=env.PATH.split(path.delimiter).map(base=>path.join(base,command)).find(file=>fs.statSync(file,{throwIfNoEntry:false})?.isFile());
      assert.ok(file,`Install native ${command} on PATH before opting in.`);return file;
    }
    const result = execute(`where-${name}`, 'where.exe', [name], { allowFailure:true });
    assert.equal(result.status, 0, `Install ${name} and make it available on PATH before opting in.`);
    const file = result.stdout.trim().split(/\r?\n/)[0];
    assert.ok(file && fs.statSync(file, { throwIfNoEntry:false })?.isFile(), `Could not resolve ${name} from PATH.`);
    return file;
  }
  function npx(name, archive, args = []) {
    const cli = resolveNpmCli('npx-cli.js');
    assert.ok(cli, 'Could not locate npm\'s npx-cli.js.');
    const results=['codex','claude'].map(host=>execute(`${name}-${host}`, process.execPath, [cli, '--yes', '--package', archive, '--', 'bontaflowstack', ...args, '--host',host], { cwd:evidenceDir }));
    return {stdout:results.map(result=>result.stdout).join('\n')};
  }
  function pack(name, source) {
    const cli = resolveNpmCli('npm-cli.js');
    assert.ok(cli, 'Could not locate npm\'s npm-cli.js.');
    const result = execute(name, process.execPath, [cli, 'pack', '--json', '--pack-destination', packDir], { cwd:source });
    const payload = JSON.parse(result.stdout);
    const details = Array.isArray(payload) ? payload[0] : payload?.bontaflowstack ?? Object.values(payload)[0];
    assert.ok(details?.filename, 'npm pack did not return its tarball filename.');
    const archive = path.join(packDir, details.filename);
    assert.ok(fs.statSync(archive).isFile());
    return { archive, sha256:createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), details };
  }
  function updateVersion(root, version) {
    const update = file => {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Object.hasOwn(value, 'version')) value.version = version;
      if (Array.isArray(value.plugins)) for (const plugin of value.plugins) if (Object.hasOwn(plugin, 'version')) plugin.version = version;
      fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
    };
    update(path.join(root, 'package.json'));
    update(path.join(root, 'hosts', 'codex', 'plugins', 'bontaflowstack', 'catalog.json'));
    update(path.join(root, 'hosts', 'codex', 'plugins', 'bontaflowstack', '.codex-plugin', 'plugin.json'));
    update(path.join(root, 'hosts', 'claude', 'catalog.json'));
    update(path.join(root, 'hosts', 'claude', '.claude-plugin', 'plugin.json'));
    update(path.join(root, 'hosts', 'claude', '.claude-plugin', 'marketplace.json'));
    update(path.join(root, 'hosts', 'gemini', 'catalog.json'));
    update(path.join(root, 'hosts', 'gemini', 'gemini-extension.json'));
    update(path.join(root, 'hosts', 'copilot', 'catalog.json'));
    update(path.join(root, 'hosts', 'copilot', 'plugin.json'));
    update(path.join(root, 'hosts', 'copilot', 'marketplace.json'));
    update(path.join(root, 'hosts', 'cursor', 'catalog.json'));
    update(path.join(root, 'hosts', 'cursor', '.cursor-plugin/plugin.json'));
    update(path.join(root, 'hosts', 'opencode', 'catalog.json'));
    update(path.join(root, 'hosts', 'opencode', 'package.json'));
  }

  const codex = findNative('codex.exe'), claude = findNative('claude.exe');
  const build = execute('build-source-package', process.execPath, [path.join(repo, 'scripts', 'build-npm-package.mjs'), '--output', packageRoot]);
  assert.match(build.stdout, /"hosts":\["codex","claude","gemini","copilot","cursor","opencode"\]/);
  const firstTarball = pack('npm-pack-first', packageRoot);
  const firstInstall = npx('npx-first-noargs', firstTarball.archive);
  assert.ok(firstInstall.stdout.includes(`completed at ${path.join(versionRoot,version)}`));
  const repeatInstall = npx('npx-repeat-noargs', firstTarball.archive);
  assert.ok(repeatInstall.stdout.includes(`BontaFlowStack ${version} completed`));

  const firstRoot = path.join(versionRoot, version);
  const firstCodexRoot = path.join(firstRoot, 'hosts', 'codex', 'plugins', 'bontaflowstack');
  const firstClaudeRoot = path.join(firstRoot, 'hosts', 'claude');
  for (const root of [firstCodexRoot, firstClaudeRoot]) {
    const pin = JSON.parse(fs.readFileSync(path.join(root, 'install-state.json'), 'utf8'));
    assert.equal(pin.schema, 1);
    assert.equal(pin.stateHome, stateHome);
  }

  fs.cpSync(packageRoot, upgradeRoot, { recursive:true });
  updateVersion(upgradeRoot, '9.9.9-test.1');
  const upgradeTarball = pack('npm-pack-upgrade', upgradeRoot);
  const upgradedInstall = npx('npx-synthetic-upgrade', upgradeTarball.archive);
  assert.match(upgradedInstall.stdout, /completed at .*9\.9\.9-test\.1/i);
  const upgradedRoot = path.join(versionRoot, '9.9.9-test.1');
  const codexRoot = path.join(upgradedRoot, 'hosts', 'codex', 'plugins', 'bontaflowstack');
  const claudeRoot = path.join(upgradedRoot, 'hosts', 'claude');
  assert.ok(fs.existsSync(path.join(firstCodexRoot, 'catalog.json')), 'prior version must remain available');
  assert.ok(fs.existsSync(path.join(firstClaudeRoot, 'catalog.json')), 'prior version must remain available');

  const codexPlugins = JSON.parse(execute('codex-plugin-list-after-upgrade', codex, ['--no-daemon','plugin','list','--json']).stdout).installed;
  const codexRecord = codexPlugins.find(item => item.pluginId === 'bontaflowstack@bontaflowstack');
  assert.equal(codexRecord?.version, '9.9.9-test.1');
  assert.equal(codexRecord?.enabled, true);
  assert.equal(codexRecord?.installed, true);
  const claudePlugins = JSON.parse(execute('claude-plugin-list-after-upgrade', claude, ['plugin','list','--json']).stdout);
  const claudeRecord = claudePlugins.find(item => item.id === 'bontaflowstack@bontaflowstack-npx' && item.scope === 'user');
  assert.equal(claudeRecord?.version, '9.9.9-test.1');
  assert.equal(claudeRecord?.enabled, true);
  assert.equal(path.resolve(claudeRecord?.readFromFolder || ''), path.resolve(claudeRoot));

  const codexMarkets = JSON.parse(execute('codex-marketplace-list-after-upgrade', codex, ['--no-daemon','plugin','marketplace','list','--json']).stdout).marketplaces;
  assert.equal(path.resolve(codexMarkets.find(item => item.name === 'bontaflowstack')?.root || ''), path.resolve(path.join(upgradedRoot, 'hosts', 'codex')));
  const claudeMarkets = JSON.parse(execute('claude-marketplace-list-after-upgrade', claude, ['plugin','marketplace','list','--json']).stdout);
  assert.equal(path.resolve(claudeMarkets.find(item => item.name === 'bontaflowstack-npx')?.path || ''), path.resolve(path.join(upgradedRoot, 'hosts', 'claude')));

  const downgradedInstall = npx('npx-original-archive-downgrade', firstTarball.archive);
  assert.ok(downgradedInstall.stdout.includes(`BontaFlowStack ${version} completed`));
  const downgradedCodex = JSON.parse(execute('codex-plugin-list-after-downgrade', codex, ['--no-daemon','plugin','list','--json']).stdout).installed.find(item => item.pluginId === 'bontaflowstack@bontaflowstack');
  assert.equal(downgradedCodex?.version, version);
  assert.equal(downgradedCodex?.enabled, true);
  assert.equal(downgradedCodex?.installed, true);
  const downgradedClaude = JSON.parse(execute('claude-plugin-list-after-downgrade', claude, ['plugin','list','--json']).stdout).find(item => item.id === 'bontaflowstack@bontaflowstack-npx' && item.scope === 'user');
  assert.equal(downgradedClaude?.version, version);
  assert.equal(downgradedClaude?.enabled, true);
  assert.equal(path.resolve(downgradedClaude?.readFromFolder || ''), path.resolve(firstClaudeRoot));

  const priorState = path.join(stateHome, 'projects', 'fixture', 'keep.json');
  fs.mkdirSync(path.dirname(priorState), { recursive:true });
  fs.writeFileSync(priorState, 'state survives uninstall');
  for (const pluginRoot of [firstCodexRoot, firstClaudeRoot]) {
    const doctorEnv = { ...env, LOCALAPPDATA:path.join(evidenceDir, 'RedirectedLocalAppData') };
    if(process.platform!=='win32')doctorEnv.XDG_STATE_HOME=path.join(evidenceDir,'redirected-state');
    delete doctorEnv.BFS_STATE_HOME;
    const result = execute(`doctor-${path.basename(pluginRoot)}`, process.execPath, [path.join(pluginRoot, 'core', 'cli.mjs'), 'doctor', 'bfs-browse'], { cwd:evidenceDir, commandEnv:doctorEnv });
    const doctor = JSON.parse(result.stdout);
    assert.equal(doctor.core.ready, true);
    assert.equal(doctor.engines.installed, true);
    assert.equal(doctor.engines.capabilities['design-detect'].ready, true);
    assert.equal(fs.existsSync(path.join(dataPaths(doctorEnv).stateHome,'engines.json')), false, 'doctor should have used the pinned shared state, not redirected defaults');
  }

  execute('codex-plugin-remove', codex, ['--no-daemon','plugin','remove','bontaflowstack@bontaflowstack','--json']);
  execute('claude-plugin-uninstall', claude, ['plugin','uninstall','bontaflowstack@bontaflowstack-npx','--scope','user']);
  execute('codex-marketplace-remove', codex, ['--no-daemon','plugin','marketplace','remove','bontaflowstack','--json']);
  execute('claude-marketplace-remove', claude, ['plugin','marketplace','remove','bontaflowstack-npx']);
  const remainingCodex = JSON.parse(execute('codex-plugin-list-after-uninstall', codex, ['--no-daemon','plugin','list','--json']).stdout).installed;
  assert.equal(remainingCodex.some(item => item.pluginId === 'bontaflowstack@bontaflowstack'), false);
  const remainingClaude = JSON.parse(execute('claude-plugin-list-after-uninstall', claude, ['plugin','list','--json']).stdout);
  assert.equal(remainingClaude.some(item => item.id === 'bontaflowstack@bontaflowstack-npx'), false);
  assert.equal(fs.readFileSync(priorState, 'utf8'), 'state survives uninstall');
  assert.equal(fs.existsSync(path.join(stateHome, 'engines.json')), true);

  const cacheRemoved = `${npmCache}-removed`;
  const packageRemoved = `${packageRoot}-removed`;
  const upgradeRemoved = `${upgradeRoot}-removed`;
  fs.renameSync(npmCache, cacheRemoved);
  fs.renameSync(packageRoot, packageRemoved);
  fs.renameSync(upgradeRoot, upgradeRemoved);
  for (const root of [firstCodexRoot, firstClaudeRoot, codexRoot, claudeRoot]) assert.ok(fs.existsSync(path.join(root, 'catalog.json')));

  const findingFile = path.join(evidenceDir,'finding.css');
  fs.writeFileSync(findingFile,'body { font-family: Inter, sans-serif; }');
  const cleanFile = path.join(evidenceDir,'clean.css');
  fs.writeFileSync(cleanFile,'body { margin: 0; }');
  const freshEnv = {...env, LOCALAPPDATA:path.join(evidenceDir,'RedirectedLocalAppData')};
  if(process.platform!=='win32')freshEnv.XDG_STATE_HOME=path.join(evidenceDir,'redirected-state');
  delete freshEnv.BFS_STATE_HOME;
  for (const [name,root] of [['codex',firstCodexRoot],['claude',firstClaudeRoot]]) {
    for (const [label,target,exitCode,status] of [['findings',findingFile,2,'completed'],['clean',cleanFile,0,'completed'],['missing',path.join(evidenceDir,'missing.css'),1,'failed']]) {
      const result=execute(`impeccable-${name}-${label}-without-cache`,process.execPath,[path.join(root,'core/cli.mjs'),'engine','design-detect','--','detect','--json','--no-config',target],{cwd:evidenceDir,commandEnv:freshEnv,allowFailure:true});
      assert.equal(result.status,exitCode);
      const bridge=JSON.parse(result.stdout);
      assert.equal(bridge.exitCode,exitCode,bridge.stderr || bridge.stdout);
      assert.equal(bridge.status,status);
      if (label==='findings') assert.match(bridge.stdout,/overused-font/);
    }
  }

  const report = {
    status:'passed',
    sourcePackageRemoved:true,
    npmCacheRemoved:true,
    npxEntryTested:true,
    nativeHosts:['codex','claude'],
    firstVersion:version,
    upgradedVersion:'9.9.9-test.1',
    downgradedVersion:version,
    tarballs:[{ path:firstTarball.archive, sha256:firstTarball.sha256 }, { path:upgradeTarball.archive, sha256:upgradeTarball.sha256 }],
    stateHome,
    installedRoots:[firstCodexRoot,firstClaudeRoot,codexRoot,claudeRoot],
    activeRootsAfterDowngrade:[firstCodexRoot,firstClaudeRoot],
    nativeRegistrationsRemoved:true,
    pinnedStateSurvivedRedirectedLocalAppData:true,
    impeccable:{npmVersion:'4.5.2',freshProcessWithoutEnvironment:true,worksWithoutNpmCache:true,detectorExitCodes:[0,1,2],hosts:['codex','claude']},
    userStatePreserved:true,
    commandLogs,
    scope:'Real npm pack and npx CLI with real Codex and Claude CLIs. Temporary host configs and npm cache were isolated under this evidence directory. Fresh pinned engine and browser assets are retained for later verification.'
  };
  fs.writeFileSync(path.join(evidenceDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeAcceptanceEvidence(path.join(evidenceDir,'result.json'));
  console.log(JSON.stringify({ status:'passed', evidence:path.join(evidenceDir, 'result.json') }));
}
