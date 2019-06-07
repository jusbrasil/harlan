import sprintf from 'sprintf';

import escaper from 'true-html-escape';

module.exports = controller =>  {

    let companyCredits = 0;

    controller.registerCall('credits::get', () => companyCredits);

    const defaultChargeCallback = (ret, callback) =>  {
        const modal = controller.call('modal');
        modal.title('Parabéns! Seus créditos foram carregados.');
        modal.subtitle('Um e-mail foi enviado para sua caixa de entrada com todos os detalhes.');
        const form = modal.createForm();
        form.element().submit(e =>  {
            e.preventDefault();
            if (callback)
                callback();
            modal.close();
        });
        form.addSubmit('cancel', 'Sair');
    };

    const changeCredits = credits =>  {
        companyCredits = credits;
        $('.credits span').text(numeral(Math.abs(credits) / 1000.).format('0,0.00'));

        if (credits < 0) {
            $('.credits').addClass('invertBalance');
        } else {
            $('.credits').removeClass('invertBalance');
        }
    };

    controller.registerCall('credits::has', (needed, callback, askFor = true) => {
        if (!needed || controller.confs.user.postPaid) {
            callback();
            return;
        }
        controller.call('authentication::need', () => {
            const missing = companyCredits - needed;
            let modal;
            let form;
            let actions;

            if (missing < 0) {
                modal = controller.call('modal');
                modal.title('Você precisa de créditos!');
                modal.subtitle('Para continuar essa operação você precisa adquirir créditos.');
                modal.addParagraph(sprintf('Estão faltando %s para você poder continuar, adquira créditos.', numeral(Math.abs(missing) / 1000.0).format('$0,0.00')));
                form = modal.createForm();
                form.element().submit(e =>  {
                    e.preventDefault();
                    modal.close();
                    controller.call('credits::buy', Math.max(Math.abs(missing), 25000), ret =>  {
                        defaultChargeCallback(ret, callback);
                    });
                });
                form.addSubmit('submit', 'Adquirir Créditos');
                actions = modal.createActions();
                actions.cancel();
            } else {
                if (!askFor) return;
                const credits = numeral(needed / 1000.0).format('$0,0.00');
                modal = controller.call('modal');
                modal.gamification('moneyBag');
                modal.title('Vamos debitar de seus créditos.');
                modal.subtitle(sprintf('O valor para esta operação ficou em %s.', credits));
                modal.addParagraph(sprintf('Serão debitados %s de sua conta, para aceitar clique em prosseguir.', numeral(needed / 1000.0).format('$0,0.00')));
                form = modal.createForm();
                form.element().submit(e =>  {
                    e.preventDefault();
                    modal.close();
                    callback();
                });

                form.addSubmit('submit', 'Prosseguir');
                actions = modal.createActions();
                actions.cancel();
            }
        });
    });

    if (controller.query.recharge === 'true' && controller.query.apiKey) {
        controller.registerTrigger('call::authentication::loggedin', 'recharge', (data, cb) => {
            cb();
            controller.call('credits::buy');
        });
    }

    controller.registerTrigger('authentication::authenticated', 'credits::authentication::authenticated', (ret, callback) =>  {
        let credits = 0;

        if (ret) {
            const node = $('BPQL > body credits', ret);
            if (node.length) {
                credits = parseInt(node.text());
            }
        }

        changeCredits(credits);
        callback();
    });

    controller.registerTrigger('serverCommunication::websocket::authentication', 'credits', (data, callback) =>  {
        changeCredits(data && data.credits ? data.credits : 0);
        callback();
    });

    controller.registerTrigger('serverCommunication::websocket::credits', 'credits', (data, callback) =>  {
        changeCredits(data && data.credits ? data.credits : 0);
        callback();
    });

    controller.registerCall('credits::charge', (value, quantity, description, callback) =>  {
        const modal = controller.call('modal');
        modal.title('Método de Pagamento');
        modal.subtitle('Selecione o Método de Pagamento');
        const form = modal.createForm();

        form.element().submit(e =>  {
            e.preventDefault();
            modal.close();
            controller.call('credits::charge::creditCard', value, quantity, description, callback);
        });

        form.addSubmit('creditcard', 'Cartão de Crédito');
        form.addSubmit('bankslip', 'Boleto Bancário').click(e =>  {
            e.preventDefault();
            modal.close();
            controller.call('credits::charge::bankSlip', value, quantity, description);
        });

        modal.createActions().add(controller.i18n.system.cancel()).click(e =>  {
            e.preventDefault();
            modal.close();
        });
    });

    controller.registerCall('credits::charge::bankSlip', (value, quantity, description) =>  {
        const unregister = $.bipbopLoader.register();
        controller.serverCommunication.call('SELECT FROM \'HarlanCredits\'.\'PurchaseBankSlip\'', controller.call('error::ajax', {
            data: {
                description: description || 'Recarga de créditos',
                value,
                quantity: quantity || 1
            },
            success: data =>  {
                controller.call('alert', {
                    icon: 'pass',
                    title: 'Seu pagamento foi gerado com sucesso!',
                    subtitle: 'O pagamento com boleto bancário leva um dia útil para ser compensado.',
                    paragraph: `O link com o boleto foi encaminhado para seu e-mail. Se preferir você pode acessá-lo <a href='${escaper.escape($('BPQL > body secure_url', data).text())}' target='_blank'>clicando aqui</a>.`
                });
            },
            complete: () => {
                unregister();
            }
        }));
    });

    controller.registerCall('credits::charge::creditCard', (value, quantity, description, callback) =>  {
        controller.call('authentication::need', () => {
            callback = callback || defaultChargeCallback;
            quantity = quantity || 1;

            controller.call('iugu::requestPaymentToken', ({id}) => {
                controller.serverCommunication.call('SELECT FROM \'HARLANCREDITS\'.\'PURCHASE\'',
                    controller.call('error::ajax', controller.call('loader::ajax', {
                        data: {
                            description: description || 'Recarga de créditos',
                            value,
                            token: id,
                            quantity
                        },
                        success: ret =>  {
                            callback(ret);
                        }
                    })));
            });
        });
    });

    controller.registerCall('credits::buy', (minValue, callback) =>  {
        controller.call('authentication::need', () => {
            controller.call('billingInformation::need', () => {
                minValue = minValue || 0;
                const modal = controller.call('modal');

                modal.title('Carregar a Conta de Créditos');
                modal.subtitle('Selecione a opção de créditos desejada.');
                modal.addParagraph('Para continuar desfrutando de todos os recursos da plataforma recarregue sua conta, veja qual opção abaixo se encaixa melhor dentro da sua necessidade.');
                const form = modal.createForm();
                const list = form.createList();

                const charge = value =>  e =>  {
                    e.preventDefault();
                    modal.close();
                    controller.call('credits::charge', value, null, null, callback);
                };

                if (minValue < 25000) {
                    list.add('fa-dollar', 'Recarregar R$ 25,00.').click(charge(25000));
                }

                if (minValue < 50000) {
                    list.add('fa-dollar', 'Recarregar R$ 50,00.').click(charge(50000));
                }

                if (minValue < 10000) {
                    list.add('fa-dollar', 'Recarregar R$ 100,00.').click(charge(100000));
                }

                if (minValue < 500000) {
                    list.add('fa-dollar', 'Recarregar R$ 500,00.').click(charge(500000));
                }

                if (minValue < 1000000) {
                    list.add('fa-dollar', 'Recarregar R$ 1.000,00.').click(charge(1000000));
                }

                if (minValue < 2500000) {
                    list.add('fa-dollar', 'Recarregar R$ 2.500,00.').click(charge(2500000));
                }

                if (minValue < 5000000) {
                    list.add('fa-dollar', 'Recarregar R$ 5.000,00.').click(charge(5000000));
                }

                modal.createActions().cancel();
            });
        });
    });

    controller.registerBootstrap('credits', callback =>  {
        callback();
        $('.action-credits').click(e =>  {
            controller.call('credits::buy');
        });
    });

};
