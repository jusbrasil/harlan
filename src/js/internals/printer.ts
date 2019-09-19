import { readFileSync, writeFileSync, existsSync, renameSync, truncateSync } from 'fs';
import { Property, Signature, Type } from './signature';
import { reduceSignatures } from './disambiguate';

const genericThisType = 'T'

interface SignatureFile {
    [fname: string]: Signature[];
}

function visitProperty(property: Property) {
    let name = property.name;

    name =
        name === '' ? '\'\'' :
            name.includes('-') ? `'${name}'` :
                name;

    return `${name}${property.optional ? '?' : ''}: ${visitType(property.type)}`;
}

function visitType(type: Type): string {
    if (typeof type === 'string') {
        if (type === 'jQuery') {
            return 'JQuery<HTMLElement>';
        } else if (type === 'Array') {
            return 'Array<any>';
        } else {
            return type;
        }
    } else if (Array.isArray(type)) {
        let properties = type.map(visitProperty);

        return `{ ${properties.join(', ')} }`;
    } else {
        return type.types.map(visitType).join(' | ');
    }
}

function visitReturnType(type: Type) {
    if (type === 'undefined') {
        return 'void';
    } else if (type === 'this') {
        return genericThisType;
    } else {
        return visitType(type);
    }
}

function isObject(type: string) {
    return type.startsWith('{') || type.startsWith('undefined') || type.startsWith('null');
}

function getParameterName(type: string) {
    if (isObject(type)) {
        return 'obj';
    }

    const index = type.indexOf(' | ');

    if (index !== -1) {
        type = type.substring(0, index);
    }

    switch (type) {
        case 'boolean':
            return 'flag';
        case 'number':
            return 'num';
        case 'string':
            return 'text';
        case 'Function':
            return 'callback';
        case 'HTMLDocument':
            return 'document';
        case 'Element':
        case 'JQuery<HTMLElement>':
            return 'element';
        case 'Array<any>':
            return 'array';
        default:
            return `${type[0].toLowerCase()}${type.substr(1)}`;
    }
}

function visitSignature(signature: Signature) {
    let parameters = signature.parameters.map((s, i) => visitType(s));

    let names: { [name: string]: number } = {};
    let names2: { [name: string]: number } = {};

    parameters.forEach(p => {
        const name = getParameterName(p);
        names[name] = names[name] ? names[name] + 1 : 1;
    });

    parameters = parameters.map((p, i) => {
        const optional = signature.firstOptionalParameterIndex !== undefined
            && i >= signature.firstOptionalParameterIndex ? '?' : '';

        const name = getParameterName(p);
        names2[name] = names2[name] ? names2[name] + 1 : 1;
        return `${name}${names[name] > 1 ? names2[name] : ''}${optional}: ${p}`;
    });

    return `(name: '${signature.name}'${parameters.length ? `, ${parameters.join(', ')}`: ''}): ${visitReturnType(signature.return)};`;
}

function addJsonField(signatures: SignatureFile) {
    for (const fname in signatures) {
        signatures[fname].forEach(s => (s.json = JSON.stringify(s)));
    }
}

function removeJsonField(signatures: SignatureFile) {
    for (const fname in signatures) {
        signatures[fname].forEach(s => delete s.json);
    }
}

function joinSignatures() {
    let newSignatures!: SignatureFile;
    let signatures!: SignatureFile;

    if (existsSync('./new-signatures.json')) {
        const content = readFileSync('./new-signatures.json', 'utf8');

        if (content) {
            newSignatures = JSON.parse(content);
            addJsonField(newSignatures);
        }
    }

    if (existsSync('./signatures.json')) {
        signatures = JSON.parse(readFileSync('./signatures.json', 'utf8'));
        addJsonField(signatures);
    }

    if (newSignatures && signatures) {
        for (const fname in newSignatures) {
            if (!signatures[fname]) {
                signatures[fname] = newSignatures[fname];
            } else {
                for (const signature of newSignatures[fname]) {
                    if (!signatures[fname].find(s => s.json === signature.json)) {
                        signatures[fname].push(signature);
                    }
                }

                signatures[fname].sort((a, b) => a.json!.localeCompare(b.json!));
            }
        }

        removeJsonField(signatures);
        writeFileSync('./signatures.json', JSON.stringify(signatures, undefined, '    '));
        truncateSync('./new-signatures.json');
    } else if (newSignatures) {
        renameSync('./new-signatures.json', './signatures.json');
    }
}

function writeSignatures() {
    joinSignatures();

    if (existsSync('./signatures.json')) {
        let signatures: { [fname: string]: Signature[] } = JSON.parse(readFileSync('./signatures.json', 'utf8'));

        let result = `import { Autocomplete } from './modules/autocomplete';
import { ReportModel } from './modules/report';
import { Modal } from './modules/modal';
import { Result } from './modules/result';
import { MoreResults } from './modules/more-results';
import { GenerateForm } from './modules/form';
`;

        for (const fname in signatures) {
            const sigs = reduceSignatures(signatures[fname]);

            result += `
export interface ${fname[0].toUpperCase()}${fname.substr(1)}Signatures<${genericThisType}> {
    ${sigs.map(visitSignature).join('\n    ')}
}
`;
        }

        writeFileSync('./signatures.d.ts', result);
    }
}

writeSignatures();
