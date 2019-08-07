import squel from 'squel';

const checkQuery = squel
    .select()
    .from('ICHEQUES_CHECKS')
    .field('SUM(AMMOUNT), COUNT(1)')
    .where('(QUERY_STATUS = 1) AND (EXPIRE > ?) AND (OPERATION = 0)', moment().format('YYYYMMDD'))
    .toString();

const obtainChecks = squel
    .select()
    .from('ICHEQUES_CHECKS')
    .where('(EXPIRE > ?) AND (OPERATION = 0)', moment().format('YYYYMMDD'))
    .toString();

module.exports = controller => {

    const update = null;

    controller.registerTrigger('call::authentication::loggedin', 'canAntecipate', (args, callback) => {
        callback();
        controller.call('icheques::canAntecipate');
    });

    let element = null;

    controller.registerCall('icheques::cantAntecipate', () => {
        const report = controller.call('report',
            'Cotar Taxas e Limites para Antecipação',
            'Receba o dinheiro antes, não espere até o vencimento. CNPJ obrigatório.',
            'Na iCheques você preenche seu cadastro PJ e envia ele, gratuitamente e com 1-click, para dezenas de Financeiras.  Encontre as melhores taxas e limites na iCheques sem dor de cabeça!');

        report.button('Cotar taxas e limites', () => {
            controller.call('icheques::register::all');
        }).addClass('green-button');

        report.gamification('checkPoint');

        if (element) {
            element.replaceWith(report.element());
        }
        element = report.element();
        $('.app-content').prepend(element);
    });

    controller.registerCall('icheques::canAntecipate', () => {
        const [ammount, count] = controller.database.exec(checkQuery)[0].values[0];
        if (!count) {
            controller.call('icheques::cantAntecipate');
            return;
        }

        const report = controller.call('report',
            'Parabéns! Você possui cheques bons para antecipação.',
            'Receba o dinheiro antes do vencimento. Desconte seu recebíveis com nossos Parceiros Finaneiros!', !ammount ?
                `Você tem <strong>${count}</strong> ${count == 1 ? 'cheque' : 'cheques'} para antecipar com nossos Parceiros Financeiros. Clique abaixo para Antecipar!` :
                `Você tem <strong>${count}</strong> ${count == 1 ? 'cheque de valor' : 'cheques que somam'} <strong>${numeral(ammount/100).format('$0,0.00')}<\/strong> para antecipar com nossos Parceiros Financeiros. Clique abaixo para Antecipar!`);

        report.button('Antecipar Cheques', () => {
            const checks = controller.call('icheques::resultDatabase', controller.database.exec(obtainChecks)[0]).values;
            controller.call('icheques::antecipate', checks);
        }).addClass('green-button');

        report.gamification('checkPoint');

        if (element) {
            element.replaceWith(report.element());
        }
        element = report.element();
        $('.app-content').prepend(element);
    });

    controller.registerTrigger('icheques::deleted',
        'canAntecipate', (obj, cb) => {
            cb();
            controller.call('icheques::canAntecipate');
        });

    controller.registerTrigger('serverCommunication::websocket::ichequeUpdate',
        'canAntecipate', (obj, cb) => {
            cb();
            controller.call('icheques::canAntecipate');
        });

};
