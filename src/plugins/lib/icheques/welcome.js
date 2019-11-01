module.exports = controller => {

    controller.registerCall('icheques::welcome', ret => {

        var report = controller.call('report',
            'Seja bem vindo ao CreditHub',
            'Somos seu mais novo Hub de crédito que reune diversas consultas avançadas e ajudamos a antecipar seus cheques ou duplicatas com +300 Financeiras por todo Brasil.',
            false);

        if (!controller.confs.isCordova) {
            report.button('Adicionar Cheque', () => {
                controller.call('icheques::newcheck');
            }).addClass('credithub-button');

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
