import { ParsedUrlQuery } from 'querystring';
import {
    CallSignatures, ClickSignatures, RegisterBootstrapSignatures,
    RegisterCallSignatures, RegisterTriggerSignatures, TriggerSignatures
} from './signatures';

type Modal = import('./modules/modal').Modal;

declare class _export {
    confs: typeof import('./config');
    exceptions: {};

    endpoint: {
        accountOverview: string;
    };

    sync: typeof import('./library/sync');
    query: ParsedUrlQuery;
    registerBootstrap: RegisterBootstrapSignatures<this>;
    unregisterTriggers(name: string, except: unknown[]): void;
    unregisterTrigger(name: string, ...list: string[]): void;
    registerTrigger: RegisterTriggerSignatures<this>;
    trigger: TriggerSignatures<this>;
    triggered: unknown;
    registerCall: RegisterCallSignatures<this>;
    reference: (name: string) => (...parameters: unknown[]) => void;
    click: ClickSignatures<this>;
    event: _export['click'];
    preventDefault: _export['click'];
    call: CallSignatures<this>;

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
