import { Type, ObjectType, Signature } from './signature';

function mixTypes(typeA?: Type, typeB?: Type): Type {
    if (!typeA) {
        return typeB || 'undefined';
    } else if (!typeB) {
        return typeA;
    } else if (typeof typeA === 'string') {
        if (typeof typeB === 'string') {
            if (typeA === typeB) {
                return typeA;
            } else {
                return { types: [typeA, typeB] };
            }
        } else if (Array.isArray(typeB)) {
            return { types: [typeA, typeB] };
        } else {
            if (typeB.types.indexOf(typeA) === -1) {
                if (typeB.types.indexOf(typeA) !== -1) {
                    return typeB;
                } else {
                    return { types: [typeA, ...typeB.types] };
                }
            } else {
                return typeB;
            }

        }
    } else if (Array.isArray(typeA)) {
        if (typeof typeB === 'string') {
            return { types: [typeA, typeB] };
        } else if (Array.isArray(typeB)) {
            return mixObjects(typeA, typeB);
        } else {
            return { types: [typeA, ...typeB.types] };
        }
    } else {
        if (typeof typeB === 'string') {
            if (typeA.types.indexOf(typeB) !== -1) {
                return typeA;
            } else {
                return { types: [...typeA.types, typeB] };
            }
        } else if (Array.isArray(typeB)) {
            return { types: [...typeA.types, typeB] };
        } else {
            return { types: [...typeA.types, ...typeB.types] };
        }
    }
}

function mixObjects(objectA: ObjectType, objectB: ObjectType) {
    const properties: { [name: string]: number } = {};

    for (const property of objectA) {
        properties[property.name] = properties[property.name] ? properties[property.name] : 1;
    }

    for (const property of objectB) {
        properties[property.name] = properties[property.name] ? properties[property.name] : 1;
    }

    const result = [...objectA];

    for (const property in properties) {
        const prop = result.find(p => p.name === property);

        if (!prop) {
            result.push({ ...objectB.find(p => p.name === property)!, optional: true });
        } else if (!objectB.find(p => p.name === property)) {
            prop.optional = true;
        } else {
            prop.type = mixTypes(prop.type, objectB.find(p => p.name === property)!.type);
            
            if (prop.optional) {
                const type = prop.type;

                if (typeof type === 'object' && !Array.isArray(type)) {
                    const index = type.types.indexOf('undefined');

                    if (index !== -1) {
                        type.types.splice(index, 1);
                    }
                }
            }
        }
    }

    return result;
}

function mixSignatures(signatureA: Signature, signatureB: Signature) {
    const signature: Signature = { name: signatureA.name, parameters: [], return: mixTypes(signatureA.return, signatureB.return) };
    let index = 0;

    while (index < signatureA.parameters.length || index < signatureB.parameters.length) {
        const parameterA = signatureA.parameters[index];
        const parameterB = signatureB.parameters[index];

        signature.parameters.push(mixTypes(parameterA, parameterB))

        if ((!parameterA || !parameterB) && signature.firstOptionalParameterIndex === undefined) {
            signature.firstOptionalParameterIndex = index;
        }

        index++;
    }

    return signature;
}

export function reduceSignatures(signatures: Signature[]) {
    let result: Signature[] = [];

    for (const signature of signatures) {
        if (signatures.length === 0) {
            result.push(signature);

            continue;
        }

        let index = result.findIndex(s => s.name === signature.name);

        if (index !== -1) {
            result[index] = mixSignatures(result[index], signature);
        } else {
            result.push(signature);
        }
    }

    return result;
}
