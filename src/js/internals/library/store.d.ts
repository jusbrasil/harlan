import Controller from '../controller';

export default function _default(controller: Controller): any;

export default class _default {
    constructor(controller: Controller);
    /**
     * Store a value
     * @param key
     * @param value
     * @returns idx
     */
    set: (key: string, value: any) => this;
    /**
     *
     * @param {string} key
     * @returns mixed
     */
    get: (key: string) => any;
    /**
     * Recover a value
     * @param {int} idx
     * @returns mixed
     */
    unset: (idx: string) => this;
}
