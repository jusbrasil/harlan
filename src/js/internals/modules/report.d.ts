import Controller from '../controller';
import Form from '../modules/lib/form';

declare namespace _exports {
    interface ReportModel {
        newContent(): this;
        title(title: string): this;
        subtitle(subtitle: string): this;
        label(content: string): JQuery<HTMLElement>;
        canvas(width: number, height: number): HTMLElement;
        markers(): (icon: string, text: string, action: Function) => JQuery<HTMLElement>;
        gamification(type: string): JQuery<HTMLElement>;
        paragraph(text: string): JQuery<HTMLElement>;
        timeline(): unknown;
        form(controller: Controller): Form;
        button(name: string, action: () => void): JQuery<HTMLElement>;
        content(): JQuery<HTMLElement>;
        element(): JQuery<HTMLElement>;
        newAction(icon: string, action: () => void, title?: string | null): this;
        results(): JQuery<HTMLElement>;
        result(): unknown;
        action: ReportModel['newAction'];
        close(): void;
    }
}

declare function _exports(controller: import('../controller')): void;

export = _exports;
