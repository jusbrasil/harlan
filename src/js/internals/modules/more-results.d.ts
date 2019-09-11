declare namespace _exports {
    export interface MoreResults {
        close(): void;
        show(complete?: (i: number, itens: any[]) => void, i?: number): this;
        callback(callback: () => void): this;
        append(element: any): this;
        appendTo(element: any): this;
        element(): JQuery<HTMLElement>;
    }
}

declare function _exports(controller: import('../controller')): void;

export = _exports;
