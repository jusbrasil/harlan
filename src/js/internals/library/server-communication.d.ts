import Controller from '../controller';

export default function _default(controller: Controller): _default;

export default class _default {
    constructor(controller: Controller);
    webSocket: any;
    freeKey: () => boolean;
    userHash: () => import("crypto-js").WordArray;
    apiKey: (apiKey: string) => string;
    call: (query: string, configuration: any) => any;
    request: this['call'];
}
