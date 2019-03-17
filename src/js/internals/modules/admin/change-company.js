import _ from 'underscore';
const VALID_USERNAME = /^[a-z\@\.\_\-\s\d]{3,}$/i;
import {CPF} from 'cpf_cnpj';
import {CNPJ} from 'cpf_cnpj';

module.exports = controller => {
    controller.registerCall('admin::changeHide', (companyNode, account, section) => controller.confirm({
        title: `Deseja remover esconder o usuário ${account}?`,
        subtitle: 'O usuário não poderá ser encontrado novamente e o comportamento do sistema será alterado.',
        paragraph: 'Se certique de que deseja realmente esconder o usuário.'
    }, () => controller.serverCommunication.call('UPDATE \'BIPBOPCOMPANYS\'.\'HIDE\'',
        controller.call('error::ajax', controller.call('loader::ajax', {
            data: { account },
            success: () => {
                section.remove();
                controller.alert({
                    icon: 'locked',
                    title: 'O usuário foi escondido com sucesso.',
                    subtitle: `Não serão mais visualizados dados deste usuário ${account} na interface.`,
                    paragraph: 'O cliente foi bloqueado e escondido, para recuperar contate o suporte técnico.',
                });
            },
        })))));

    controller.registerCall('admin::changeCompany', (companyNode, username, section) => {
        const form = controller.call('form', opts => {
            opts.username = username;
            controller.serverCommunication.call('UPDATE \'BIPBOPCOMPANYS\'.\'COMPANY\'',
                controller.call('error::ajax', controller.call('loader::ajax', {
                    data: opts,
                    success: response => controller.call('admin::viewCompany', $(response).find('BPQL > body > company'), section, 'replaceWith')
                })));
        });
        form.configure({
            title: 'Alteração de Conta',
            subtitle: 'Preencha os dados abaixo.',
            gamification: 'magicWand',
            paragraph: 'É muito importante que os dados estejam preenchidos de maneira correta para que seja mantido um cadastro saneado.',
            screens: [{
                magicLabel: true,
                fields: [
                    [{
                        name: 'company',
                        type: 'text',
                        placeholder: 'Empresa',
                        optional: true,
                        labelText: 'Empresa',
                        value: $(companyNode).children('nome').text()
                    }, {
                        name: 'companyReference',
                        type: 'text',
                        placeholder: 'Referência Comercial',
                        labelText: 'Referência Comercial',
                        optional: true,
                        value: $(companyNode).children('commercialReference').text(),
                    }],
                    [{
                        name: 'newUsername',
                        type: 'text',
                        placeholder: 'Usuário',
                        optional: true,
                        value: $(companyNode).children('username').text(),
                        labelText: 'Usuário',
                        validate({element}) {
                            return VALID_USERNAME.test(element.val());
                        },
                        validateAsync(callback, {element}) {
                            if (username == element.val()) {
                                callback(true);
                                return;
                            }
                            controller.serverCommunication.call('SELECT FROM \'HARLANAUTHENTICATION\'.\'USERNAMETAKEN\'',
                                controller.call('error::ajax', controller.call('loader::ajax', {
                                    data: {
                                        username: element.val()
                                    },
                                    success() {
                                        callback(true);
                                    },
                                    error() {
                                        callback(false);
                                    }
                                })));
                        }
                    }, {
                        name: 'name',
                        type: 'text',
                        placeholder: 'Nome do Responsável',
                        optional: true,
                        labelText: 'Nome',
                        value: $(companyNode).children('responsavel').text(),
                    }],
                    [{
                        name: 'cnpj',
                        type: 'text',
                        placeholder: 'CNPJ',
                        labelText: 'CNPJ',
                        mask: '00.000.000/0000-00',
                        value: $(companyNode).children('cnpj').text(),
                        optional: true,
                        maskOptions: {
                            reverse: true
                        },
                        validate({element}) {
                            if (element.val())
                                return CNPJ.isValid(element.val());
                            return true;
                        }
                    }, {
                        name: 'cpf',
                        type: 'text',
                        placeholder: 'CPF',
                        labelText: 'CPF',
                        mask: '000.000.000-00',
                        value: $(companyNode).children('cpf').text(),
                        optional: true,
                        maskOptions: {
                            reverse: true
                        },
                        validate({element}) {
                            if (element.val())
                                return CPF.isValid(element.val());
                            return true;
                        },
                    }]
                ],
                validate: (callback, configuration, screen, formManager) => {
                    formManager.defaultScreenValidation((isValid) => {
                        if (!isValid) {
                            callback(isValid);
                            return;
                        }

                        const values = formManager.readValues();

                        if (values.cpf) {
                            if (!values.name) {
                                toastr.error(
                                    'É necessário que o nome seja preenchido caso haja CPF.',
                                    'Impossível continuar sem nome');
                                isValid = false;
                            }
                            if (!CPF.isValid(values.cpf)) {
                                toastr.error('O CPF inserido não confere, verifique e tente novamente.');
                                isValid = false;
                            }
                        }

                        if (values.cnpj) {
                            if (!values.company) {
                                toastr.error(
                                    'É necessário que o nome da empresa seja preenchido caso haja CNPJ.',
                                    'Impossível continuar sem nome da empresa');
                                isValid = false;
                            }
                            if (!CNPJ.isValid(values.cnpj)) {
                                toastr.error('O CNPJ inserido não confere, verifique e tente novamente.');
                                isValid = false;
                            }
                        }

                        callback(isValid);
                    }, configuration, screen);
                }
            }]
        });
    });
};
