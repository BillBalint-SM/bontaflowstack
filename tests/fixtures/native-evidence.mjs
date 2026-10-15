import fs from 'node:fs';

const acceptanceChecks=[
  'healthCheck','skillActivation','coreRead','pinnedEngines','guardObserved','packagedHookMcp',
  'browserInteraction','sandbox','imagesViewed','imagesAttached','impeccable','ownBrowserStopped','configPreserved',
  'sourcePackageRemoved','npmCacheRemoved','npxEntryTested','nativeRegistrationsRemoved','pinnedStateSurvivedRedirectedLocalAppData',
  'cacheRemoved','statePreserved','disabledPreserved','mcpConflictPreserved','skillConflictPreserved','jsoncPreserved','foreignPluginPreserved','existingBfsMcpPreserved',
  'interruptedInstallRecovered','interruptedSourceSwapRecovered','acceptedBasis','behavioralRed','green','workflowPersisted','independentAcceptance',
  'driftDetected','ownershipAdopted','checkpointPreserved','memoryPreserved','otherProjectIsolated',
  'killedDuringRunningStep','sameSessionRecovered','interruptedBeforeRecheck','actualHealthCheck','otherLiveWorkflowPreserved',
  'sharedMemory','separateWorkspaces','foreignAdoptionRefused','shellCwdChanged','hostWorkspacePreserved','sameSessionReturned','recordsPreserved','gitWorktreesClean',
  'simultaneousBrowsers','firstClosedBeforeSecondContinued','otherPageMemoryPreserved','separateSessionCookies','bothOwnBrowsersStopped',
];

export function writeAcceptanceEvidence(file) {
  const target=file.replace(/\.json$/,'.acceptance-evidence.json');
  if(target===file)throw new Error('Acceptance result must be a JSON file');
  const result=JSON.parse(fs.readFileSync(file,'utf8'));
  // Private result files remain available to follow-up tests; only fixed outcome fields are shareable.
  const summary={schema:1,scope:'recorded-checks-only',reportedStatus:['passed','failed'].includes(result.status)?result.status:'unverified',checks:Object.fromEntries(acceptanceChecks.filter(key=>typeof result[key]==='boolean').map(key=>[key,result[key]]))};
  if(['codex','claude-code','gemini-cli','copilot-cli','cursor-ide','opencode-cli'].includes(result.host))summary.host=result.host;
  if(Number.isSafeInteger(result.skillCount) && result.skillCount>=0)summary.skillCount=result.skillCount;
  if(typeof result.hostSha256==='string' && /^[a-f0-9]{64}$/.test(result.hostSha256))summary.hostSha256=result.hostSha256;
  fs.writeFileSync(target,JSON.stringify(summary,null,2)+'\n');return summary;
}

export function writeCommandEvidence(file,result) {
  const code=result.code ?? result.status;
  const summary={schema:1,exitCode:Number.isInteger(code)?code:code==='timeout'?'timeout':null,stdoutBytes:Buffer.byteLength(result.stdout || ''),stderrBytes:Buffer.byteLength(result.stderr || '')};
  fs.writeFileSync(file,JSON.stringify(summary,null,2)+'\n');return summary;
}

export function setupFailure(result) {
  return String(result.stderr || '').split(/\r?\n/).filter(line=>/^(?:BontaFlowStack setup:|Setup incomplete|npm (?:error|ERR!)|\w*Error(?: \[[A-Z_]+\])?:)|sandbox|error while loading shared libraries|browserType.launch|Operation not permitted/.test(line)).slice(0,8).join('; ').replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]+|(?:gh[pousr]_|sk-)[\w-]+/gi,'[redacted]').slice(0,2400);
}

const toolNames=new Set([
  'skill','activate_skill','view','read','glob','grep','list','powershell','bash','apply_patch','create','edit','write',
  ...['core','status','browser','render','select_project'].flatMap(name=>['bfs-'+name,'bfs_'+name,'mcp_bfs_'+name]),
]);

export function writeNativeEvidence(file,result) {
  let unparsedLines=0;
  const events=String(result.stdout || '').split(/\r?\n/).filter(line=>line.trim()).flatMap(line=>{
    try {const event=JSON.parse(line);return event && typeof event==='object'?[event]:[];}
    catch {unparsedLines++;return [];}
  });
  const tools=events.filter(event=>['tool.execution_start','tool_use'].includes(event.type)).map(event=>{
    let tool,success,images=0;
    if(event.type==='tool.execution_start') {
      tool=event.data?.toolName;
      const done=events.find(item=>item.type==='tool.execution_complete' && item.data?.toolCallId===event.data?.toolCallId);
      success=done?.data?.success;
      images=done?.data?.result?.binaryResultsForLlm?.filter(item=>item.type==='image').length || 0;
    }else if(event.part) {
      tool=event.part.tool;
      if(['completed','error'].includes(event.part.state?.status))success=event.part.state.status==='completed';
      images=event.part.state?.attachments?.filter(item=>item.type==='file' && /^image\//.test(item.mime || '')).length || 0;
    }else {
      tool=event.tool_name;
      const done=events.find(item=>item.type==='tool_result' && item.tool_id===event.tool_id);
      if(done)success=done.status==='success';
    }
    return {tool:toolNames.has(tool)?tool:'other',status:success===true?'succeeded':success===false?'failed':'incomplete',images};
  });
  // Free-form host fields can contain secrets, account details or private SDK content.
  const code=result.code ?? result.status;
  const summary={schema:1,exitCode:Number.isInteger(code)?code:code==='timeout'?'timeout':null,stderrBytes:Buffer.byteLength(result.stderr || ''),unparsedLines,errorEvents:events.filter(event=>event.type==='error').length,tools};
  fs.writeFileSync(file,JSON.stringify(summary,null,2)+'\n');return summary;
}
