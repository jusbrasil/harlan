export interface Property {
    name: string;
    type: Type;
}

export type Type = string | Property[];

export interface Signature {
    name: string;
    parameters: Type[];
    return: Type;
    json?: string;
}
