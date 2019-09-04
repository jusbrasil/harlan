import { ParsedUrlQuery } from 'querystring';

type Modal = typeof import('./modules/modal');

interface Parameters {
    (
        name: 'findDatabase::table::RFB::CERTIDAO',
        b: 'receitaCertidao::form',
        c: ({ dom }: { dom: JQuery<HTMLElement> }, callback: () => void) => void
    ): void;
    (name: 'sync::start'): void;
    (name: 'sync::end', b: unknown[]): void;
    (name: 'sync::change'): void;
    (name: 'accountOverview::dataset', b: (responses: unknown) => void): void;
    (name: 'admin::createCompany'): void;
    (name: 'admin::autocompleteCreateCompany', callback: (autocomplete: JQuery<HTMLElement>) => void): void;
    (name: 'admin::fillCompanysAutocomplete', callback: (document: HTMLElement, autocomplete: JQuery<HTMLElement>) => void): void;
    (
        a: string,
        {
            document,
            table,
            parsedResult
        }: {
            document: string;
            table: string;
            parsedResult: JQuery<HTMLElement>;
        }
    ): void;
    (name: 'progress::init', initProgress: number): unknown;
    (name: 'modal'): Modal;
    (d: (err: any, result?: unknown) => void): void;
    (name: string | string[], id: string, callback: () => void): void;
    (name: string, args: unknown, oComplete: () => void): this;
    (name: string, ...parameters: unknown[]): void;
    (name: string, callback?: () => void): void;
    (name: string, callback: (data: unknown, err: unknown) => void): void;
}

declare class _export {
    confs: typeof import('./config');
    exceptions: {};

    endpoint: {
        accountOverview: string;
    };

    sync: typeof import('./library/sync');
    query: ParsedUrlQuery;
    registerBootstrap(name: string, callback: (cb: () => void) => void): this;
    unregisterTriggers(name: string, except: unknown[]): void;
    unregisterTrigger(name: string, ...list: string[]): void;
    registerTrigger: Parameters;
    trigger: Parameters;
    triggered: unknown;
    registerCall: Parameters;
    reference: (name: string) => (...parameters: unknown[]) => void;
    click: (name: string, ...parameters: unknown[]) => (e: Event) => void;
    event: _export['click'];
    preventDefault: _export['click'];
    call: Parameters;

    promise(
        name: string,
        cb: ((data: unknown) => void) | null,
        ...d: unknown[]
    ): Promise<unknown>;

    run(cb: () => void): void;
    addPlugin(callback: (controller: _export) => void): void;
    modal(): Modal;
}

declare function _export(this: _export): _export;

export = _export;
