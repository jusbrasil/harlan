/**
 * @this {import('./store').default}
 * @param {typeof import('../controller')} controller
 */
export default function (controller) {
    /** @type {{ [key: string]: any }} */
    const elements = {};

    /**
     * Store a value
     * @param {string} key
     * @param {any} value
     * @returns idx
     */
    this.set = function (key, value) {
        elements[key] = value;
        return this;
    };

    /**
     * 
     * @param {string} key
     * @returns mixed
     */
    this.get = key => elements[key];

    /**
     * Recover a value
     * @param {string} idx
     * @returns mixed
     */
    this.unset = function (idx) {
        delete elements[idx];
        return this;
    };

    return this;
};