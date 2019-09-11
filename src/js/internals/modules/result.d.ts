import { Data, DataSet, Edge, Network, Node, Options } from 'vis';

declare namespace _exports {
    export interface Result {
        addSeparator(title: string, subtitle: string, description: string, items: any): JQuery<HTMLElement>;
        block(): JQuery<HTMLElement>;
        generateRadial(name: string, percent: number, context: any): any;
        addNomEmptyItem(name: string, value: string, tagname: string): JQuery<HTMLElement>;
        addDateItem(name: string, value: string, fromFormat: string, toFormat: string, tagname: string): JQuery<HTMLElement>;
        addIcon(name: string, icon: string, action: () => void): JQuery<HTMLElement>;
        addItem(name: string, value: string, tagname: string): JQuery<HTMLElement>;
        addNetwork(nodesArray?: Node[] | DataSet<Node>, edgesArray?: Edge[] | DataSet<Edge>, options?: Options): [Network, JQuery<HTMLElement>];
        content(): JQuery<HTMLElement>;
        result(): JQuery<HTMLElement>;
    }
}

declare function _exports(controller: import('../controller')): void;

export = _exports;
