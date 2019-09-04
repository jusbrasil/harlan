export default class BANFactory {
    constructor(call: Function, { values }: {
        values: any[];
    }, company: any);
    call: any;
    checks: any;
    company: any;
    size: number;
    buffer: any;
    _fillBuffer(): void;
    _fileLength(): number;
    _getFirstCellPhone(doc: any): string;
    _getFirstEmail(doc: any): string;
    _getFirstPhone(doc: any): string;
    /**
     * Retorna o logradouro abreviado
     * @param  {string} logradouro
     * @return {string}
     */
    _getLogradouroAbrev(logradouro: string): string;
    _goToPosition(row: any, col: any): any;
    _isCellPhone(tel: any): boolean;
    _totalValue(): number;
    generate(modal: any, progressUpdate: any, callback: any): void;
    generateHeader(): void;
    generateChecks(): void;
    generateFooter(): void;
}
