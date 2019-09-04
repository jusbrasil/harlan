interface Obj {
    hoverHelp?: string;
    options?: { [i: string]: JQuery<HTMLElement> };
    append?: JQuery<HTMLElement>;
    id?: string;
    label?: JQuery<HTMLElement>;
    class?: string;
}

declare class _export {
    constructor(
        instance: _export,
        { confs, i18n }: { confs: typeof import("../../config"); i18n: unknown }
    );
    element(): JQuery<HTMLElement>;
    multiField(): JQuery<HTMLElement>;
    addSelect(
        id: string,
        name: string,
        list: string[],
        obj?: Obj,
        labelText?: string,
        value?: string
    ): JQuery<HTMLElement>;
    createList(): typeof import("./create-list");
    addTextArea(
        name: string,
        placeholder: string,
        obj?: Obj,
        labelText?: string,
        value?: string
    ): JQuery<HTMLElement>;
    addInput(
        name: string,
        placeholder: string,
        obj?: Obj,
        labelText?: string,
        value?: string
    ): JQuery<HTMLElement>;
    cancelButton(text: string, onCancel: () => void): void;
    addCheckbox(
        name: string,
        label: string,
        checked: boolean,
        value: string,
        item: Obj
    ): [JQuery<HTMLElement>, JQuery<HTMLElement>, JQuery<HTMLElement>];
    addSubmit(name: string, value: string): JQuery<HTMLElement>;
}

declare function _export(
    this: _export,
    instance: _export,
    { confs, i18n }: { confs: typeof import("../../config"); i18n: unknown }
): _export;

export = _export;
