module.exports = controller => {

    controller.registerCall('icheques::welcome', ret => {

        var report = controller.call('report',
            'Seja bem vindo ao Credithub',
            'Cheque sem susto.',
            'A Credithub é uma ferramenta desenvolvida para você evitar inadimplência em sua carteira de cheques e tambem possibilita a antecipação com seus parceiros financeiros.',
            false);

        if (!controller.confs.isCordova) {
            report.button('Adicionar Cheque', () => {
                controller.call('icheques::newcheck');
            }).addClass('green-button');

            report.button('Dados Cadastrais', () => {
                controller.call('icheques::form::company');
            }).addClass('gray-button');
        } else {
            report.button('Sair da Conta', () => {
                controller.call('authentication::logout');
            }).addClass('gray-button');

        }

        report.gamification('shield');

        $('.app-content').prepend(report.element());
    });

    controller.registerTrigger('call::authentication::loggedin', 'icheques::welcome', (args, callback) => {
        callback();
        controller.serverCommunication.call('SELECT FROM \'ICHEQUESAUTHENTICATION\'.\'ANNOTATIONS\'', {
            success(ret) {
                controller.call('icheques::welcome', ret);
            }
        });
    });

};
