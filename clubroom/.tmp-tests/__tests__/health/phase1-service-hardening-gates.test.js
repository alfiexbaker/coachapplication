"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const typescript_1 = __importDefault(require("typescript"));
const ROOT = process.cwd();
const SERVICES_DIR = node_path_1.default.join(ROOT, 'services');
const PHASE1_TARGET_FILES = new Set([
    'services/notification-service.ts',
    'services/messaging-service.ts',
    'services/scheduling-rules-service.ts',
    'services/waitlist-service.ts',
    'services/counter-offer-service.ts',
    'services/safety-service.ts',
    'services/package-service.ts',
    'services/recurring-booking-service.ts',
    'services/cancellation-service.ts',
    'services/academy-service.ts',
    'services/referral-service.ts',
    'services/review-service.ts',
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
function walkTsFiles(dir) {
    const files = [];
    for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = node_path_1.default.join(dir, entry.name);
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
function hasModifier(node, kind) {
    const modifiers = node.modifiers;
    return !!modifiers?.some((m) => m.kind === kind);
}
function isPrivateOrProtected(node) {
    return hasModifier(node, typescript_1.default.SyntaxKind.PrivateKeyword) || hasModifier(node, typescript_1.default.SyntaxKind.ProtectedKeyword);
}
function isPromiseResultType(typeText) {
    return /Promise\s*<\s*Result\s*</.test(typeText);
}
function isPhase1Target(relativePath) {
    if (PHASE1_TARGET_FILES.has(relativePath)) {
        return true;
    }
    return PHASE1_TARGET_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}
(0, node_test_1.default)('Phase 1 gate: no storageService usage remains in services', () => {
    const offenders = [];
    const files = walkTsFiles(SERVICES_DIR);
    for (const file of files) {
        const rel = node_path_1.default.relative(ROOT, file);
        const content = node_fs_1.default.readFileSync(file, 'utf8');
        if (content.includes('storageService')) {
            offenders.push(rel);
        }
    }
    node_assert_1.default.deepStrictEqual(offenders, []);
});
(0, node_test_1.default)('Phase 1 gate: no throw new Error remains in services', () => {
    const offenders = [];
    const files = walkTsFiles(SERVICES_DIR);
    for (const file of files) {
        const rel = node_path_1.default.relative(ROOT, file);
        const content = node_fs_1.default.readFileSync(file, 'utf8');
        if (content.includes('throw new Error')) {
            offenders.push(rel);
        }
    }
    node_assert_1.default.deepStrictEqual(offenders, []);
});
(0, node_test_1.default)('Phase 1 gate: all service-named files define createLogger', () => {
    const missingLogger = [];
    const files = walkTsFiles(SERVICES_DIR).filter((file) => node_path_1.default.basename(file).toLowerCase().includes('service'));
    for (const file of files) {
        const rel = node_path_1.default.relative(ROOT, file);
        const content = node_fs_1.default.readFileSync(file, 'utf8');
        if (!content.includes('createLogger')) {
            missingLogger.push(rel);
        }
    }
    node_assert_1.default.deepStrictEqual(missingLogger, []);
});
(0, node_test_1.default)('Phase 1 gate: BaseService emit uses emitTyped', () => {
    const content = node_fs_1.default.readFileSync(node_path_1.default.join(ROOT, 'services/base-service.ts'), 'utf8');
    node_assert_1.default.ok(content.includes('emitTyped('));
});
(0, node_test_1.default)('Phase 1 gate: auth storage keys are centralized', () => {
    const content = node_fs_1.default.readFileSync(node_path_1.default.join(ROOT, 'services/auth-service.ts'), 'utf8');
    node_assert_1.default.ok(content.includes("from '@/constants/storage-keys'"));
    node_assert_1.default.ok(!content.includes('const STORAGE_KEYS = {'));
});
(0, node_test_1.default)('Phase 1 gate: exported async APIs in Phase 1 target services return Promise<Result<...>>', () => {
    const serviceFiles = walkTsFiles(SERVICES_DIR);
    const program = typescript_1.default.createProgram(serviceFiles, {
        target: typescript_1.default.ScriptTarget.ES2022,
        module: typescript_1.default.ModuleKind.ESNext,
        moduleResolution: typescript_1.default.ModuleResolutionKind.Bundler,
        allowJs: false,
        strict: true,
        skipLibCheck: true,
        jsx: typescript_1.default.JsxEmit.ReactJSX,
        baseUrl: ROOT,
        paths: { '@/*': ['*'] },
    });
    const checker = program.getTypeChecker();
    const findings = [];
    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.fileName.startsWith(SERVICES_DIR) || sourceFile.isDeclarationFile) {
            continue;
        }
        const rel = node_path_1.default.relative(ROOT, sourceFile.fileName);
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
            const symbol = (expSym.flags & typescript_1.default.SymbolFlags.Alias) ? checker.getAliasedSymbol(expSym) : expSym;
            const declarations = symbol.getDeclarations() || [];
            for (const decl of declarations) {
                if (typescript_1.default.isFunctionDeclaration(decl) && hasModifier(decl, typescript_1.default.SyntaxKind.AsyncKeyword)) {
                    const signature = checker.getSignatureFromDeclaration(decl);
                    if (!signature) {
                        continue;
                    }
                    const returnType = checker.getReturnTypeOfSignature(signature);
                    const returnText = checker.typeToString(returnType, undefined, typescript_1.default.TypeFormatFlags.NoTruncation);
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
            let valueNode = valueDecl;
            if (typescript_1.default.isVariableDeclaration(valueDecl) && valueDecl.initializer) {
                valueNode = valueDecl.initializer;
            }
            const valueType = checker.getTypeAtLocation(valueNode);
            const props = checker.getPropertiesOfType(valueType);
            for (const prop of props) {
                const propDecls = prop.getDeclarations() || [];
                const hasAsyncMethodDecl = propDecls.some((d) => typescript_1.default.isMethodDeclaration(d) &&
                    !isPrivateOrProtected(d) &&
                    hasModifier(d, typescript_1.default.SyntaxKind.AsyncKeyword));
                const hasAsyncFunctionProp = propDecls.some((d) => typescript_1.default.isPropertyDeclaration(d) &&
                    !isPrivateOrProtected(d) &&
                    d.initializer != null &&
                    (typescript_1.default.isArrowFunction(d.initializer) || typescript_1.default.isFunctionExpression(d.initializer)) &&
                    hasModifier(d.initializer, typescript_1.default.SyntaxKind.AsyncKeyword));
                if (!hasAsyncMethodDecl && !hasAsyncFunctionProp) {
                    continue;
                }
                const propType = checker.getTypeOfSymbolAtLocation(prop, valueNode);
                const signatures = checker.getSignaturesOfType(propType, typescript_1.default.SignatureKind.Call);
                if (signatures.length === 0) {
                    continue;
                }
                const returnsResult = signatures.some((signature) => {
                    const returnType = checker.getReturnTypeOfSignature(signature);
                    const returnText = checker.typeToString(returnType, undefined, typescript_1.default.TypeFormatFlags.NoTruncation);
                    return isPromiseResultType(returnText);
                });
                if (!returnsResult) {
                    const firstDecl = propDecls[0] || valueDecl;
                    const pos = firstDecl.getStart();
                    const line = sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
                    const firstSig = signatures[0];
                    const firstRetType = checker.typeToString(checker.getReturnTypeOfSignature(firstSig), undefined, typescript_1.default.TypeFormatFlags.NoTruncation);
                    findings.push(`${rel}:${line} ${name}.${prop.getName()} -> ${firstRetType}`);
                }
            }
        }
    }
    node_assert_1.default.deepStrictEqual(findings, []);
});
