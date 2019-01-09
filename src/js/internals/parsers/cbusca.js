import _ from 'underscore';

module.exports = controller => {

    const setAddress = (result, jdocument) => {
        const init = 'BPQL > body > addresses > address';

        const addressElements = [];
        const cepElements = [];

        jdocument.find(init).each((i, node) => {
            const nodes = {
                Endereço: 'address',
                Número: 'number',
                Complemento: 'address-complement',
                CEP: 'zipcode',
                Bairro: 'neighborhood',
                Cidade: 'city',
                Estado: 'state'
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
                    _.contains(cepElements, nodes.CEP)) {
                return;
            }

            addressElements.push(nodes['Endereço']);
            cepElements.push(nodes.CEP);

            result.addSeparator('Endereço', 'Localização', 'Endereçamento e mapa');

            for (idx in nodes) {
                if (/^\**$/.test(nodes[idx])) {
                    return;
                }
                result.addItem(idx, nodes[idx]);
            }

            jnode.find('*').each((idx, node) => {
                const jnode = $(node);
                if (!/address-complement/i.test(jnode.prop('tagName'))) {
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
        });
    };

    const setContact = (result, jdocument) => {
        let phones = [];
        let emails = [];

        jdocument.find('BPQL > body > phones > phone:lt(3)').each((idx, node) => {
            const jnode = $(node);
            let ddd = jnode.find('area-code').text().trim();
            let phone = jnode.find('number').text().trim();
            if (!ddd || !phone) return;
            phones.push(`(${ddd}) ${phone}`);
        });

        jdocument.find('BPQL > body email:lt(3), BPQL > body > RFB > email').each((idx, node) => {
            emails.push($(node).text());
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
            result.addItem('Telefone', phone);
        }

        for (const idxEmails in emails) {
            result.addItem('Email', emails[idxEmails]);
        }

    };

    const parserConsultas = document => {
        const jdocument = $(document);

        const result = controller.call('result');

        const nodes = {
            Nome: 'name'
        };

        const init = 'BPQL > body > ';
        for (const idx in nodes) {
            const data = jdocument.find(init + nodes[idx]).text();
            if (/^\**$/.test(data))
                continue;
            result.addItem(idx, data, nodes[idx]);
        }

        setAddress(result, jdocument);
        setContact(result, jdocument);

        return result.element();
    };

    controller.registerBootstrap('parserCbusca', callback => {
        callback();
        controller.importXMLDocument.register('CBUSCA', 'CONSULTA', parserConsultas);
    });

};
