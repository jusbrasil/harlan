import _ from 'underscore';

module.exports = controller => {

    const parsePhoto = (result, document) => {
        const photos = [];

        document.find('BPQL > body photos > url').each((idx, node) => {
            photos.push($(node).text());
        });

        document.find('*[profileImage]').each(node => {
            photos.push($(node).attr('profileImage'));
        });

        if (!photos.length)
            return;

        result.addItem().addClass('photo').css('background-image', `url(${photos[0]})`);
    };

    const socialNetwork = (result, jdocument) => {
        const profiles = jdocument.find('BPQL > body socialProfiles > socialProfiles');

        if (!profiles.length) {
            return;
        }

        result.addSeparator('Redes Sociais', 'Perfis na Internet', 'Referência de perfis sociais');
        profiles.each((idx, node) => {
            const jnode = $(node);
            const element = result.addItem('Perfil', jnode.find('typeName').text());
            element.prepend($('<a />').attr({
                target: '_blank',
                href: jnode.find('url').text(),
                title: 'typeName'
            }).append(element.find('.value')));
        });
    };

    const setContact = (result, jdocument) => {
        let phones = [];
        let emails = [];

        jdocument.find('BPQL > body > phones > phone:lt(3)').each((idx, node) => {
            const jnode = $(node);
            phones.push(`(${jnode.find('area-code').text()}) ${jnode.find('number').text()}`);
        });

        jdocument.find('BPQL > body email:lt(3)').each((idx, node) => {
            emails.push($(node).text());
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

    const addMap = (result, jdocument) => {
        const address = [];

        result.block();

        jdocument.find('BPQL > body > addresses address').first().find('*').each((idx, node) => {
            const jnode = $(node);
            if (!/(address|number|address-complement|bairro)/.test(jnode.prop('tagName')))
                address.push(jnode.text());
        });

        const width = window.innerWidth - 90;

        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${$.param({
            key: controller.confs.maps,
            scale: '1',
            size: `${(width < 120 ? 120 : width).toString()}x150`,
            maptype: 'roadmap',
            format: 'png',
            visual_refresh: 'true',
            markers: `size:mid|color:red|label:1|${address.join(', ')}`
        })}`;

        result.addItem('Localização Aproximada', '').addClass('map').find('.value').append(
            $('<a />').attr({
                href: `https://www.google.com/maps?${$.param({
                    q: address.join(', ')
                })}`,
                target: '_blank'
            }).append($('<img />').attr('src', mapUrl)));
    };

    controller.importXMLDocument.register('SOCIALPROFILE', 'CONSULTA', document => {
        const result = controller.call('result');
        const jdocument = $(document);

        parsePhoto(result, jdocument);

        let bio = null;
        const bioNode = jdocument.find('BPQL > body bio').first();
        if (bioNode.length) {
            bio = bioNode.text();
        }

        result.addItem(bio || 'Nome', jdocument.find('BPQL > body > name, BPQL > body> fullName').first().text());

        result.addItem('Idade Aproximada', jdocument.find('approximate-age').first().text()).addClass('center');
        result.addItem('Critério', jdocument.find('criteria').first().text()).addClass('center');

        result.addItem('Média E-commerce', `R$${jdocument.find('BPQL > body > buy-avg').text()}`);
        result.addItem('Máximo E-commerce', `R$${jdocument.find('BPQL > body > buy-limit').text()}`);
        result.block();

        result.generateRadial('Risco Social', parseInt(jdocument.find('BPQL > body > social-risk').text()));
        result.generateRadial('Influência', parseInt(jdocument.find('BPQL > body > influence').text()));
        result.generateRadial('Risco Jurídico', parseInt(jdocument.find('BPQL > body > juridic-risk').text()));
        result.generateRadial('Confiança', parseInt(jdocument.find('BPQL > body > confidence').text()), {
            0: 'warning',
            50: 'attention',
            70: null
        });

        addMap(result, jdocument);
        setContact(result, jdocument);
        socialNetwork(result, jdocument);

        return result.element();
    });

};
