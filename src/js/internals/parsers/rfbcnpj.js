import _ from 'underscore';

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
                Endereço: 'logradouro',
                Número: 'numero',
                Complemento: 'complemento',
                CEP: 'cep',
                Bairro: 'bairro',
                Cidade: 'municipio',
                Estado: 'uf'
            };

            const jnode = $(node);
            const address = [];

            for (var idx in nodes) {
                const data = jnode.find(nodes[idx]).text();
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
                    key: controller.confs.maps,
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
        });
    };

    const setSociety = (result, jdocument) => {
        let $empresas = jdocument.find('BPQL > body socios > socio');

        if ($empresas.length === 0) return;

        for (let node of $empresas) {
            let $node = $(node);
            let nodes = {};
            nodes[$node.attr('qualificacao')] = $node.text();

            result.addSeparator('Quadro Societário', 'Empresa', 'Empresa a qual faz parte.');
            for (const idx in nodes) {
                result.addItem(idx, nodes[idx]);
            }

        }
    };

    const setContact = (result, jdocument) => {
        let phones = [];
        let emails = [];

        jdocument.find('BPQL > body telefones').each((idx, node) => {
            const phone = $(node).text();
            if (!phone) return;
            phones.push(`(${phone.substring(0,2)}) ${phone.substring(3, 12)}`);
        });

        jdocument.find('BPQL > body email').each((idx, node) => {
            let email = $(node).text().trim();
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
            result.addItem('Telefone', phones[idxPhones]);
        }

        for (const idxEmails in emails) {
            result.addItem('Email', emails[idxEmails]);
        }

    };

    const parserConsultas = document => {
        const jdocument = $(document);

        const result = controller.call('result');

        const nodes = {
            Nome: 'nome',
            'Atividade Econômica' : 'atividade-economica',
            'Natureza Jurídica' : 'natureza-juridica',
            Situação : 'situacao',
            'Data de Abertura' : 'data-abertura'
        };

        const init = 'BPQL > body ';
        for (const idx in nodes) {
            const data = jdocument.find(init + nodes[idx]).text();
            if (/^\**$/.test(data))
                continue;
            result.addItem(idx, data, nodes[idx]);
        }

        const capitalSocial = jdocument.find('capitalSocial');
        if (capitalSocial.length) {
            result.addItem('Capital Social', numeral(capitalSocial.text().replace('.', ',')).format('\'$0,0.00\''), 'capitalSocial');
        }

        setContact(result, jdocument);
        setAddress(result, jdocument);
        setSociety(result, jdocument);

        return result.element();
    };

    controller.registerBootstrap('parserRFBCNPJ', callback => {
        callback();
        controller.importXMLDocument.register('RFB', 'CERTIDAO', parserConsultas);
        controller.importXMLDocument.register('RFBCNPJ', 'CERTIDAO', parserConsultas);
        controller.importXMLDocument.register('RFBCNPJANDROID', 'CERTIDAO', parserConsultas);
    });

};
