import { readFileSync, writeFileSync } from 'fs';
import { Property, Signature, Type } from './signature';

function visitProperty(property: Property) {
    return `${property.name}: ${visitType(property.type)}`;
}

function visitType(type: Type) {
    if (typeof type === 'string') {
        if (type === 'jQuery') {
            return 'JQuery<HTMLElement>';
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

function writeSignatures() {
    let signatures: { [fname: string]: Signature[] } = JSON.parse(readFileSync('./signatures.json', 'utf8'));

    let result = `import { Autocomplete } from './modules/autocomplete';
import { ReportModel } from './modules/report';

`

    for (const fname in signatures) {
        result += `export interface ${fname[0].toUpperCase()}${fname.substr(1)}Signatures {
    ${signatures[fname].map(visitSignature).join('\n    ')}
}`;
    }

    writeFileSync('./signatures.d.ts', result);
}

writeSignatures();
