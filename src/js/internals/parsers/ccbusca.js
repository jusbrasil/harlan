import _ from 'underscore';
import {CPF, CNPJ} from 'cpf_cnpj';
import pad from 'pad';

module.exports = controller => {

    function addressIsEmpty(nodes) {
        for (let idx in nodes) {
            if (! /^\**$/.test(nodes[idx])) {
                return false;
            }
        }
        return true;
    }

    function addressIsComplete(nodes) {
        for (let idx in nodes) {
            if (/^\**$/.test(nodes[idx])) {
                return false;
            }
        }
        return true;
    }

    const setAddress = (result, jdocument) => {
        const init = 'BPQL > body enderecos > endereco';

        const addressElements = [];
        const cepElements = [];

        jdocument.find(init).each((i, node) => {
            const nodes = {
                Tipo : 'tipo',
                Endereço: 'logradouro',
                Número: 'numero',
                Complemento: 'complemento',
                CEP: 'cep',
                Bairro: 'bairro',
                Cidade: ['cidade', 'municipio'],
                Estado: ['estado', 'uf']
            };

            const jnode = $(node);
            const address = [];

            for (var idx in nodes) {
                let data = '';
                if (Array.isArray(nodes[idx])) {
                    for (let item in nodes[idx]) {
                        let itemNode = jnode.find(nodes[idx][item]);
                        if (itemNode.length) {
                            data = itemNode.text();
                            break;
                        }
                    }
                } else {
                    data = jnode.find(nodes[idx]).text();
                }
                nodes[idx] = (/^\**$/.test(data)) ? '' : data;
            }

            if (!nodes['Endereço'] || !nodes.CEP) {
                return;
            }

            if (_.contains(addressElements, nodes['Endereço']) ||
                    _.contains(cepElements, nodes.CEP) ||
                    Math.max(..._.map(addressElements, value => require('jaro-winkler')(value, nodes['Endereço']))) > 0.85) {
                return;
            }

            addressElements.push(nodes['Endereço']);
            cepElements.push(nodes.CEP);

            if (!addressIsEmpty(nodes)) {
                result.addSeparator('Endereço', 'Localização', 'Endereçamento e mapa');
                for (idx in nodes) {
                    if (! /^\**$/.test(nodes[idx])) {
                        result.addItem(idx, nodes[idx]);
                    }
                }

                jnode.find('*').each((idx, node) => {
                    const jnode = $(node);
                    if (!/complemento/i.test(jnode.prop('tagName'))) {
                        address.push(jnode.text());
                    }
                });

                const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${$.param({
                    scale: '1',
                    size: '600x150',
                    maptype: 'roadmap',
                    format: 'png',
                    visual_refresh: 'true',
                    markers: `size:mid|color:red|label:1|${address.join(', ')}`
                })}`;

                result.addItem().addClass('map').append(
                    $('<a />').attr({
                        href: `https://www.google.com/maps?${$.param({
                            q: address.join(', ')
                        })}`,
                        target: '_blank'
                    }).append($('<img />').attr('src', mapUrl)));
            }

            // Adiciona o item caso o endereço esteja completo
            // for (idx in nodes) {
            //     if (/^\**$/.test(nodes[idx])) {
            //         return;
            //     }
            //     result.addItem(idx, nodes[idx]);
            // }
        });
    };

    const setEmpregador = (result, jdocument) => {
        jdocument.find('rendaEmpregador rendaEmpregador').each((i, x) => {
            let v = k => $(k, x).first().text();
            result.addSeparator(`Empregador ${v('empregador')}`, `${v('setorEmpregador')} - Documento ${CNPJ.format(v('documentoEmpregador'))}`, 'Empregador registrado');
            result.addItem('Descrição', v('cboDescricao'));
            result.addItem('Faixa Salarial', v('faixaRenda'));
            result.addItem('Data', `${moment(v('rendaDataRef'), 'YYYY-MM-DD').format('DD/MM/YYYY')}, ${moment(v('rendaDataRef'), 'YYYY-MM-DD').fromNow()}`);
        });
    };

    const setContact = (result, jdocument) => {
        let phones = [];
        let emails = [];

        jdocument.find('BPQL > body telefone').each((idx, node) => {
            const jnode = $(node);
            phones.push(`(${jnode.find('ddd').text()}) ${jnode.find('numero').text()}`);
        });

        jdocument.find('BPQL > body email').each((idx, node) => {
            let email = $(node).text().trim();
            if (!email) return;
            if (_.contains(emails, email)) return;
            emails.push(email);
        });

        if (!phones.length && !emails.length) {
            return;
        }

        phones = _.uniq(phones);
        emails = _.uniq(emails);

        result.addSeparator('Contato', 'Meios de contato', 'Telefone, e-mail e outros');
        for (const idxPhones in phones) {
            let phone = phones[idxPhones];
            if (!/[0-9]/.test(phone)) return;
            result.addItem('Telefone', phones[idxPhones]);
        }

        for (const idxEmails in emails) {
            result.addItem('Email', emails[idxEmails]);
        }

    };

    let companys = [];

    const setSocio = (result, jdocument) => {
        let $empresas = jdocument.find('BPQL > body socios > socio');

        if ($empresas.length === 0) return;

        for (let node of $empresas) {
            let $node = $(node);
            let nodes = {};
            if (companys.includes($node.text())) continue;
            nodes[$node.attr('qualificacao')] = $node.text();
            result.addSeparator('Quadro Societário', 'Empresa', 'Empresa a qual faz parte.');
            for (const idx in nodes) {
                result.addItem(idx, nodes[idx]);
            }

        }
    };

    const setQSA = (result, jdocument) => {
        let $empresas = jdocument.find('BPQL > body qsa > socio');

        if ($empresas.length === 0) return;

        for (let node of $empresas) {
            let $node = $(node);

            let nodes = {
                Sócio: 'nome',
                CPF: 'doc',
                // "Participação": "quali"
            };

            let dict = {
                documento: pad(11, $(node).find('doc').text().replace(/^0+/g, ''), '0'),
                ihash: $(node).find('doc').attr('ihash')
            };

            let items = {};
            let separator = result.addSeparator('Quadro Societário', `Empresa ${CNPJ.format(jdocument.find('cadastro > cpf'))}`, '', items);

            controller.server.call('SELECT FROM \'SEEKLOC\'.\'CCF\'', {data:dict, success: ret => {
                let totalRegistro =  parseInt($(ret).find('BPQL > body > data > resposta > totalRegistro').text());
                let message = 'Não há cheques sem fundo.';
                if (totalRegistro) {
                    let qteOcorrencias = $(ret).find('BPQL > body > data > sumQteOcorrencias').text();
                    let v1 = moment($('dataUltOcorrencia', ret).text(), 'DD/MM/YYYY');
                    let v2 = moment($('ultimo', ret).text(), 'DD/MM/YYYY');
                    message = ` Total de registros CCF: ${qteOcorrencias} com data da última ocorrência: ${(v1.isAfter(v2) ? v1 : v2).format('DD/MM/YYYY')}.`;
                }
                items.resultsDisplay.text(`${items.resultsDisplay.text()} ${message}`);
            }});

            controller.server.call('SELECT FROM \'IEPTB\'.\'WS\'', {data:dict, success: ret => {
                if ($(ret).find('BPQL > body > consulta > situacao').text() != 'CONSTA') {
                    items.resultsDisplay.text(`${items.resultsDisplay.text()} Não há protestos.`);
                    return;
                }
                let totalProtestos = $('protestos', ret)
                    .get()
                    .map(p => parseInt($(p).text()))
                    .reduce((a, b) => a + b, 0);
                items.resultsDisplay.text(`${items.resultsDisplay.text()} Total de Protestos: ${isNaN(totalProtestos) ? '1 ou mais' : totalProtestos}.`);
            }});

            for (const idx in nodes) {
                const data = $node.find(nodes[idx]).text();
                nodes[idx] = (/^\**$/.test(data)) ? '' : data;
                if (idx === 'CPF') nodes[idx] = CPF.format(pad(11, nodes[idx].replace(/^0+/g, ''), '0'));
                if (idx === 'Sócio') companys.push(nodes[idx]);
                result.addItem(idx, nodes[idx]);
            }
        }
    };

    const setSociety = (result, jdocument) => {
        let $empresas = jdocument.find('BPQL > body parsocietaria > empresa');

        if ($empresas.length === 0) return;

        for (let node of $empresas) {
            let $node = $(node);

            let nodes = {
                Empresa: 'nome',
                CNPJ: 'cnpj',
                // "Participação": "quali"
            };

            let dict = {
                documento: $(node).find('cnpj').text(),
                ihash: $(node).find('cnpj').attr('ihash')
            };

            let items = {};
            let separator = result.addSeparator('Quadro Societário', 'Empresa', '', items);

            controller.server.call('SELECT FROM \'SEEKLOC\'.\'CCF\'', {data:dict, success: ret => {
                let totalRegistro =  parseInt($(ret).find('BPQL > body > data > resposta > totalRegistro').text());
                let message = 'Não há cheques sem fundo.';
                if (totalRegistro) {
                    let qteOcorrencias = $(ret).find('BPQL > body > data > sumQteOcorrencias').text();
                    let v1 = moment($('dataUltOcorrencia', ret).text(), 'DD/MM/YYYY');
                    let v2 = moment($('ultimo', ret).text(), 'DD/MM/YYYY');
                    message = ` Total de registros CCF: ${qteOcorrencias} com data da última ocorrência: ${(v1.isAfter(v2) ? v1 : v2).format('DD/MM/YYYY')}.`;
                }
                items.resultsDisplay.text(`${items.resultsDisplay.text()} ${message}`);
            }});

            controller.server.call('SELECT FROM \'IEPTB\'.\'WS\'', {data:dict, success: ret => {
                if ($(ret).find('BPQL > body > consulta > situacao').text() != 'CONSTA') {
                    items.resultsDisplay.text(`${items.resultsDisplay.text()} Não há protestos.`);
                    return;
                }
                let totalProtestos = $('protestos', ret)
                    .get()
                    .map(p => parseInt($(p).text()))
                    .reduce((a, b) => a + b, 0);
                items.resultsDisplay.text(`${items.resultsDisplay.text()} Total de Protestos: ${isNaN(totalProtestos) ? '1 ou mais' : totalProtestos}.`);
            }});

            for (const idx in nodes) {
                const data = $node.find(nodes[idx]).text();
                nodes[idx] = (/^\**$/.test(data)) ? '' : data;
                if (idx === 'CNPJ') nodes[idx] = CNPJ.format(nodes[idx]);
                result.addItem(idx, nodes[idx]);
            }
        }
    };

    const parserConsultas = document => {
        const jdocument = $(document);

        const result = controller.call('result');

        const nodes = {
            Nome: 'nome',
            'CPF/CNPJ': 'cpf',
            'Nome da Mãe' : 'nomemae',
            'Atividade Econômica' : 'atividade-economica',
            'Natureza Jurídica' : 'natureza-juridica',
            Situação : 'situacao',
            'Data de Abertura' : 'data-abertura',
        };

        const init = 'BPQL > body ';
        let doc;
        for (const idx in nodes) {
            let data = jdocument.find(init + nodes[idx]).first().text();
            if (/^\**$/.test(data))
                continue;
            if (idx === 'CPF/CNPJ') {
                data = data.replace(/^0+/, '');
                data = pad(11, data, '0');
                if (CPF.isValid(data)) {
                    result.addItem('CPF', CPF.format(data), nodes[idx]);
                    doc = CPF.format(data);
                }
                else {
                    data = pad(14, data, '0');
                    result.addItem('CNPJ', CNPJ.format(data), nodes[idx]);
                    doc = CNPJ.format(data);
                }
                continue;
            }
            result.addItem(idx, data, nodes[idx]);
        }

        const capitalSocial = jdocument.find('capitalSocial');
        if (capitalSocial.length) {
            result.addItem('Capital Social', numeral(capitalSocial.text().replace('.', ',')).format('$0,0.00'), 'capitalSocial');
        }

        if (doc) {
            controller.trigger('ccbusca::parser', { result, doc });
        }
        setAddress(result, jdocument);
        setContact(result, jdocument);
        setSociety(result, jdocument);
        setQSA(result, jdocument);
        setSocio(result, jdocument);
        setEmpregador(result, jdocument);
        
        return result.element();
    };

    controller.registerBootstrap('parserCCbusca', callback => {
        callback();
        controller.importXMLDocument.register('CCBUSCA', 'CONSULTA', parserConsultas);
        controller.importXMLDocument.register('CCBUSCA', 'BILLING', parserConsultas);
    });

};
