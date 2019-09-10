import { Autocomplete } from './modules/autocomplete';
import { ReportModel } from './modules/report';

export interface CallSignatures {
    (name: 'admin::commercialReference'): void;
    (name: 'admin::index'): void;
    (name: 'admin::report', p0: Function, p1: JQuery<HTMLElement>): void;
    (name: 'admin::tagsViewer'): void;
    (name: 'authentication::loggedin'): void;
    (name: 'autocomplete', p0: JQuery<HTMLElement>): Autocomplete;
    (name: 'default::page'): void;
    (name: 'error::ajax', p0: { cache: boolean, data: { username: undefined, period: string, dateStart: string, dateEnd: undefined, contractType: null }, success: Function, error: Function }): { cache: boolean, data: { username: undefined, period: string, dateStart: string, dateEnd: undefined, contractType: null }, success: Function, error: Function };
    (name: 'error::ajax', p0: { error: Function, success: Function }): { error: Function, success: Function };
    (name: 'error::ajax', p0: { success: Function, error: Function }): { success: Function, error: Function };
    (name: 'i18n', p0: HTMLDocument): void;
    (name: 'iframeEmbed'): boolean;
    (name: 'inbox::check'): void;
    (name: 'loader::ajax', p0: { cache: boolean, data: { username: undefined, period: string, dateStart: string, dateEnd: undefined, contractType: null }, success: Function, error: Function, beforeSend: Function, complete: Function }): { cache: boolean, data: { username: undefined, period: string, dateStart: string, dateEnd: undefined, contractType: null }, success: Function, error: Function, beforeSend: Function, complete: Function };
    (name: 'loader::catchElement'): JQuery<HTMLElement>;
    (name: 'loader::register'): void;
    (name: 'loader::unregister'): void;
    (name: 'report', p0: string, p1: string, p2: null, p3: boolean): ReportModel;
    (name: 'report', p0: string, p1: string, p2: string): ReportModel;
    (name: 'site::buttons'): void;
    (name: 'site::carrousel'): void;
}