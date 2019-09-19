export interface Property {
    name: string;
    type: Type;
    optional?: boolean;
}

export type ObjectType = Property[];

export type SimpleType = string | ObjectType;

export type UnionType = {
    types: SimpleType[];
}

export type Type = SimpleType | UnionType;

export interface Signature {
    name: string;
    parameters: Type[];
    return: Type;
    json?: string;
    firstOptionalParameterIndex?: number;
}
