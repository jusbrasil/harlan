export class ClientLoader {
    constructor(element?: JQuery<HTMLElement>);
    container: JQuery<HTMLElement>;
    row: JQuery<HTMLElement>;
    cell: JQuery<HTMLElement>;
    modal: JQuery<HTMLElement>;
    appProgress: JQuery<HTMLElement>;
    percentage: JQuery<HTMLElement>;
    progress: JQuery<HTMLElement>;
    render(perc?: number): void;
    close(): void;
}
