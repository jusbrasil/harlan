export default class KronoosStats {
    elements: {};
    global: JQuery<HTMLElement>;
    container: JQuery<HTMLElement>;
    content: JQuery<HTMLElement>;
    list: JQuery<HTMLElement>;
    create(name: string, document: string, click: () => void): [(description: string, action: () => void) => JQuery<HTMLElement>, JQuery<HTMLElement>];
    readonly element: JQuery<HTMLElement>;
}

export { KronoosStats };
