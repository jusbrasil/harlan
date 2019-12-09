harlan.addPlugin(controller => {

    if (controller.confs.kronoos.isKronoos) {
        controller.registerCall('admin::roleTypes', () => ({
            '': 'Tipo de Contrato',
            kronoosCustomer: 'Kronoos'
        }));

        controller.confs.iugu.token = 'ACB933ED6C0B4990958189EB32E59C87';
        controller.confs.smartsupp = 'b93ee5f4a3a18f17b7189239ed61a235cff9aa7b';
    }

    require('./lib/kronoos/create-account')(controller);
    require('./lib/kronoos/design')(controller);
    require('./lib/kronoos/authentication')(controller);
    require('./lib/kronoos/queue')(controller);
    require('./lib/kronoos/status')(controller);
    require('./lib/kronoos/element')(controller);
    require('./lib/kronoos/print')(controller);
    require('./lib/kronoos/search')(controller);
    require('./lib/kronoos/search-by-name')(controller);
    require('./lib/kronoos/async-dossier')(controller);
    require('./lib/kronoos/contract-accept')(controller);

    if (controller.confs.kronoos.isKronoos) {
        require('./lib/kronoos/enjoyhint')(controller);
    }

});
