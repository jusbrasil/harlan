import KronoosParse from "./parser";

export default class CognitiveDossier {
    constructor(parser: KronoosParse);
    parser: KronoosParse;
    recuperaPessoaFisica(callback: (title: string, risk: number, text: string) => void): void;
    generateOutput(callback: (title: string, risk: number, text: string) => void): void;
}

export { CognitiveDossier };
