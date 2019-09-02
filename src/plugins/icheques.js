harlan.addPlugin(controller => {

    controller.registerCall('admin::roleTypes', () => ({
        '': 'Tipo de Contrato',
        ichequeCustomer: 'iCheques'
    }));

    $(controller.confs.container).addClass('icheques-extension');

    controller.unregisterTrigger('serverCommunication::websocket::authentication', 'accountOverview');

    controller.registerCall('accountOverview', () => {});

    controller.confs.fidcDistance = 150000;
    controller.confs.debtCollector = 'juridico@pgn.srv.br';
    controller.confs.ccf = true;
    controller.confs.iugu.token = 'b3ed1c2a-ee7b-47d2-ab4d-7e8fba14e933';
    controller.confs.smartsupp = '';
    controller.endpoint.forgotPassword = 'SELECT FROM \'ICHEQUESAUTHENTICATION\'.\'FORGOTPASSWORD\'';
    controller.endpoint.adminReport = 'SELECT FROM \'ICHEQUESREPORT\'.\'REPORT\'';
    controller.endpoint.commercialReferenceOverview = 'SELECT FROM \'IChequesReport\'.\'COMMERCIALREFERENCE\' WHERE \'CACHE\' = \'DISABLED\'';

    Object.assign(controller.confs.icheques, {
        price: 1500,
        monthsIncluded: 5,
        moreMonths: 300
    });

    controller.registerCall('admin::contactTypes', () => ({
        financeiro: 'Ambos',
        comercial: 'Operações',
        tecnico: 'Ocorrências'
    }));

    require('./lib/icheques/reference')(controller);
    require('./lib/icheques/welcome')(controller);
    require('./lib/icheques/parser')(controller);
    require('./lib/icheques/new-check')(controller);
    require('./lib/icheques/ban-file')(controller);
    require('./lib/icheques/cmc-reader')(controller);
    require('./lib/icheques/checkout')(controller);
    require('./lib/icheques/create-account')(controller);
    require('./lib/icheques/harlan')(controller);
    require('./lib/icheques/report')(controller);
    require('./lib/icheques/search')(controller);
    require('./lib/icheques/full-profile')(controller);
    require('./lib/icheques/antecipate')(controller);
    require('./lib/icheques/contact')(controller);
    require('./lib/icheques/logout')(controller);
    require('./lib/icheques/subaccount')(controller);
    require('./lib/icheques/design')(controller);
    require('./lib/icheques/contract-accept')(controller);
    require('./lib/icheques/edit')(controller);
    require('./lib/icheques/ban-generate')(controller);
    require('./lib/icheques/can-antecipate')(controller);
    require('./lib/icheques/fidc')(controller);
    require('./lib/icheques/fidc-view')(controller);
    require('./lib/icheques/ban-url-download')(controller);
    require('./lib/icheques/operation-score')(controller);
    require('./lib/icheques/commercial-reference')(controller);
    require('./lib/icheques/enjoyhint')(controller);
    require('./lib/icheques/daemon')(controller);
    require('./lib/icheques/progress')(controller);
    require('./lib/icheques/ccbusca')(controller);

    /*
     *  Nada como um nado estilo livre nesse mar
     *  nado de peito que é desse jeito que eu curto nadar
     *  nadar da pedra pra praia, da praia pra pedra,
     *  do canto pro meio, do meio pro canto, do raso pro fundo
     *  do fundo do peito, de dentro da onda
     *  pra fora da linha da arrebentação da ressaca do mundo
     *  alguns segundos só na apnéia
     *  sem respiração, só pra abrir o pulmão e as idéias
     *  só pra sentir saudade do oxigênio
     *  e respirar de novo e me lembrar de que isso é um prêmio

     *  Link: http://www.vagalume.com.br/gabriel-pensador/tempestade.html#ixzz3stkENplW
     */

});
