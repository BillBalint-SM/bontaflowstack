import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkLocalLinks} from './check.mjs';
import {ReleaseError,requireRelease,digest,canonical,contractHash,desktopInputs,validatePolicy,validateNative,validateEvidence,validateVersionPromotion,contractVersion} from './release-gate.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url));
const hash=file=>digest(fs.readFileSync(file));
const read=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){throw new ReleaseError('INPUT_INVALID','input','Cannot read release JSON.',{file,error:error.message});}};
const save=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
function files(root) {
  return fs.readdirSync(root,{withFileTypes:true}).flatMap(item=>{
    const file=path.join(root,item.name);
    requireRelease(!fs.lstatSync(file).isSymbolicLink(),'LINK_REJECTED','inventory','Package/evidence links are not allowed.',{file});
    return item.isDirectory()?files(file):[file];
  });
}
function inside(root,name) {
  requireRelease(typeof name==='string'&&name.length>0&&!path.isAbsolute(name),'PATH_REJECTED','evidence','Expected a relative evidence filename.');
  const file=path.resolve(root,name);
  requireRelease(file.startsWith(path.resolve(root)+path.sep),'PATH_REJECTED','evidence','Evidence path escapes its bundle.');
  return file;
}
function powershell(script,args,stage) {
  const env={...process.env};delete env.PSModulePath;
  const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(repo,'scripts',script),...args],{encoding:'utf8',env,windowsHide:true,timeout:60000,maxBuffer:16*1024*1024});
  requireRelease(!result.error&&result.status===0,result.error?.code==='ETIMEDOUT'?'STEP_TIMEOUT':'PACKAGE_CHECK_FAILED',stage,'Release step failed.',{script,exitCode:result.status,error:(result.error?.message||result.stderr||result.stdout).slice(0,4000)});
  return result.stdout.trim();
}
function inspect(archive,run,validateLayout=true) {
  requireRelease(fs.existsSync(archive),'CANDIDATE_MISSING','candidate','Candidate ZIP is missing.',{archive});
  const extracted=path.join(run,'unpacked-'+randomUUID());
  const snapshot=JSON.parse(powershell('release-archive.ps1',['-Mode','Inspect','-Archive',archive,'-Destination',extracted],'archive'));
  snapshot.archive=archive;snapshot.extracted=extracted;
  if(validateLayout) {
    for(const file of files(extracted).filter(x=>x.endsWith('.md'))) {
      try{checkLocalLinks(file);}catch(error){throw new ReleaseError('DOCUMENTATION_INVALID','documentation',error.message);}
    }
    powershell('release-guide-syntax.ps1',['-Root',extracted],'documentation');
  }
  return snapshot;
}
function loadPolicy(file) {
  const policy=read(file);validatePolicy(policy);
  policy.contractSha256=contractHash(['release/desktop-acceptance.md','release/desktop-fixture.html'].map(name=>fs.readFileSync(path.join(repo,name),'utf8')));
  return policy;
}
function copy(source,destination) {
  requireRelease(!fs.lstatSync(source).isSymbolicLink(),'LINK_REJECTED','prepare','Source links cannot enter the package.',{source});
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);
}
function prepare(source,output,run) {
  const version=read(path.join(source,'plugins/bontaflowstack/.codex-plugin/plugin.json')).version;
  requireRelease(/^\d+\.\d+\.\d+$/.test(version),'VERSION_INVALID','prepare','A release version is required.');
  const stage=path.join(run,'source');fs.mkdirSync(stage);
  const names=['.agents/plugins/marketplace.json','scripts/setup.ps1','LICENSE','README.md','TELEPITES.md',
    'docs/bontaflowstack/INSTALL-WINDOWS.md','docs/bontaflowstack/LOCAL-DATA.md','docs/bontaflowstack/CHANGELOG.md','docs/bontaflowstack/RELEASE-'+version+'.md'];
  for(const name of fs.readdirSync(path.join(source,'docs/bontaflowstack')).filter(name=>/^RELEASE-\d+\.\d+\.\d+\.md$/.test(name)&&name!=='RELEASE-'+version+'.md'))names.push('docs/bontaflowstack/'+name);
  for(const folder of ['plugins/bontaflowstack','docs/diagrams','docs/bontaflowstack/release']) {
    const root=path.join(source,folder);
    if(fs.existsSync(root))names.push(...files(root).map(file=>path.relative(source,file)));
  }
  const publicEvidence='docs/bontaflowstack/RELEASE-EVIDENCE.json';
  if(fs.existsSync(path.join(source,publicEvidence)))names.push(publicEvidence);
  for(const name of names) {
    requireRelease(fs.existsSync(path.join(source,name)),'SOURCE_FILE_MISSING','prepare','Required distribution file is missing.',{name});
    copy(path.join(source,name),path.join(stage,name));
  }
  const inventory=Object.fromEntries(files(stage).map(file=>[path.relative(stage,file).replaceAll('\\','/'),hash(file)]).sort(([a],[b])=>a.localeCompare(b)));
  save(path.join(stage,'PACKAGE.json'),{schema:1,version,kind:'candidate',finalized:false,checks:'pending-release-gate',files:inventory});
  fs.mkdirSync(output,{recursive:true});
  const archive=path.join(output,'BontaFlowStack-'+version+'.zip');
  requireRelease(!fs.existsSync(archive),'OUTPUT_EXISTS','prepare','Candidate output already exists; use a new directory.');
  powershell('release-archive.ps1',['-Mode','Pack','-Archive',archive,'-Source',stage],'prepare');
  const snapshot=inspect(archive,run);
  fs.writeFileSync(archive+'.sha256',snapshot.archiveSha256+'  '+path.basename(archive)+'\n',{flag:'wx'});
  return {outcome:'candidate',archive,version,archiveSha256:snapshot.archiveSha256,next:'Install this candidate through Codex, then follow release/desktop-acceptance.md. Use check to find reusable evidence before any new test.'};
}
function record(snapshot,rawPath,evidenceRoot,policy,profile) {
  const raw=read(rawPath);
  requireRelease(raw.contractSha256===policy.contractSha256,'DESKTOP_CONTRACT_STALE','record','Raw observations must identify the acceptance procedure used; record cannot relabel old evidence.');
  requireRelease(canonical(raw.environment)===canonical(policy.environment)&&raw.approvalPolicy===profile.approvalPolicy,'DESKTOP_ENVIRONMENT_UNPROVEN','record','Raw acceptance must contain the observed Desktop/CLI versions and approval policy. Do not fill these from release policy.');
  const inputs={version:snapshot.version,archiveSha256:snapshot.archiveSha256,files:desktopInputs(snapshot.files)};
  validateNative(raw,inputs,profile);
  const target=path.join(evidenceRoot,profile.id);
  requireRelease(!fs.existsSync(target),'EVIDENCE_EXISTS','record','Evidence is immutable; choose a new evidence directory.');
  const pictures=['before_capture','after_capture'].map(name=>{
    const value=JSON.parse(raw.nativeResults[name].content.find(x=>x.type==='text').text).path;
    requireRelease(fs.existsSync(value)&&!fs.lstatSync(value).isSymbolicLink(),'SCREENSHOT_MISSING','record','Captured screenshot is missing.',{name,path:value});
    const bytes=fs.readFileSync(value);
    requireRelease(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'SCREENSHOT_INVALID','record','Capture must be a PNG.');
    return {name:name+'.png',bytes,sha256:digest(bytes)};
  });
  requireRelease(pictures[0].sha256!==pictures[1].sha256,'SCREENSHOT_INVALID','record','Before/after captures must differ.');
  fs.mkdirSync(target,{recursive:true});
  save(path.join(target,'native.json'),raw);
  for(const picture of pictures)fs.writeFileSync(path.join(target,picture.name),picture.bytes,{flag:'wx'});
  const receipt={schema:1,contractVersion,contractSha256:policy.contractSha256,client:'codex-desktop-native-tools',environment:policy.environment,profile,inputs,nativeSha256:digest(canonical(raw)),nativeFile:'native.json',screenshots:pictures.map(({name,sha256})=>({file:name,sha256})),recordedAt:new Date().toISOString()};
  save(path.join(target,'receipt.json'),receipt);
  return {outcome:'recorded',profile:profile.id,receipt:path.join(target,'receipt.json'),sourceArchiveSha256:snapshot.archiveSha256,note:'Recorded prior observed results; this command did not run a Desktop test.'};
}
function check(snapshot,evidenceRoot,policy) {
  return policy.profiles.map(profile=>{
    const folder=path.join(evidenceRoot,profile.id),receiptPath=path.join(folder,'receipt.json');
    requireRelease(fs.existsSync(receiptPath),'DESKTOP_EVIDENCE_MISSING','desktop-evidence','No Desktop receipt for the required profile.',{profile:profile.id,expected:receiptPath});
    requireRelease(!fs.lstatSync(folder).isSymbolicLink(),'LINK_REJECTED','desktop-evidence','Evidence directories cannot be links.');
    const receipt=read(receiptPath),rawPath=inside(folder,receipt.nativeFile);
    requireRelease(fs.existsSync(rawPath),'DESKTOP_TRACE_MISSING','desktop-evidence','Native trace file is missing.',{profile:profile.id});
    requireRelease(!fs.lstatSync(rawPath).isSymbolicLink(),'LINK_REJECTED','desktop-evidence','Native trace must not be a link.');
    const result=validateEvidence(snapshot,receipt,read(rawPath),policy,profile);
    requireRelease(Array.isArray(receipt.screenshots)&&receipt.screenshots.length===2,'SCREENSHOT_MISSING','desktop-evidence','Both screenshots must be retained.');
    for(const picture of receipt.screenshots) {
      const file=inside(folder,picture.file);
      requireRelease(fs.existsSync(file)&&!fs.lstatSync(file).isSymbolicLink()&&hash(file)===picture.sha256,'SCREENSHOT_CHANGED','desktop-evidence','Screenshot is missing or changed.',{profile:profile.id,file:picture.file});
    }
    return {...result,receiptSha256:hash(receiptPath),nativeSha256:receipt.nativeSha256};
  });
}
function finalize(snapshot,proofs,policy,output) {
  const folder=path.join(output,snapshot.version);
  requireRelease(!fs.existsSync(folder),'OUTPUT_EXISTS','finalize','A finalized version already exists. It will not be replaced.');
  const bytes=fs.readFileSync(snapshot.archive);
  requireRelease(digest(bytes)===snapshot.archiveSha256,'CANDIDATE_CHANGED','finalize','Candidate changed after validation.');
  fs.mkdirSync(output,{recursive:true});
  const staging=path.resolve(output,'.pending-'+randomUUID()),destination=path.resolve(folder);
  requireRelease([staging,destination].every(x=>x.startsWith(path.resolve(output)+path.sep)),'PATH_REJECTED','finalize','Finalization paths must stay within the selected output directory.');
  fs.mkdirSync(staging);
  const name='BontaFlowStack-'+snapshot.version+'.zip';
  fs.writeFileSync(path.join(staging,name),bytes,{flag:'wx'});
  fs.writeFileSync(path.join(staging,name+'.sha256'),snapshot.archiveSha256+'  '+name+'\n',{flag:'wx'});
  save(path.join(staging,'RELEASE-RECEIPT.json'),{schema:1,outcome:'released',version:snapshot.version,archive:name,archiveSha256:snapshot.archiveSha256,policySha256:digest(canonical(policy)),contractSha256:policy.contractSha256,profiles:proofs,finalizedAt:new Date().toISOString(),functionalTestsRerun:false});
  fs.renameSync(staging,destination);
  return {outcome:'released',directory:destination,archiveSha256:snapshot.archiveSha256,profiles:proofs};
}
function serve() {
  const content=fs.readFileSync(path.join(repo,'release/desktop-fixture.html'));
  const server=http.createServer((request,response)=>{response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(content);});
  server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+server.address().port+'/',pid:process.pid,fixtureSha256:digest(content)})));
  process.once('SIGINT',()=>server.close());process.once('SIGTERM',()=>server.close());
}
async function main() {
  const [command,...args]=process.argv.slice(2);
  if(command==='fixture') {requireRelease(args.length===0,'ARGUMENT_INVALID','arguments','fixture accepts no flags.');serve();return;}
  if(command==='help'||!command) {console.log('release.mjs prepare --source DIR --output DIR | record --candidate ZIP --raw JSON --profile ID --evidence DIR | check/finalize --candidate ZIP --evidence DIR [--output DIR] [--basis-candidate ZIP] [--policy FILE] [--report FILE]\nNo skip/force option. See docs/bontaflowstack/RELEASE-PROCESS.md.');return;}
  const options={};
  for(let i=0;i<args.length;i+=2) {
    const key=args[i]?.replace(/^--/,'');
    requireRelease(['source','output','candidate','basis-candidate','raw','profile','evidence','policy','report'].includes(key)&&args[i].startsWith('--')&&args[i+1]&&!args[i+1].startsWith('--')&&!Object.hasOwn(options,key),'ARGUMENT_INVALID','arguments','Unknown, duplicate or incomplete release argument.',{argument:args[i]});
    options[key]=args[i+1];
  }
  const run=path.join(repo,'artifacts/release-runs',randomUUID());fs.mkdirSync(run,{recursive:true});
  const report=options.report?path.resolve(options.report):path.join(run,'result.json');
  const context={command,run};
  requireRelease(!fs.existsSync(report),'OUTPUT_EXISTS','report','Report output already exists; choose a new path.',{report});
  save(report,{...context,outcome:'running'});
  const writeReport=value=>fs.writeFileSync(report,JSON.stringify(value,null,2)+'\n');
  try {
    requireRelease(!options['basis-candidate']||['check','finalize'].includes(command),'ARGUMENT_INVALID','arguments','--basis-candidate is only valid for check/finalize.');
    const policy=loadPolicy(path.resolve(options.policy||path.join(repo,'release/policy.json')));
    context.environment=policy.environment;context.contractSha256=policy.contractSha256;
    let result;
    if(command==='prepare') {
      requireRelease(options.source&&options.output,'ARGUMENT_INVALID','arguments','prepare requires --source and --output.');
      result=prepare(path.resolve(options.source),path.resolve(options.output),run);
    } else {
      requireRelease(['record','check','finalize'].includes(command)&&options.candidate&&options.evidence,'ARGUMENT_INVALID','arguments','Use record/check/finalize with --candidate and --evidence.');
      const snapshot=inspect(path.resolve(options.candidate),run,command!=='record');
      Object.assign(context,{version:snapshot.version,candidateArchiveSha256:snapshot.archiveSha256});
      if(command==='record') {
        const profile=policy.profiles.find(x=>x.id===options.profile);
        requireRelease(profile&&options.raw,'ARGUMENT_INVALID','arguments','record requires a required --profile and --raw native result file.');
        result=record(snapshot,path.resolve(options.raw),path.resolve(options.evidence),policy,profile);
      } else {
        const basis=options['basis-candidate']?inspect(path.resolve(options['basis-candidate']),run,false):snapshot;
        let proofs=check(basis,path.resolve(options.evidence),policy);
        if(basis!==snapshot) {
          const versionPromotion=validateVersionPromotion(snapshot,basis,(item,name)=>fs.readFileSync(inside(item.extracted,name)));
          proofs=proofs.map(proof=>({...proof,documentationOnlyReuse:false,candidateArchiveSha256:snapshot.archiveSha256,versionPromotion}));
        }
        if(command==='finalize')requireRelease(options.output,'ARGUMENT_INVALID','arguments','finalize requires --output.');
        result=command==='check'?{outcome:'eligible',profiles:proofs}:finalize(snapshot,proofs,policy,path.resolve(options.output));
      }
    }
    writeReport({...context,...result});console.log(JSON.stringify({...result,report}));
  } catch(error) {
    const failure={...context,outcome:'blocked',code:error.code||'RELEASE_ERROR',stage:error.stage||'release',message:error.message,detail:error.detail||{},nextAction:'Resolve the reported input/environment/step only. Reuse unchanged closed evidence; never substitute a custom client for Desktop.'};
    writeReport(failure);console.error(JSON.stringify({...failure,report}));process.exitCode=1;
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(JSON.stringify({outcome:'blocked',code:error.code||'RELEASE_ERROR',stage:error.stage||'arguments',message:error.message,detail:error.detail||{}}));process.exitCode=1;});
