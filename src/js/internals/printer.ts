import { readFileSync, writeFileSync, existsSync, renameSync, truncateSync } from 'fs';
import { Property, Signature, Type } from './signature';

interface SignatureFile {
    [fname: string]: Signature[];
}

function visitProperty(property: Property) {
    return `${property.name}: ${visitType(property.type)}`;
}

function visitType(type: Type) {
    if (typeof type === 'string') {
        if (type === 'jQuery') {
            return 'JQuery<HTMLElement>';
        } else if (type === 'Array') {
            return 'Array<any>';
        } else {
            return type;
        }
    } else {
        let properties = type.map(visitProperty);

        return `{ ${properties.join(', ')} }`;
    }
}

function visitReturnType(type: Type) {
    if (type === 'undefined') {
        return 'void';
    } else {
        return visitType(type);
    }
}

function visitSignature(signature: Signature) {
    let parameters = signature.parameters.map((s, i) => `p${i}: ${visitType(s)}`);
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
    let newSignatures: SignatureFile;
    let signatures: SignatureFile;

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

                signatures[fname].sort((a, b) => a.json.localeCompare(b.json));
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
            result += `export interface ${fname[0].toUpperCase()}${fname.substr(1)}Signatures {
    ${signatures[fname].map(visitSignature).join('\n    ')}
}
`;
        }

        writeFileSync('./signatures.d.ts', result);
    }
}

writeSignatures();
