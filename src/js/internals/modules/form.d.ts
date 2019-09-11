declare namespace _exports {
    export interface GenerateForm {
        configure(c: any): this;
        setValues(x: any): this;
        setValue(name: string, value: any): this | undefined;
        readValues(callback: (arg: any) => any): any;
        getField(name: string): any;
        display(setScreen?: number): this;
        close(defaultAction?: boolean): void;
        defaultScreenValidation(callback: (arg: boolean) => void, configuration: any, screen: any): this | undefined;
    }
}

declare function _exports(controller: import('../controller')): void;

export = _exports;
