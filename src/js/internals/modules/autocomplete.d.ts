declare namespace _exports {
    interface Autocomplete {
        setIcon(i: string): this;
        input(): JQuery<HTMLElement>;
        empty(): void;
        item(title: string, subtitle: string, description: string, html: string, prepend: string): JQuery<HTMLElement>;
    }
}

declare function _exports(controller: import('../controller')): void;

export = _exports;
