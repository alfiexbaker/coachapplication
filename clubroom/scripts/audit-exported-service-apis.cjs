const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = process.cwd();
const servicesDir = path.join(root, 'services');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && p.endsWith('.ts') && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const files = walk(servicesDir);

const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowJs: false,
  strict: true,
  skipLibCheck: true,
  jsx: ts.JsxEmit.ReactJSX,
  baseUrl: root,
  paths: { '@/*': ['*'] },
});

const checker = program.getTypeChecker();

function hasModifier(node, kind) {
  return !!(node.modifiers && node.modifiers.some((m) => m.kind === kind));
}

function isPrivateOrProtected(node) {
  return hasModifier(node, ts.SyntaxKind.PrivateKeyword) || hasModifier(node, ts.SyntaxKind.ProtectedKeyword);
}

function isPromiseResultType(typeStr) {
  return /Promise\s*<\s*Result\s*</.test(typeStr);
}

const findings = [];

for (const sf of program.getSourceFiles()) {
  if (!sf.fileName.startsWith(servicesDir) || sf.isDeclarationFile) continue;

  const moduleSymbol = checker.getSymbolAtLocation(sf);
  if (!moduleSymbol) continue;

  const exports = checker.getExportsOfModule(moduleSymbol);

  for (const expSym of exports) {
    const name = expSym.getName();
    if (name === 'default') continue;

    const aliased = (expSym.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(expSym) : expSym;
    const declarations = aliased.getDeclarations() || [];

    for (const decl of declarations) {
      if (ts.isFunctionDeclaration(decl) && hasModifier(decl, ts.SyntaxKind.AsyncKeyword)) {
        const sig = checker.getSignatureFromDeclaration(decl);
        if (!sig) continue;
        const retType = checker.getReturnTypeOfSignature(sig);
        const retStr = checker.typeToString(retType, undefined, ts.TypeFormatFlags.NoTruncation);
        if (!isPromiseResultType(retStr)) {
          findings.push({
            file: sf.fileName,
            exportName: name,
            kind: 'function',
            member: name,
            returnType: retStr,
            line: sf.getLineAndCharacterOfPosition((decl.name && decl.name.getStart()) || decl.getStart()).line + 1,
          });
        }
      }
    }

    const valueDecl = aliased.valueDeclaration || declarations[0];
    if (!valueDecl) continue;

    let valueNode = valueDecl;
    if (ts.isVariableDeclaration(valueDecl) && valueDecl.initializer) {
      valueNode = valueDecl.initializer;
    }

    const valueType = checker.getTypeAtLocation(valueNode);
    const props = checker.getPropertiesOfType(valueType);

    for (const prop of props) {
      const propDecls = prop.getDeclarations() || [];
      const hasAsyncMethodDecl = propDecls.some((d) =>
        ts.isMethodDeclaration(d) &&
        !isPrivateOrProtected(d) &&
        hasModifier(d, ts.SyntaxKind.AsyncKeyword)
      );
      const hasAsyncFunctionProp = propDecls.some((d) =>
        ts.isPropertyDeclaration(d) &&
        !isPrivateOrProtected(d) &&
        d.initializer &&
        (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) &&
        hasModifier(d.initializer, ts.SyntaxKind.AsyncKeyword)
      );

      if (!hasAsyncMethodDecl && !hasAsyncFunctionProp) continue;

      const propType = checker.getTypeOfSymbolAtLocation(prop, valueNode);
      const sigs = checker.getSignaturesOfType(propType, ts.SignatureKind.Call);
      if (sigs.length === 0) continue;

      let anyResult = false;
      let firstReturn = '';
      for (const sig of sigs) {
        const retType = checker.getReturnTypeOfSignature(sig);
        const retStr = checker.typeToString(retType, undefined, ts.TypeFormatFlags.NoTruncation);
        if (!firstReturn) firstReturn = retStr;
        if (isPromiseResultType(retStr)) {
          anyResult = true;
          break;
        }
      }

      if (!anyResult) {
        const d = propDecls[0] || valueDecl;
        const pos = (d.name && d.name.getStart && d.name.getStart()) || (d.getStart && d.getStart()) || valueDecl.getStart();
        const lc = sf.getLineAndCharacterOfPosition(pos);
        findings.push({
          file: sf.fileName,
          exportName: name,
          kind: 'method',
          member: prop.getName(),
          returnType: firstReturn || 'unknown',
          line: lc.line + 1,
        });
      }
    }
  }
}

findings.sort((a, b) => (a.file + a.member).localeCompare(b.file + b.member));

const grouped = new Map();
for (const f of findings) {
  const rel = path.relative(root, f.file);
  const arr = grouped.get(rel) || [];
  arr.push(f);
  grouped.set(rel, arr);
}

console.log(`non_result_exported_async_count: ${findings.length}`);
console.log(`files_with_non_result_exported_async: ${grouped.size}`);
for (const [file, arr] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${file} (${arr.length})`);
  for (const item of arr.slice(0, 20)) {
    console.log(`  L${item.line} ${item.exportName}.${item.member} -> ${item.returnType}`);
  }
  if (arr.length > 20) console.log(`  ... ${arr.length - 20} more`);
}

fs.writeFileSync('/tmp/non_result_exported_async.json', JSON.stringify(findings, null, 2));
