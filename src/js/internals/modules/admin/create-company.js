import owasp from 'owasp-password-strength-test';
const VALID_USERNAME = /^[a-z\@\.\_\-\s\d]{3,}$/i;
import {CPF} from 'cpf_cnpj';
import {CNPJ} from 'cpf_cnpj';

module.exports = controller => {

    controller.registerCall('admin::createAccount::formDescription', () => ({
        title: 'Criação de Conta',
        subtitle: 'Preencha os dados abaixo.',
        gamification: 'magicWand',
        paragraph: 'É muito importante que os dados estejam preenchidos de maneira correta para que seja mantido um cadastro saneado.',

        screens: [{
            magicLabel: true,
            fields: [
                [{
                    name: 'username',
                    type: 'text',
                    placeholder: 'Nome de Usuário',
                    labelText: 'Nome de Usuário',
                    optional: false
                }, {
                    name: 'companyReference',
                    type: 'text',
                    placeholder: 'Referência Comercial',
                    labelText: 'Referência Comercial',
                    optional: true
                }],
                [{
                    name: 'password',
                    type: 'password',
                    placeholder: 'Senha',
                    labelText: 'Senha',
                    optional: false
                }, {
                    name: 'repeat-password',
                    type: 'password',
                    placeholder: 'Repita sua Senha',
                    labelText: 'Repita sua Senha',
                    optional: false
                }]
            ],
            validate: (callback, configuration, screen, formManager) => {
                const values = formManager.readValues();
                formManager.defaultScreenValidation((isValid) => {
                    if (!isValid) {
                        callback(isValid);
                    }
                    const passwordElement = formManager.getField('password').element;
                    if (!owasp.test(values.password).strong) {
                        isValid = false;
                        toastr.error(
                            'É necessário que a senha tenha oito letras, conténdo maiúsculos, minúsculos, numéricos e especiais.',
                            'A senha inserida é muito fraca, tente uma mais forte.');
                        passwordElement.addClass('error');
                    }

                    if (values.password !== values.repeatPassword) {
                        isValid = false;
                        toastr.error(
                            'As senhas inseridas não conferem uma com a outra, estão diferentes.',
                            'Senhas não conferem, tente novamente.');
                        formManager.getField('repeat-password').element.addClass('error');
                    }

                    const usernameElement = formManager.getField('username').element;
                    if (!VALID_USERNAME.test(values.username)) {
                        usernameElement.addClass('error');
                        toastr.error('O nome de usuário precisa ter 3 ou mais caracteres, sem espaços.');
                        callback(false);
                        return;
                    }

                    controller.serverCommunication.call('SELECT FROM \'HARLANAUTHENTICATION\'.\'USERNAMETAKEN\'',
                        controller.call('error::ajax', controller.call('loader::ajax', {
                            data: {
                                username: values.username
                            },
                            success() {
                                callback(isValid);
                            },
                            error() {
                                usernameElement.addClass('error');
                                callback(false);
                            }
                        })));
                }, configuration, screen);
            }
        }, {
            magicLabel: true,
            fields: [{
                name: 'company',
                type: 'text',
                placeholder: 'Empresa',
                optional: true,
                labelText: 'Empresa'
            },
            [{
                name: 'name',
                type: 'text',
                placeholder: 'Nome do Responsável',
                optional: true,
                labelText: 'Nome'
            }, {
                name: 'zipcode',
                type: 'text',
                placeholder: 'CEP',
                optional: false,
                labelText: 'CEP',
                mask: '00000-000'
            }],
            [{
                name: 'email',
                type: 'text',
                placeholder: 'E-mail',
                optional: false,
                labelText: 'E-mail'
            }, {
                name: 'phone',
                type: 'text',
                placeholder: 'Telefone',
                labelText: 'Telefone',
                mask: '(00) 0000-00009',
                optional: false
            }],
            [{
                name: 'cpf',
                type: 'text',
                placeholder: 'CPF',
                labelText: 'CPF',
                mask: '000.000.000-00',
                optional: true,
                maskOptions: {
                    reverse: true
                },
                validate({element}) {
                    if (element.val())
                        return CPF.isValid(element.val());
                    return true;
                }
            }, {
                name: 'cnpj',
                type: 'text',
                placeholder: 'CNPJ',
                labelText: 'CNPJ',
                mask: '00.000.000/0000-00',
                optional: true,
                maskOptions: {
                    reverse: true
                },
                validate({element}) {
                    if (element.val())
                        return CNPJ.isValid(element.val());
                    return true;
                }
            }], {
                name: 'priceList',
                type: 'text',
                placeholder: 'Lista de Preços',
                labelText: 'Lista de Preços',
                optional: true
            }],
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
                    }

                    if (values.cnpj) {
                        if (!values.company) {
                            toastr.error(
                                'É necessário que o nome da empresa seja preenchido caso haja CNPJ.',
                                'Impossível continuar sem nome da empresa');
                            isValid = false;
                        }
                    }

                    callback(isValid);
                }, configuration, screen);
            }
        }, {
            magicLabel: true,
            fields: [
                [{
                    name: 'roleValue',
                    type: 'text',
                    placeholder: 'Contrato (R$)',
                    labelText: 'Valor do Contrato (R$)',
                    mask: '000.000.000.000.000,000',
                    optional: false,
                    maskOptions: {
                        reverse: true
                    },
                    numeral: true
                }, {
                    name: 'queryValue',
                    type: 'text',
                    placeholder: 'Consulta Excedente (R$)',
                    labelText: 'Consulta Excedente (R$)',
                    mask: '000.000.000.000.000,000',
                    optional: false,
                    maskOptions: {
                        reverse: true
                    },
                    numeral: true
                }],
                [{
                    name: 'roleType',
                    type: 'select',
                    labelText: 'Tipo de Contrato',
                    optional: false,
                    list: controller.call('admin::roleTypes')
                }, {
                    name: 'roleQuerys',
                    type: 'text',
                    optional: false,
                    placeholder: 'Mínimo Consultas',
                    labelText: 'Mínimo Consultas',
                    mask: '0#',
                    numeral: true
                }]
            ]
        }, {
            magicLabel: true,
            fields: [{
                name: 'endereco',
                optional: false,
                type: 'text',
                placeholder: 'Endereço'
            },
            [{
                name: 'numero',
                optional: false,
                type: 'text',
                numeral: true,
                placeholder: 'Número'
            }, {
                name: 'complemento',
                type: 'text',
                optional: true,
                placeholder: 'Complemento'
            }],
            [{
                name: 'cidade',
                optional: false,
                type: 'text',
                placeholder: 'Cidade'
            }, {
                name: 'estado',
                optional: false,
                type: 'select',
                placeholder: 'Estado',
                list: {
                    '': 'Escolha um estado',
                    AC: 'Acre',
                    AL: 'Alagoas',
                    AM: 'Amazonas',
                    AP: 'Amapá',
                    BA: 'Bahia',
                    CE: 'Ceará',
                    DF: 'Distrito Federal',
                    ES: 'Espírito Santo',
                    GO: 'Goiás',
                    MA: 'Maranhão',
                    MT: 'Mato Grosso',
                    MS: 'Mato Grosso do Sul',
                    MG: 'Minas Gerais',
                    PA: 'Pará',
                    PB: 'Paraíba',
                    PR: 'Paraná',
                    PE: 'Pernambuco',
                    PI: 'Piauí',
                    RJ: 'Rio de Janeiro',
                    RN: 'Rio Grande do Norte',
                    RO: 'Rondônia',
                    RS: 'Rio Grande do Sul',
                    RR: 'Roraima',
                    SC: 'Santa Catarina',
                    SE: 'Sergipe',
                    SP: 'São Paulo',
                    TO: 'Tocantins'
                }
            }]
            ]
        }]
    }));

    controller.registerCall('admin::createCompany', description => {
        const form = controller.call('form', opts => {
            controller.serverCommunication.call(controller.endpoint.createCompany,
                controller.call('error::ajax', controller.call('loader::ajax', {
                    data: opts,
                    success: response => {
                        const modal = controller.call('modal');
                        modal.gamification('star');
                        modal.title('Parabéns! Conta criada com sucesso.');
                        modal.subtitle(`A conta ${opts.company || opts.name} foi cadastrada.`);
                        modal.addParagraph(`O usuário ${opts.username} foi adicionado com sucesso, adicionalmente foi encaminhado um e-mail para o mesmo contendo instruções de acesso.`);
                        const form = modal.createForm();
                        form.cancelButton('Sair');
                        modal.createActions().add('Criar outra Conta').click(e => {
                            e.preventDefault();
                            modal.close();
                            controller.call('admin::createCompany');
                        });
                    }
                })));
        });
        form.configure(description || controller.call('admin::createAccount::formDescription'));
    });

};
