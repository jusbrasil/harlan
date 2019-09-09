declare function _exports(
    locale: string,
    controller: import("../controller")
): typeof import("../i18n/pt") & {
    pikaday: {
        format: string;
        i18n: {
            previousMonth: string;
            nextMonth: string;
            months: string[];
            weekdays: string[];
            weekdaysShort: string[];
        };
    };
};
export = _exports;
