import 'extend-error';
import './internals/library/safari-hacks';

import Interface from './internals/library/interface';
import ServerCommunication from './internals/library/server-communication';
import ImportXMLDocument from './internals/library/import-xml-document';
import Store from './internals/library/store';
import I18n from './internals/library/i18n';
import browserUpdate from 'browser-update';

(function(d) {
    const Harlan = require('./internals/controller');

    let harlan = new Harlan();
    d.harlan = harlan;

    harlan.database = new SQL.Database();
    harlan.interface = new Interface(harlan);
    harlan.i18n = new I18n(localStorage.language ||
        navigator.language ||
        navigator.userLanguage || 'pt', this);
    harlan.server = harlan.serverCommunication = new ServerCommunication(harlan);
    harlan.xml = harlan.importXMLDocument = new ImportXMLDocument(harlan);

    /* Service Worker */
    require('./internals/modules/service-worker')(harlan);

    /* Parsers */
    // require('./internals/parsers/placas-wiki')(harlan);
    require('./internals/parsers/cbusca')(harlan);
    require('./internals/parsers/ccbusca')(harlan);
    require('./internals/parsers/ccf')(harlan);
    require('./internals/parsers/ieptb')(harlan);
    require('./internals/parsers/rfbcnpj')(harlan);
    // require('./internals/parsers/socialprofile')(harlan);

    /* Forms */
    require('./internals/forms/receita-certidao')(harlan);

    /* Modules */
    require('./internals/modules/logs/watch-onerror')(harlan);
    require('./internals/modules/analytics/google-analytics')(harlan);
    require('./internals/modules/security/antiphishing')(harlan);
    require('./internals/modules/i18n')(harlan);
    require('./internals/modules/bank-account')(harlan);
    require('./internals/modules/autocomplete')(harlan);
    require('./internals/modules/find-database')(harlan);
    require('./internals/modules/loader')(harlan);
    require('./internals/modules/error')(harlan);
    require('./internals/modules/geolocation')(harlan);
    require('./internals/modules/endpoint')(harlan);
    require('./internals/modules/database-search')(harlan);
    require('./internals/modules/modal')(harlan);
    require('./internals/modules/welcome-screen')(harlan);
    require('./internals/modules/authentication')(harlan);
    require('./internals/modules/report')(harlan);
    require('./internals/modules/module')(harlan);
    require('./internals/modules/selected-results')(harlan);
    // require('./internals/modules/find-document')(harlan);
    require('./internals/modules/xml-document')(harlan);
    require('./internals/modules/section')(harlan);
    require('./internals/modules/iugu')(harlan);
    require('./internals/modules/database-error')(harlan);
    require('./internals/modules/messages')(harlan);
    require('./internals/modules/main-search')(harlan);
    require('./internals/modules/oauth-io')(harlan);
    require('./internals/modules/url-parameter')(harlan);
    require('./internals/modules/result')(harlan);
    require('./internals/modules/demonstrate')(harlan);
    require('./internals/modules/download')(harlan);
    require('./internals/modules/form')(harlan);
    require('./internals/modules/forgot-password')(harlan);
    require('./internals/modules/iframe-embed')(harlan);
    require('./internals/modules/site')(harlan);
    // require('./internals/modules/placas-wiki')(harlan);
    require('./internals/modules/credits')(harlan);
    require('./internals/modules/alert')(harlan);
    require('./internals/modules/softphone')(harlan);
    require('./internals/modules/password')(harlan);
    require('./internals/modules/progress')(harlan);
    require('./internals/modules/subaccount')(harlan);
    require('./internals/modules/more-results')(harlan);
    require('./internals/modules/instant-search')(harlan);
    require('./internals/modules/tooltip')(harlan);
    require('./internals/modules/icheques')(harlan);
    // require('./internals/modules/socialprofile')(harlan);
    require('./internals/modules/kronoos')(harlan);
    require('./internals/modules/billing-information')(harlan);
    require('./internals/modules/bipbop')(harlan);
    require('./internals/modules/admin/index')(harlan);
    require('./internals/modules/account-overview')(harlan);
    require('./internals/modules/email-activation')(harlan);
    require('./internals/modules/timeline')(harlan);
    require('./internals/modules/data-company')(harlan);
    require('./internals/modules/ccbusca')(harlan);
    require('./internals/modules/generate-relations')(harlan);
    require('./internals/modules/admin/contact-types')(harlan);
    require('./internals/modules/smartsupp')(harlan);
    require('./internals/modules/cordova')(harlan);
    require('./internals/modules/blockui')(harlan);
    require('./internals/modules/push-notification')(harlan);
    require('./internals/modules/browser-update')(harlan);
    require('./internals/modules/post-message')(harlan);
    require('./internals/modules/link')(harlan);
    require('./internals/modules/remote-debug')(harlan);
    require('./internals/modules/take-picture')(harlan);
    require('./internals/modules/facebook-track')(harlan);
    require('./internals/modules/dropzone')(harlan);

    /**
     * From day to night and night to day
     * An endless sea of choice
     * If you should ever lose your way
     * Just listen to your voice
     */

    harlan.run();
})(window);
