const CREATE_COMPANY = /(^|\s)(adicio?n?a?r?|nova|criar)($|\s)/i;
const ADMIN_COMPANY = /(^|\s)(admi?n?i?s?t?r?a?r?)($|\s)/i;

module.exports = controller => {
    controller.registerTrigger('findDatabase::instantSearch', 'admin::createCompany', (args, callback) => {
        callback();
        const [argument, autocomplete] = args;
        if (CREATE_COMPANY.test(argument)) {
            controller.call('admin::autocompleteCreateCompany', autocomplete);
        }
    });

    controller.registerTrigger('findDatabase::instantSearch', 'admin::index', (args, callback) => {
        callback();
        const [argument, autocomplete] = args;
        if (!ADMIN_COMPANY.test(argument)) {
            return;
        }

        autocomplete.item('Administrar Usuários',
            'Gestão de Usuários do Sistema',
            'Adicionar, remover ou alterar dados cadastrais, contratuais e afins.')
            .addClass('admin-company admin-new-company')
            .click(controller.click('admin::index'));
    });

    controller.registerTrigger('findDatabase::instantSearch', 'findCompany::tag', (args, callback) => {
        callback();
        let [query, autocompleter] = args;
        if (!/^tag/i.test(query)) {
            return;
        }

        autocompleter.item('Pesquise por uma TAG de Empresa', 'Pesquisa de usuários por TAG configurada no cadastro.')
            .addClass('admin-company admin-new-company')
            .click(e => {
                e.preventDefault();
                let modal = controller.call('modal');
                modal.title('Pesquisa por TAG');
                modal.subtitle('Liste todas as empresas que possuem determinada TAG.');
                modal.paragraph('Informe a TAG abaixo para que pesquisemos todas as empresas que possuem a TAG informada');

                let form = modal.createForm();
                let input = form.addInput('tag', 'text', 'TAG da Empresa').magicLabel();

                form.element().submit(e => {
                    e.preventDefault();
                    modal.close();
                    controller.serverCommunication.call('SELECT FROM \'BIPBOPCOMPANYS\'.\'LIST\'', {
                        data: {
                            tag: input.val()
                        },
                        success(response) {
                            $('BPQL > body > company', response).each((idx, companyNode) => {
                                const company = $(companyNode);
                                const document = company.children('cnpj').text() || company.children('cpf').text();
                                controller.call('admin::viewCompany', company);
                            });
                        }
                    });
                });
                form.addSubmit('submit', 'Pesquisar');
                modal.createActions().cancel();
            });
    });

    controller.registerTrigger('findDatabase::instantSearch', 'admin::postPaid', (args, callback) => {
        callback();
        const [argument, autocomplete] = args;
        if (argument.length < 3 || !/(pós|pago)/.test(argument)) {
            return;
        }

        autocomplete.item('Administrar Usuários Pós Pagos',
            'Gestão de Usuários Pós Pagos do Sistema',
            'Adicionar, remover ou alterar dados cadastrais, contratuais e afins.')
            .addClass('admin-company admin-new-company')
            .click(e => {
                e.preventDefault();
                controller.serverCommunication.call('SELECT FROM \'BIPBOPCOMPANYS\'.\'LIST\'', {
                    data: {
                        postPaid: 'true'
                    },
                    success(response) {
                        $('BPQL > body > company', response).each((idx, companyNode) => {
                            const company = $(companyNode);
                            const document = company.children('cnpj').text() || company.children('cpf').text();
                            controller.call('admin::viewCompany', company);
                        });
                    }
                });
            });
    });

    controller.registerTrigger('findDatabase::instantSearch', 'admin::listCompany', (args, callback) => {
        const [argument, autocomplete] = args;
        if (argument.length < 3) {
            callback();
            return;
        }

        controller.serverCommunication.call('SELECT FROM \'BIPBOPCOMPANYS\'.\'LIST\'', {
            data: {
                data: argument,
                limit: 3
            },
            success: (response) => controller.call('admin::fillCompanysAutocomplete', response, autocomplete),
            complete: () => callback()
        });
    });

};
