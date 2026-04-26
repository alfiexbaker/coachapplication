import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const ROOT = process.cwd();
const SERVICES_DIR = path.join(ROOT, 'services');

const PHASE1_TARGET_FILES = new Set([
  'services/notification-service.ts',
  'services/messaging-service.ts',
  'services/scheduling-rules-service.ts',
  'services/waitlist-service.ts',
  'services/safety-service.ts',
  'services/recurring-booking-service.ts',
  'services/cancellation-service.ts',
  'services/academy-service.ts',
  'services/referral-service.ts',
  'services/comparison-service.ts',
  'services/consent-service.ts',
  'services/verification-service.ts',
  'services/block-service.ts',
  'services/report-service.ts',
  'services/seen-service.ts',
  'services/discover-service.ts',
  'services/favourite-service.ts',
  'services/analytics/analytics-query-service.ts',
  'services/analytics/analytics-export-service.ts',
  'services/analytics/analytics-tracking-service.ts',
]);

const PHASE1_TARGET_PREFIXES = [
  'services/notification/',
  'services/wallet/',
  'services/progress/',
  'services/skills/',
];

function walkTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  const modifiers = (node as ts.Node & { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
  return !!modifiers?.some((m) => m.kind === kind);
}

function isPrivateOrProtected(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.PrivateKeyword) || hasModifier(node, ts.SyntaxKind.ProtectedKeyword);
}

function isPromiseResultType(typeText: string): boolean {
  return /Promise\s*<\s*Result\s*</.test(typeText);
}

function isPhase1Target(relativePath: string): boolean {
  if (PHASE1_TARGET_FILES.has(relativePath)) {
    return true;
  }
  return PHASE1_TARGET_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

test('Phase 1 gate: no storageService usage remains in services', () => {
  const offenders: string[] = [];
  const files = walkTsFiles(SERVICES_DIR);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('storageService')) {
      offenders.push(rel);
    }
  }

  assert.deepStrictEqual(offenders, []);
});

test('Phase 1 gate: no throw new Error remains in services', () => {
  const offenders: string[] = [];
  const files = walkTsFiles(SERVICES_DIR);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('throw new Error')) {
      offenders.push(rel);
    }
  }

  assert.deepStrictEqual(offenders, []);
});

test('Phase 1 gate: all service-named files define createLogger', () => {
  const missingLogger: string[] = [];
  const files = walkTsFiles(SERVICES_DIR).filter((file) =>
    path.basename(file).toLowerCase().includes('service')
  );

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('createLogger')) {
      missingLogger.push(rel);
    }
  }

  assert.deepStrictEqual(missingLogger, []);
});

test('Phase 1 gate: BaseService emit uses emitTyped', () => {
  const content = fs.readFileSync(path.join(ROOT, 'services/base-service.ts'), 'utf8');
  assert.ok(content.includes('emitTyped('));
});

test('Phase 1 gate: auth storage keys are centralized', () => {
  const content = fs.readFileSync(path.join(ROOT, 'services/auth-service.ts'), 'utf8');
  assert.ok(content.includes("from '@/constants/storage-keys'"));
  assert.ok(!content.includes('const STORAGE_KEYS = {'));
});

test('Phase 1 gate: exported async APIs in Phase 1 target services return Promise<Result<...>>', () => {
  const serviceFiles = walkTsFiles(SERVICES_DIR);
  const program = ts.createProgram(serviceFiles, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: false,
    strict: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    baseUrl: ROOT,
    paths: { '@/*': ['*'] },
  });
  const checker = program.getTypeChecker();
  const findings: string[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.fileName.startsWith(SERVICES_DIR) || sourceFile.isDeclarationFile) {
      continue;
    }

    const rel = path.relative(ROOT, sourceFile.fileName);
    if (!isPhase1Target(rel)) {
      continue;
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) {
      continue;
    }

    const exports = checker.getExportsOfModule(moduleSymbol);
    for (const expSym of exports) {
      const name = expSym.getName();
      if (name === 'default') {
        continue;
      }

      const symbol = (expSym.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(expSym) : expSym;
      const declarations = symbol.getDeclarations() || [];

      for (const decl of declarations) {
        if (ts.isFunctionDeclaration(decl) && hasModifier(decl, ts.SyntaxKind.AsyncKeyword)) {
          const signature = checker.getSignatureFromDeclaration(decl);
          if (!signature) {
            continue;
          }
          const returnType = checker.getReturnTypeOfSignature(signature);
          const returnText = checker.typeToString(returnType, undefined, ts.TypeFormatFlags.NoTruncation);
          if (!isPromiseResultType(returnText)) {
            const line = sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1;
            findings.push(`${rel}:${line} ${name} -> ${returnText}`);
          }
        }
      }

      const valueDecl = symbol.valueDeclaration || declarations[0];
      if (!valueDecl) {
        continue;
      }

      let valueNode: ts.Node = valueDecl;
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
          d.initializer != null &&
          (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) &&
          hasModifier(d.initializer, ts.SyntaxKind.AsyncKeyword)
        );

        if (!hasAsyncMethodDecl && !hasAsyncFunctionProp) {
          continue;
        }

        const propType = checker.getTypeOfSymbolAtLocation(prop, valueNode);
        const signatures = checker.getSignaturesOfType(propType, ts.SignatureKind.Call);
        if (signatures.length === 0) {
          continue;
        }

        const returnsResult = signatures.some((signature) => {
          const returnType = checker.getReturnTypeOfSignature(signature);
          const returnText = checker.typeToString(returnType, undefined, ts.TypeFormatFlags.NoTruncation);
          return isPromiseResultType(returnText);
        });

        if (!returnsResult) {
          const firstDecl = propDecls[0] || valueDecl;
          const pos = firstDecl.getStart();
          const line = sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
          const firstSig = signatures[0];
          const firstRetType = checker.typeToString(
            checker.getReturnTypeOfSignature(firstSig),
            undefined,
            ts.TypeFormatFlags.NoTruncation
          );
          findings.push(`${rel}:${line} ${name}.${prop.getName()} -> ${firstRetType}`);
        }
      }
    }
  }

  assert.deepStrictEqual(findings, []);
});
