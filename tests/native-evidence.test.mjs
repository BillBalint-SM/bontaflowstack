import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {writeNativeEvidence,writeCommandEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('native diagnostic file retains outcomes without transcripts, credentials or personal content',t=>{
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-evidence-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const privateText='CANARY-secret user@example.invalid C:\\Users\\PrivatePerson',binding='CANARY-binding';
  const events=[
    {type:'assistant.message',data:{content:privateText,reasoningText:privateText,reasoningOpaque:privateText,encryptedContent:privateText}},
    {type:'tool.execution_start',data:{toolName:'bfs-status',toolCallId:'call-a',arguments:{_bfsCall:binding,value:privateText}}},
    {type:'tool.execution_complete',data:{toolCallId:'call-a',success:true,result:{contents:[{type:'text',text:privateText}],binaryResultsForLlm:[{type:'image',data:privateText}]}}},
    {type:'tool.execution_start',data:{toolName:'powershell',toolCallId:'call-b',arguments:{command:privateText}}},
    {type:'tool.execution_complete',data:{toolCallId:'call-b',success:false,error:{code:privateText,message:privateText}}},
    {type:'tool_use',sessionID:privateText,part:{tool:'bfs_core',state:{status:'completed',input:{text:privateText},output:privateText,attachments:[{type:'file',mime:'image/png',url:privateText},{type:'file',mime:'application/pdf',url:privateText}]}}},
    {type:'tool_use',tool_name:'mcp_bfs_status',tool_id:'call-c',parameters:{_bfsCall:binding}},
    {type:'tool_result',tool_id:'call-c',status:'error',output:privateText},
    {type:'tool.execution_start',data:{toolName:privateText,toolCallId:'call-d',arguments:{value:privateText}}},
    {type:'error',error:{message:privateText}},
  ];
  const stdout=events.map(event=>JSON.stringify(event)).join('\n')+'\n'+privateText;
  const file=path.join(root,'native-evidence.json');
  const summary=writeNativeEvidence(file,{stdout,stderr:privateText,code:1});
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{
    schema:1,exitCode:1,stderrBytes:Buffer.byteLength(privateText),unparsedLines:1,errorEvents:1,
    tools:[{tool:'bfs-status',status:'succeeded',images:1},{tool:'powershell',status:'failed',images:0},{tool:'bfs_core',status:'succeeded',images:1},{tool:'mcp_bfs_status',status:'failed',images:0},{tool:'other',status:'incomplete',images:0}],
  });
  assert.doesNotMatch(JSON.stringify(summary),/CANARY|PrivatePerson|example\.invalid|reasoning|encryptedContent|_bfsCall/);
  const interrupted=writeNativeEvidence(file,{stdout:JSON.stringify(events[1])+'\n{"partial":',stderr:privateText,code:'timeout'});
  assert.equal(interrupted.exitCode,'timeout');assert.equal(interrupted.tools[0].status,'incomplete');assert.equal(interrupted.unparsedLines,1);
});

test('setup diagnostics retain command outcomes without captured output or personal paths',t=>{
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-evidence-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'command-evidence.json'),secret='CANARY-secret user@example.invalid C:\\Users\\PrivatePerson';
  const result={status:1,stdout:secret,stderr:secret,command:secret,args:[secret],cwd:secret,error:{message:secret}};
  assert.deepEqual(writeCommandEvidence(file,result),{schema:1,exitCode:1,stdoutBytes:Buffer.byteLength(secret),stderrBytes:Buffer.byteLength(secret)});
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/CANARY|PrivatePerson|example\.invalid|command|args|cwd|error/);
  assert.equal(writeCommandEvidence(file,{...result,code:'timeout'}).exitCode,'timeout');
  assert.equal(writeCommandEvidence(file,{...result,status:secret}).exitCode,null);
});

test('shareable acceptance summary keeps checked outcomes and leaves private continuation data unchanged',t=>{
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-evidence-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'result.json'),secret='CANARY-secret user@example.invalid C:\\Users\\PrivatePerson';
  const report={status:'passed',host:'opencode-cli',skillCount:34,hostSha256:'a'.repeat(64),configPreserved:true,impeccable:false,
    version:secret,sessionId:secret,workspace:secret,tarballs:[secret],events:[{output:secret}],failedTools:[{tool:secret,args:[secret]}],[secret]:true};
  const original=JSON.stringify(report);fs.writeFileSync(file,original);
  const summary=writeAcceptanceEvidence(file);
  assert.deepEqual(summary,{schema:1,scope:'recorded-checks-only',reportedStatus:'passed',checks:{impeccable:false,configPreserved:true},host:'opencode-cli',skillCount:34,hostSha256:'a'.repeat(64)});
  assert.equal(fs.readFileSync(file,'utf8'),original);
  const shared=fs.readFileSync(path.join(root,'result.acceptance-evidence.json'),'utf8');assert.deepEqual(JSON.parse(shared),summary);
  assert.doesNotMatch(shared,/CANARY|example\.invalid|PrivatePerson|sessionId|workspace|tarballs|events|failedTools/);
  fs.writeFileSync(file,JSON.stringify({exitCode:0,host:secret,skillCount:secret,hostSha256:secret,configPreserved:secret}));
  assert.deepEqual(writeAcceptanceEvidence(file),{schema:1,scope:'recorded-checks-only',reportedStatus:'unverified',checks:{}});
  fs.writeFileSync(file,JSON.stringify({status:'failed',healthCheck:false}));
  assert.equal(writeAcceptanceEvidence(file).reportedStatus,'failed');
});
