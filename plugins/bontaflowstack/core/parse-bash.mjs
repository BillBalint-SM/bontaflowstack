// shortcut: supports only single literal Bash commands; extend when a concrete script grammar is needed.
export function parseBash(source) {
  const commands = [];
  const args = [];
  let word = '', started = false, quote = null, escaped = false;
  const finishWord = () => { if (started) args.push(word); word = ''; started = false; };
  const finishCommand = () => {
    finishWord();
    if (args.length) commands.push({ name:args.shift(), args:args.splice(0), text:source });
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (escaped) { if (char === '\n' || char === '\r') return { valid:false, commands:[] }; word += char; started = true; escaped = false; continue; }
    if (quote === "'") { if (char === "'") quote = null; else word += char; started = true; continue; }
    if (quote === '"') {
      if (char === '"') { quote = null; started = true; continue; }
      if (char === '$' || char === '`') return { valid:false, commands:[] };
      if (char === '\\' && ['$', '`', '"', '\\', '\n'].includes(source[i+1])) { escaped = true; continue; }
      word += char; started = true; continue;
    }
    if (char === '\\') { escaped = true; started = true; continue; }
    if (char === "'" || char === '"') { quote = char; started = true; continue; }
    if (char === '#' && !started) { while (i < source.length && source[i] !== '\n') i++; if (source.slice(i + 1).trim()) return { valid:false, commands:[] }; break; }
    if (/\s/.test(char)) {
      finishWord();
      if (char === '\n' && source.slice(i + 1).trim()) return { valid:false, commands:[] };
      continue;
    }
    if (/[;$|&<>(){}*?~`]/.test(char) || char === '$') return { valid:false, commands:[] };
    word += char; started = true;
  }
  if (quote || escaped) return { valid:false, commands:[] };
  finishCommand();
  if (commands.some(command => /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(command.name))) return { valid:false, commands:[] };
  return { valid:true, commands };
}
