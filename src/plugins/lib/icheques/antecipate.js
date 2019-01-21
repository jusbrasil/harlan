import _ from 'underscore';
import { CPF } from 'cpf_cnpj';
import { CNPJ } from 'cpf_cnpj';
import { CMC7Parser } from './cmc7-parser';
import { queue } from 'async';
import { titleCase } from 'change-case';

const PAGINATE_FILTER = 5;

const parseLocation = (element, elementPath) => parseFloat($(element).find(elementPath).text().replace(',', '.'));
const R = 6378137;
const PI_360 = Math.PI / 360;

function calculateDistance(a, b) {

    const cLat = Math.cos((a.lat + b.lat) * PI_360);
    const dLat = (b.lat - a.lat) * PI_360;
    const dLon = (b.lon - a.lon) * PI_360;

    const f = dLat * dLat + cLat * cLat * dLon * dLon;
    const c = 2 * Math.atan2(Math.sqrt(f), Math.sqrt(1 - f));

    return R * c;
}

module.exports = controller => {
    let commercialReference = null;
    let hasOtherOccurrences = false;
    let hasBlockedBead = false;
    let hasProcessingOnes = false;

    controller.registerCall('icheques::antecipate::checksIsEmpty', () => {
        let modal = controller.call('modal');

        modal.title('Você não selecionou nenhum cheque');
        modal.subtitle('Seleção de Cheques para Antecipação');

        modal.addParagraph('É necessário selecionar pelo menos um cheque para poder antecipar');
        let form = modal.createForm();

        form.addSubmit('close', 'Ok');
        form.element().submit(e => {
            e.preventDefault();
            modal.close();
        });
    });

    controller.registerCall('icheques::register::all', () => {
        controller.server.call('SELECT FROM \'ICHEQUESPROFILE\'.\'PROFILE\'', {
            dataType: 'json',
            success: profile => {
                controller.call('icheques::register::all::show', profile);
            },
            error: () => {
                controller.alert({
                    title: 'Informações cadastrais são necessárias.',
                    subtitle: 'Você precisa preencher suas informações cadastrais para poder continuar.',
                    paragraph: 'Os fundos antecipadores necessitam de algumas informações para poder receber seus cheques. Preencha os dados a seguir para poder enviar seus títulos.'
                }, () => {
                    controller.call('icheques::form::company', () => controller.call('icheques::register::all'));
                });
            }
        });
    });

    controller.registerCall('icheques::antecipate', checks => {
        controller.server.call('SELECT FROM \'ICHEQUESPROFILE\'.\'PROFILE\'', {
            dataType: 'json',
            success: profile => {
                controller.call('icheques::antecipate::init', checks, profile);
            },
            error: () => {
                controller.alert({
                    title: 'Informações cadastrais são necessárias.',
                    subtitle: 'Você precisa preencher suas informações cadastrais para poder continuar.',
                    paragraph: 'Os fundos antecipadores necessitam de algumas informações para poder receber seus cheques. Preencha os dados a seguir para poder enviar seus títulos.'
                }, () => {
                    controller.call('icheques::form::company', () => controller.call('icheques::antecipate', checks));
                });
            }
        });
    });

    controller.registerTrigger('serverCommunication::websocket::authentication', 'icheques::commercialReference', (data, callback) => {
        commercialReference = data.commercialReference;
        callback();
    });

    /* List Banks */
    controller.registerCall('icheques::antecipate::init', (checks, profile) => {
        let expired = [];
        let now = moment().format('YYYYMMDD');

        checks = _.filter(checks, check => {
            let booleanExpiration = check.expire < now;
            if (booleanExpiration) {
                expired.push(check);
            }
            return !booleanExpiration;
        });

        checks = _.filter(checks, ({situation}) => situation === 'Cheque sem ocorrências' ||
                situation === 'Cheque com outras ocorrências' ||
                situation === 'Instituição bancária não monitorada' ||
                situation === 'O talão do cheque está bloqueado' ||
                !situation);

        if (expired.length) {
            toastr.warning('Alguns cheques da sua carteira estão vencidos.', 'Cheques vencidos não podem ser antecipados, caso queira extender o vencimento em 30 dias utilize os filtros de cheques.');
        }

        if (!checks.length) {
            toastr.error('Não há cheques bons para antecipação, verifique e tente novamente.', 'Não há cheques em que seja possível a antecipação.');
            return;
        }

        // Adicionando as propriedades vindas do CMC7Parser
        checks = checks.map(check => Object.assign({}, check, new CMC7Parser(check.cmc)));

        // Ordenando pelo número do cheque
        checks = _.sortBy(checks, 'number');

        controller.call('billingInformation::need', () => {
            const noAmmountChecks = _.filter(checks, ({ammount}) => !ammount);

            if (noAmmountChecks.length) {
                controller.call('confirm', {
                    icon: 'fail',
                    title: 'Você não preencheu o valor de alguns cheques.',
                    subtitle: `Você precisa configurar o valor de ${noAmmountChecks.length}
                    ${noAmmountChecks.length == 1 ? 'cheque' : 'cheques'} para poder continuar.`,
                    paragraph: 'Tudo que precisar ser editado com o valor será aberto para que você possa repetir esta operação, edite e tente novamente.',
                }, () => {
                    const q = queue((check, cb) => {
                        controller.call('icheques::item::setAmmount', check, cb, form => {
                            form.actions.add('Parar Edição').click(e => {
                                form.close(false);
                                cb('stop', check);
                            });
                        });
                    }, 1);

                    q.push(noAmmountChecks, err => {
                        if (err == 'stop') {
                            q.kill();
                            controller.call('icheques::antecipate', _.filter(checks, ({ammount}) => ammount > 0));
                        }
                    });

                    q.drain = () => {
                        controller.call('icheques::antecipate', _.filter(checks, ({ammount}) => ammount > 0));
                    };

                });
                return;
            }

            controller.serverCommunication.call('SELECT FROM \'ICHEQUESFIDC\'.\'LIST\'',
                controller.call('loader::ajax', controller.call('error::ajax', {
                    data: {
                        approved: 'true'
                    },
                    success: function(ret) {
                        controller.call('icheques::antecipate::filter', ret, checks, profile);
                    }
                })));
        }, ret => {
            if (!$('BPQL > body > company > cnpj', ret).text().length) {
                toastr.warning('É necessário um CNPJ de faturamento para poder continuar.',
                    'Você não possui um CNPJ no cadastro.');
                return false;
            }
            return true;
        });
    });

    const updateList = (modal, pageActions, results, pagination, list, checks, limit = PAGINATE_FILTER, skip = 0, text = null, checksSum = null, callback = null) => {
        if (text) {
            text = text.trim();
            checks = _.filter(checks, ({cnpj, cpf, number}) => {
                let doc = cnpj ? CNPJ.format(cnpj) : CPF.format(cpf);
                return doc.toString().includes(text) || number.toString().includes(text);
            });
        } else if (/\D/.test(text)) {
            text = undefined;
        }

        const totalAmmount = _.reduce(_.pluck(checks, 'ammount'), (memo, num) => memo + num);
        if (totalAmmount) {
            $(checksSum).text(numeral(totalAmmount / 100.0).format('$0,0.00'));
        } else {
            $(checksSum).text('Sem Saldo');
        }

        list.empty();

        const queryResults = checks.length;
        const currentPage = Math.floor(skip / limit) + 1;
        const pages = Math.ceil(queryResults / limit);

        _.each(checks.slice(skip, skip + limit), element => {
            let doc = element.cnpj ? CNPJ.format(element.cnpj) : CPF.format(element.cpf); /* aplica mascara quando nao tiver*/
            list.add('fa-trash', [
                // Número do Cheque
                `Nº do cheque: ${element.number}`,
                // Banco
                `Banco: ${element.bank}`,
                // CPF,
                `Documento: ${doc}`,
                // Valor
                `Valor: ${numeral(element.ammount/100.).format('$ 0,0.00')}`
            ]).click(e => {
                checks.splice(checks.indexOf(element), 1);
                updateList(modal, pageActions, results, pagination, list, checks, limit, skip, text, checksSum);
            });
        });

        pageActions.next[currentPage >= pages ? 'hide' : 'show']();
        pageActions.back[currentPage <= 1 ? 'hide' : 'show']();

        results.text(`Página ${currentPage} de ${pages}`);
        pagination.text(`Resultados ${queryResults}`);

        if (callback) callback();
    };

    controller.registerCall('icheques::antecipate::filter', (data, checks, profile) => {
        let modal = controller.call('modal');
        modal.title('Cheques para Antecipar');
        modal.subtitle('Seleção de Cheques para Antecipação');
        modal.addParagraph('Selecione, da relação abaixo, os cheques que NÃO gostaria de antecipar. Serão eliminados da lista');
        let form = modal.createForm();
        let search = form.addInput('query', 'text', 'Digite aqui o número do documento ou do cheque para filtrar', {}, 'Documento ou nº do cheque');
        let actions = modal.createActions();
        let skip = 0;
        let text = null;
        let goodChecks = [];
        let otherOccurrences = [];
        let blockedBead = [];
        let processingOnes = [];

        otherOccurrences = _.filter(checks, ({situation}) => situation === 'Cheque com outras ocorrências' ||
                situation === 'Instituição bancária não monitorada');

        blockedBead = _.filter(checks, ({situation}) => situation === 'O talão do cheque está bloqueado');

        processingOnes = _.filter(checks, ({situation}) => !situation);

        checks = goodChecks = _.filter(checks, ({situation}) => situation === 'Cheque sem ocorrências');

        let list = form.createList();
        let fieldOtherOccurrences = form.addCheckbox('other-occurrences', 'Exibir cheques com outras ocorrências');
        let fieldBlockedBead = form.addCheckbox('blocked-bead', 'Exibir cheques com talão bloqueado');
        let fieldProcessingOnes = form.addCheckbox('processing-ones', 'Exibir cheques em processamento');

        fieldOtherOccurrences[1].hide();
        fieldOtherOccurrences[1].change(() => {
            // TODO Pegar os cheques com outras ocorrências e atualizar a lista
            if (fieldOtherOccurrences[1].is(':checked')) {
                checks = _.union(checks, otherOccurrences);
                if (otherOccurrences.length > 0) hasOtherOccurrences = true;
            } else {
                checks = _.difference(checks, otherOccurrences);
                hasOtherOccurrences = false;
            }
            updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum);
        });

        fieldProcessingOnes[1].change(() => {
            // TODO Pegar os cheques com talão bloqueado e atualizar a lista
            if (fieldProcessingOnes[1].is(':checked')) {
                checks = _.union(checks, processingOnes);
                if (hasProcessingOnes.length > 0) hasProcessingOnes = true;
            } else {
                checks = _.difference(checks, processingOnes);
                hasProcessingOnes = false;
            }
            skip = 0;
            updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum);
        });

        fieldBlockedBead[1].change(() => {
            // TODO Pegar os cheques com talão bloqueado e atualizar a lista
            if (fieldBlockedBead[1].is(':checked')) {
                checks = _.union(checks, blockedBead);
                if (blockedBead.length > 0) hasBlockedBead = true;
            } else {
                checks = _.difference(checks, blockedBead);
                hasBlockedBead = false;
            }
            skip = 0;
            updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum);
        });

        controller.call('instantSearch', search, (query, autocomplete, callback) => {
            text = query;
            skip = 0;
            updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum, callback);
        });

        form.element().submit(e => {
            e.preventDefault();

            const totalAmmount = _.reduce(_.pluck(checks, 'ammount'), (memo, num) => memo + num);

            if (checks.length || totalAmmount <= 0) {
                controller.call('icheques::antecipate::show', data, checks, profile);
            } else {
                controller.call('icheques::antecipate::checksIsEmpty');
            }
            modal.close();
        });
        form.addSubmit('filter', 'Enviar Cheques');
        actions.add('Sair').click(e => {
            e.preventDefault();
            modal.close();
        });

        let results = actions.observation();
        let pagination = actions.observation();
        let checksSum = actions.observation();

        var pageActions = {
            next: actions.add('Próxima Página').click(() => {
                skip += PAGINATE_FILTER;
                updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum);
            }).hide(),

            back: actions.add('Página Anterior').click(() => {
                skip -= PAGINATE_FILTER;
                updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum);
            }).hide()
        };

        updateList(modal, pageActions, results, pagination, list, checks, PAGINATE_FILTER, skip, text, checksSum);
    });

    controller.registerCall('icheques::antecipate::show', (data, checks, profile, filterReference = true, forceApprove = false) => controller.call('geolocation', geoposition => {
        const {revenue} = profile;

        let banks = $('BPQL > body > fidc', data).filter((i, element) => !!parseInt($(element).children('company').children('status').text()));

        const validBankReferences = $();

        /* https://trello.com/c/FSOYf1yH/163-cadastro-de-cliente-exclusivo-a-1-fundo-so */
        if (filterReference && commercialReference) {
            _.each(commercialReference.split(','), reference => {
                banks.each((i, element) => {
                    const cnpj = $('cnpj', element).text().replace(/[^\d]/g, '');
                    const referenceCNPJ = reference.replace(/[^\d]/g, '');
                    if ($('username', element).text() == reference ||
                        (cnpj && referenceCNPJ && cnpj == referenceCNPJ)) {
                        validBankReferences.push(element);
                        return false; /* loop break */
                    }
                });
            });
            if (validBankReferences.length) {
                banks = validBankReferences;
            }
        }

        banks = banks.filter((i, element) => {
            const approved = $(element).children('approvedCustomer').text() == 'true';
            const ask = $(element).children('ask').text() == 'true';
            const fromValue = $(element).children('fromValue');
            const toValue = $(element).children('toValue');

            if (approved) {
                return checks.length > 0;
            }

            if (fromValue.length) {
                let fromValueInt = parseInt(fromValue.text());
                if (fromValueInt && fromValueInt > revenue) {
                    return false;
                }
            }

            if (toValue.length) {
                let toValueInt = parseInt(toValue.text());
                if (toValueInt && toValueInt < revenue) {
                    return false;
                }
            }

            return !ask;
        });

        if (!banks.length) {
            controller.call('alert', {
                title: 'Não foi possível completar sua solicitação!',
                subtitle: 'Para antecipar créditos você precisa ter o seu perfil aprovado por um Parceiro Financeiro. Entre em contato com o suporte: (11) 3661-4657.'
            });
            return;
        }

        if (!validBankReferences.length) {
            if (!geoposition) {
                controller.call('alert', {
                    title: 'Não foi possível capturar sua solicitação!',
                    subtitle: 'Para antecipar você precisa habilitar a geolocalização no seu navegador. Entre em contato com o suporte: (11) 3661-4657.'
                });
                return;
            }
            banks = _.sortBy(_.filter(banks.toArray(), element => calculateDistance({
                lat: geoposition.coords.latitude,
                lon: geoposition.coords.longitude
            }, {
                lat: parseLocation(element, 'geocode > geometry > location > lat'),
                lon: parseLocation(element, 'geocode > geometry > location > lng')
            }) <= controller.confs.fidcDistance), element => calculateDistance({
                lat: geoposition.coords.latitude,
                lon: geoposition.coords.longitude
            }, {
                lat: parseLocation(element, 'geocode > geometry > location > lat'),
                lon: parseLocation(element, 'geocode > geometry > location > lng')
            }));

            if (!banks.length) {
                if (!banks.length) {
                    controller.call('alert', {
                        title: 'Não foi possível encontrar um parceiro antecipador!',
                        subtitle: 'Sinto muito mas não há parceiros iCheques na sua região.',
                        paragraph: 'Tente novamente em alguns dias. Caso já tenha um parceiro na região entre em contato com o nosso suporte: (11) 3661-4657.'
                    });
                    return;
                }
            }
        }

        if (!_.filter(banks, element => $(element).children('approvedCustomer').text() === 'true').length || forceApprove) {
            const modal = controller.call('modal');
            modal.gamification('accuracy');
            modal.title('Aprovação dos Fundos');
            modal.subtitle('O cadastro deve ser aprovado em até 7 dias.');
            modal.addParagraph('Você receberá um e-mail em sua caixa de entrada indicando a decisão do fundo.');

            const form = modal.createForm();
            const list = form.createList();
    
            _.each(banks, element => {

                const listItem = list.add('fa-spinner fa-spin', [
                    $('company > nome', element).text() || $('company > responsavel', element).text() || $('company > username', element).text(),
                    $(element).children('bio').text(),
                ]);

                controller.server.call('INSERT INTO \'ICHEQUES\'.\'FIDC\'', controller.call('error::ajax', {
                    data: {
                        username: $('company > username', element).text()
                    },
                    error: () => listItem
                        .find('.fa-spinner.fa-spin')
                        .removeClass('fa-spin')
                        .removeClass('fa-spinner')
                        .addClass('fa-ban'),
                    success: () => listItem
                        .find('.fa-spinner.fa-spin')
                        .removeClass('fa-spin')
                        .removeClass('fa-spinner')
                        .addClass('fa-check'),
                }));
            });

            const actions = modal.createActions();
            actions.cancel(null, 'Sair');

            return;
        }

        /* fim */

        const modal = controller.call('modal');
        modal.title('Factorings iCheques');
        modal.subtitle('Relação de Factorings iCheques');
        modal.addParagraph('Selecione a Factoring iCheques que deseja enviar sua carteira de cheques.');

        const form = modal.createForm();
        const list = form.createList();

        _.each(banks, element => {
            const approved = $(element).children('approvedCustomer').text() === 'true';

            list.add('fa-share', [
                $('company > nome', element).text() || $('company > responsavel', element).text() || $('company > username', element).text(), !approved ?
                    'Solicitar Aprovação' :
                    `${numeral($(element).children('interest').text().replace(',', '.')).format('0.00%')} / ${numeral(parseInt($(element).children('limit').text()) / 100).format('$0,0.00')}`,
                `${$('company > endereco > node:eq(4)', element).text()} / ${$('company > endereco > node:eq(6)', element).text()} - ${geoposition ? `${numeral(calculateDistance({
                    lat: geoposition.coords.latitude,
                    lon: geoposition.coords.longitude
                }, {
                    lat: parseLocation(element, 'geocode > geometry > location > lat'),
                    lon: parseLocation(element, 'geocode > geometry > location > lng')
                })).format('0,0')} metros` : ''}`,
                $(element).children('bio').text(),
            ]).click(e => {
                if (!approved) {
                    controller.call('icheques::antecipate::allow', data, element);
                } else {
                    controller.call('icheques::antecipate::fidc', data, element, checks);
                }
                modal.close();
            });
        });

        list.element().find('li:first div:last').css({
            width: '185px'
        });

        const actions = modal.createActions();

        actions.add('Sair').click(e => {
            e.preventDefault();
            modal.close();
        });

        actions.add('Pesquisar Factorings').click(e => {
            e.preventDefault();
            controller.call('icheques::antecipate::show', data, checks, profile, filterReference, true);
        });

        if (validBankReferences.length) {
            actions.observation('Opera com mais algum fundo? <br />Entre em contato com o suporte.').css({
                display: 'block',
                'font-size': '12px',
                'line-height': '14px'
            });
        }
    }));

    const companyData = (paragraph, element) => {
        const phones = $('<ul />').addClass('phones');
        $('company > telefone > node', element).each((idx, node) => {
            const get = idx => $(`node:eq(${idx.toString()})`, node).text();

            const phoneNumber = `Telefone: (${get(0)}) ${get(1)}${get(2).length ? `#${get(2)}` : ''} - ${titleCase(get(4))}`;
            phones.append($('<li />').text(phoneNumber));
        });

        const emails = $('<ul />').addClass('emails');
        $('company > email > node', element).each((idx, node) => {
            const emailAddress = `E-mail: ${$('node:eq(0)', node).text()} - ${titleCase($('node:eq(1)', node).text())}`;
            emails.append($('<li />').text(emailAddress));
        });

        const get = idx => $(`endereco node:eq(${idx.toString()})`, element).text();

        const address = `${get(0)} ${get(1)} ${get(2)} ${get(3)} - ${get(5)} ${get(4)} ${get(6)} `;

        const addressNode = $('<p />').text(address).addClass('address').append($('<a />').attr({
            href: `http\:\/\/maps.google.com\?q\=${encodeURI(address)}`,
            target: '_blank'
        }).append(
            $('<div />').addClass('map').css({
                'background-image': `url(http\:\/\/maps.googleapis.com/maps/api/staticmap?center=${encodeURI(address)}&zoom=13&scale=false&size=600x200&maptype=roadmap&format=png&visual_refresh=true&key=${encodeURI(controller.confs.maps)})`
            })
        ));

        paragraph.append(emails).append(phones).append(addressNode);
        return [emails, phones, addressNode];
    };

    controller.registerCall('icheques::antecipate::allow', (data, element) => {
        let modal = controller.modal();

        modal.gamification('sword').css({
            background: `url(${$(element).children('logo').text()}) no-repeat center`
        });
        modal.title($('company > nome', element).text() || $('company > responsavel', element).text());
        modal.subtitle($('company > cnpj', element).text() ?
            `CNPJ ${CNPJ.format($('company > cnpj', element).text())}` :
            `CPF ${CPF.format($('company > cpf', element).text())}`);

        const paragraph = modal.paragraph($(element).children('bio').text());
        modal.paragraph('A liberação da antecipadora pode ocorrer em até 7 dias úteis.');
        companyData(paragraph, element);
        const form = modal.createForm();
        form.element().submit(e => {
            e.preventDefault();
            controller.server.call('INSERT INTO \'ICHEQUES\'.\'FIDC\'',
                controller.call('error::ajax', {
                    data: {
                        username: $('company > username', element).text()
                    },
                    success: () => {
                        controller.alert({
                            icon: 'pass',
                            title: 'Seu cadastro foi enviado a antecipadora!',
                            subtitle: 'O cadastro deve ser aprovado em até 7 dias.',
                            paragraph: 'Você receberá um e-mail em sua caixa de entrada indicando a decisão do fundo.'
                        });
                    },
                    complete: () => {
                        modal.close();
                    }
                }));
        });
        form.addSubmit('send', 'Solicitar Aprovação');
        modal.createActions().cancel();
    });

    controller.registerCall('icheques::antecipate::fidc', (data, element, checks, profile) => {
        const modal = controller.modal();

        if ((hasProcessingOnes && $(element).find('processingOnes').text() != 'true') ||
            (hasOtherOccurrences && $(element).find('otherOccurrences').text() != 'true') ||
            (hasBlockedBead && $(element).find('blockedBead').text() != 'true')) {
            controller.call('alert', {
                title: 'Antecipar apenas cheques bons.',
                subtitle: 'Antecipação apenas de cheques regulares.',
                paragraph: 'Você só pode antecipar cheques bons. Entre em contato com a antecipadora em questão para poder antecipar outros tipos de cheques.',
            });

            return;
        }

        modal.gamification('sword').css({
            background: `url(${$(element).children('logo').text()}) no-repeat center`
        });
        modal.title($('company > nome', element).text() || $('company > responsavel', element).text());
        modal.subtitle($('company > cnpj', element).text() ?
            `CNPJ ${CNPJ.format($('company > cnpj', element).text())}` :
            `CPF ${CPF.format($('company > cpf', element).text())}`);

        const paragraph = modal.paragraph($(element).children('bio').text());

        companyData(paragraph, element);

        const form = modal.createForm();
        form.addSubmit('send', 'Antecipar');
        form.element().submit(e => {
            e.preventDefault();
            modal.close();
            controller.call('confirm', {
                title: 'Você deseja realmente antecipar estes títulos?',
                subtitle: 'Será enviado um e-mail para factoring solicitando aprovação.',
                paragraph: 'Os cheques não poderão serem processados novamente, você deverá aguardar a aprovação ou rejeição. A factoring reserva o direito de aceitar apenas alguns títulos de sua carteira.'
            }, () => {
                e.preventDefault();
                controller.serverCommunication.call('INSERT INTO \'ICHEQUES\'.\'ANTECIPATE\'',
                    controller.call('error::ajax', controller.call('loader::ajax', {
                        method: 'POST',
                        data: {
                            factoring: $('company > username', element).text(),
                            checks: _.pluck(checks, 'cmc').join(',')
                        },
                        success: function() {
                            controller.call('alert', {
                                icon: 'pass',
                                title: 'Seus cheques foram enviados.',
                                subtitle: 'Aguarde a resposta do fundo em seu e-mail.',
                                paragraph: 'Os cheques continuarão em sua carteira do iCheques até que a antecipadora de cheques aceite a operação.'
                            });
                        }
                    })));
            });
        });

        modal.createActions().cancel();
    });

    controller.registerCall('icheques::register::all::show', profile => {
        controller.serverCommunication.call('SELECT FROM \'ICHEQUESFIDC\'.\'LIST\'',
            controller.call('loader::ajax', controller.call('error::ajax', {
                data: {
                    approved: 'true'
                },
                success: function(ret) {
                    controller.call('icheques::antecipate::show', ret, [], profile);
                }
            })));
    });
};
