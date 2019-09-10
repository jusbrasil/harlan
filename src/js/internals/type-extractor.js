/**
 * @typedef {import('./signature').Property} Property
 * @typedef {import('./signature').Signature} Signature
 * @typedef {import('./signature').Type} Type
 */

/** @type {{ [fname: string]: Signature[] }} */
globalThis.signatures = {};

/** @type { () => string } */
globalThis.signaturesAsJson = function() {
    /** @type {typeof globalThis.signatures} */
    const result = {};

    for (const fname in this.globalThis.signatures) {
        // @ts-ignore
        this.globalThis.signatures[fname].sort((a, b) => a.json.localeCompare(b.json));

        result[fname] = this.globalThis.signatures[fname].map(s => {
            const signature = {...s};
            delete signature.json;

            return signature;
        });
    }

    return this.JSON.stringify(result, undefined, '    ');
}

/**
 * @param {any} obj
 * @returns {Property[]}
 */
function getProperties(obj) {
    /** @type {Property[]} */
    const properties = [];

    for (const name in obj) {
        properties.push({
            name,
            type: getType(obj[name])
        });
    }

    return properties;
}

/**
 * @param {any} obj
 * @returns {Type}
 */
function getType(obj) {
    const type = typeof obj;

    switch (type) {
        case 'function':
            return 'Function';
        case 'object':
            if (obj === null) {
                return 'null'
            } else if (obj.constructor !== Object) {
                return obj.constructor.name;
            } else {
                return getProperties(obj);
            }
        default:
            return type
    }
}

/**
 * @param {string} fname
 * @param {string} name
 * @param {any[]} parameters
 * @param {any} returnType
 */
export function addSignature(fname, name, parameters, returnType) {
    /** @type {Signature} */
    const signature = { name, parameters: [], return: getType(returnType) };

    for (let parameter of parameters) {
        signature.parameters.push(getType(parameter));
    }

    signature.json = JSON.stringify(signature);

    if (!globalThis.signatures[fname]) {
        globalThis.signatures[fname] = [];
    }

    if (!globalThis.signatures[fname].find(s => s.json === signature.json)) {
        globalThis.signatures[fname].push(signature);
    }
}
