import {CPF} from 'cpf_cnpj';
import {CNPJ} from 'cpf_cnpj';
import async from 'async';

module.exports = controller => {

    controller.registerCall('ccbusca::enable', () => {
        controller.registerTrigger('mainSearch::submit', 'ccbusca', (val, cb) => {
            cb();
            if (!CNPJ.isValid(val) && !CPF.isValid(val)) {
                return;
            }
            controller.call('credits::has', 1500, () => {
                controller.call('ccbusca', val);
            });
        });
    });

    controller.registerCall('ccbusca', (val, callback) => {
        let ccbuscaQuery = {
            documento: val,
            cache: 'DISABLED'
        };

        if (CNPJ.isValid(val)) {
            ccbuscaQuery['q[0]'] = 'USING \'CCBUSCA\' SELECT FROM \'FINDER\'.\'BILLING\'';
            ccbuscaQuery['q[1]'] = 'SELECT FROM \'RFB\'.\'CERTIDAO\' WHERE \'CACHE\' = \'+1 year\'';
        }

        controller.serverCommunication.call('USING \'CCBUSCA\' SELECT FROM \'FINDER\'.\'BILLING\'',
            controller.call('error::ajax', controller.call('loader::ajax', {
                data: ccbuscaQuery,
                success(ret) {
                    controller.call('ccbusca::parse', ret, val, callback);
                }
            })));
    });

    controller.registerCall('ccbusca::parse', (ret, val, callback) => {

        const sectionDocumentGroup = controller.call('section', 'Busca Consolidada',
            'Informações agregadas do CPF ou CNPJ',
            'Registro encontrado');

        let subtitle = $('.results-display', sectionDocumentGroup[0]);
        let messages = [subtitle.text()];
        let appendMessage = message => {
            messages.push(message);
            subtitle.text(messages.join(', '));
        };

        if (!callback) {
            $('.app-content').prepend(sectionDocumentGroup[0]);
        } else {
            callback(sectionDocumentGroup[0]);
        }

        controller.call('tooltip', sectionDocumentGroup[2], 'Imprimir').append($('<i />').addClass('fa fa-print')).click(e => {
            e.preventDefault();
            const html = sectionDocumentGroup[0].html();
            const printWindow = window.open('about:blank', '', '_blank');
            if (!printWindow) return;
            printWindow.document.write($('<html />')
                .append($('<head />'))
                .append($('<body />').html(html)).html());
            printWindow.focus();
            printWindow.print();
        });

        const juntaEmpresaHTML = controller.call('xmlDocument', ret, 'CCBUSCA', 'DOCUMENT');
        juntaEmpresaHTML.find('.container').first().addClass('xml2html')
            .data('document', $(ret))
            .data('form', [{
                name: 'documento',
                value: val
            }]);
        sectionDocumentGroup[1].append(juntaEmpresaHTML);

        ((() => {
            if ($('ccf-failed', ret).length) {
                appendMessage('consulta de cheque sem fundo falhou');
                return;
            }

            let totalRegistro = parseInt($(ret).find('BPQL > body > data > resposta > totalRegistro').text());
            if (!totalRegistro) {
                appendMessage('sem cheques devolvidos');
                return;
            }
            let qteOcorrencias = $(ret).find('BPQL > body > data > sumQteOcorrencias').text();
            let v1 = moment($('dataUltOcorrencia', ret).text(), 'DD/MM/YYYY');
            let v2 = moment($('ultimo', ret).text(), 'DD/MM/YYYY');
            appendMessage(`total de registros CCF: ${qteOcorrencias} com data da última ocorrência: ${(v1.isAfter(v2) ? v1 : v2).format('DD/MM/YYYY')}`);
            sectionDocumentGroup[1].append(controller.call('xmlDocument', ret, 'SEEKLOC', 'CCF'));
        }))();

        ((() => {
            if ($('ieptb-failed', ret).length) {
                appendMessage('consulta de protesto falhou');
                return;
            }
            if ($(ret).find('BPQL > body > consulta > situacao').text() != 'CONSTA') {
                appendMessage('sem protestos');
                return;
            }
            let totalProtestos = $('protestos', ret)
                .get()
                .map(p => parseInt($(p).text()))
                .reduce((a, b) => a + b, 0);
            appendMessage(`total de protestos: ${totalProtestos}`);
            sectionDocumentGroup[1].append(controller.call('xmlDocument', ret, 'IEPTB', 'WS'));
        }))();
    });
};
