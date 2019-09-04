type Controller = typeof import('../controller');
export default function _default(controller: Controller): void;
export default class _default {
    constructor(controller: Controller);
    register: (database: string, table: string, callback: (documento: string) => any) => any;
    import: (document: string, database: string, table: string) => any;
}
