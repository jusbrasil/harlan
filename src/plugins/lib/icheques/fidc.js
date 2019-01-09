import async from 'async';
import browserImageSize from 'browser-image-size';
import _ from 'underscore';
import fileReaderStream from 'filereader-stream';
import concat from 'concat-stream';
import MarkdownIt from 'markdown-it';
import { CMC7Parser } from './cmc7-parser';
import { titleCase } from 'change-case';
import { CPF, CNPJ } from 'cpf_cnpj';
import fdicPrint from './print/fidc.js';

const FIDC = /(^|\s)antec?i?p?a?d?o?r?a?(\s|$)/i;
const TEST_ITIT_EXTENSION = /\.itit/i;

module.exports = controller => {

    let globalReport = null;

    const companyData = (paragraph, {telefone, email, endereco}) => {
        const phones = $('<ul />').addClass('phones');
        _.each(telefone, phone => {
            if (!phone[0])
                return;
            const phoneNumber = `Telefone: (${phone[0]}) ${phone[1]}${phone[2].length ? `#${phone[2]}` : ''} - ${titleCase(phone[4])}`;
            phones.append($('<li />').text(phoneNumber));
        });

        const emails = $('<ul />').addClass('emails');
        _.each(email, node => {
            if (!node[0])
                return;
            const emailAddress = `E-mail: ${node[0]} - ${titleCase(node[1])}`;
            emails.append($('<li />').text(emailAddress));
        });

        const address = `${endereco[0] || ''} ${endereco[1] || ''} ${endereco[2] || ''} ${endereco[3] || ''} - ${endereco[5] || ''} ${endereco[4] || ''} ${endereco[6] || ''}`;

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

    controller.registerTrigger('call::authentication::loggedin', 'icheques::father::fidc', (args, callback) => {
        callback();
        controller.server.call('SELECT FROM \'ICHEQUES\'.\'MyFatherFIDC\'', {
            dataType: 'json',
            success: ret => {
                controller.confs.ccf = !!ret;
            },
            error: () => {
                controller.confs.ccf = false;
            }
        });
    });

    controller.registerTrigger('call::authentication::loggedin', 'icheques::fidc', (args, callback) => {
        callback();
        controller.server.call('SELECT FROM \'ICHEQUESFIDC\'.\'STATUS\'', {
            success: ret => {
                const id = $('BPQL > body > fidc > _id', ret);
                if (!id.length) {
                    if (globalReport) globalReport.element().remove();
                    return;
                }

                controller.confs.ccf = true;

                const expireNode = $('BPQL > body > fidc > expire', ret);
                const expire = expireNode.length ? moment.unix(parseInt(expireNode.text())) : null;

                controller.call('icheques::fidc::status', {
                    _id: id.text(),
                    expire,
                    created: moment.unix(parseInt($('BPQL > body > fidc > created', ret).text())),
                    approved: $('BPQL > body > fidc > approved', ret).text() === 'true',
                    bio: $('BPQL > body > fidc > bio', ret).text(),
                    logo: $('BPQL > body > fidc > logo', ret).text(),
                    expired: expire ? moment().diff(expire) > 0 : true
                });
            }
        });
    });

    controller.registerCall('icheques::fidc::status', ({approved, expired, bio, logo}) => {
        const report = controller.call('report');
        if (approved && expired) {
            report.title('Seu cadastro de antecipador está expirado.');
            report.subtitle('Infelizmente você não poderá receber novas operações.');
            report.paragraph('Renove seu cadastro de antecipador clicando no botão abaixo, é um custo de R$ 900 (novecentos reais) para mais um mês de operações.');
            report.button('Renovar Cadastro', () => {
                controller.call('credits::has', 900000, () => {
                    controller.server.call('UPDATE \'ICHEQUESFIDC\'.\'RENEW\'',
                        controller.call('error::ajax', controller.call('loader::ajax', {
                            success: () => {
                                controller.call('alert', {
                                    icon: 'pass',
                                    title: 'Pronto! Agora você pode operar por mais 1 mês.',
                                    subtitle: 'Seu usuário já pode receber novos arquivos para antecipação.',
                                    paragraph: 'Parabéns! Você renovou por mais 1 (um) mês a assinatura para fundos de antecipação iCheques.'
                                });
                            }
                        }, true)));
                });
            });
            report.gamification('fail');
        } else if (approved) {
            report.title('Pronto! Seu FIDC/Factoring está configurado!');
            report.subtitle('Essa conta está habilitada para receber operações. Bons negócios!');
            report.paragraph(bio);

            const timeline = report.timeline(controller);

            const showing = {};

            const show = value => {
                if (showing[value.company.username]) {
                    showing[value.company.username].remove();
                }

                if (value.approved === false) {
                    return;
                }

                const emails = _.filter(value.company.email, element => element[1] == 'financeiro');
                let companyElement = Object.assign({
                    document: value.company.cnpj || value.company.cpf,
                    endereco: value.company.endereco[0],
                    zipcode: value.company.endereco[5],
                    numero: value.company.endereco[1],
                    complemento: value.company.endereco[2],
                    estado: value.company.endereco[6],
                    cidade: value.company.endereco[4],
                    email: emails.length ? emails[0][0] : 0,
                }, value.profile, {companyName: value.company.nome || value.company.responsavel || value.company.username});
                const t = timeline.add(value.created, `Cadastro do ${value.company.nome || value.company.responsavel || value.company.username}${ !value.approved ? ' para aprovação.' : ''}`, !value.approved ? 'O cadastro em 7 dias será automáticamente rejeitado.' : 'O cadastro se encontra operante, o cliente pode enviar carteiras de cheques.', [
                    ['fa-user', 'Informações', () => {
                        controller.call('icheques::fidc::company::view', companyElement);
                    }],
                    ['fa-print', 'Imprimir', () => {

                        let printData = Object.assign({}, companyElement);
                        printData.document = CNPJ.format(printData.document);
                        printData.revenue = numeral(printData.revenue).format('$0,0.00');
                        printData.preBilling = numeral(printData.preBilling).format('$0,0.00');
                        printData.totalPayroll = numeral(printData.totalPayroll).format('$0,0.00');
                        printData.locationValue = numeral(printData.locationValue).format('$0,0.00');
                        printData.monthCheckAmmount = numeral(printData.monthCheckAmmount).format('$0,0.00');
                        printData.avgCheckAmmount = numeral(printData.avgCheckAmmount).format('$0,0.00');
                        printData.ownProperty = ['Próprio', 'Alugado'][printData.ownProperty];
                        printData.bulk = ['Concentrados', 'Pulverizados', 'Mistura de ambos'][printData.bulk];
                        printData.ownSend = ['Não Possuo', 'Própria', 'Terceirizada', 'Própia e Terceirizada'][printData.ownSend];
                        printData.checkLiquidity = numeral(printData.checkLiquidity).format('0.00%');

                        let render = Mustache.render(fdicPrint, printData);
                        let html =  new MarkdownIt().render(render);
                        let printWindow = window.open('about:blank', '', '_blank');

                        if (!printWindow) return;
                        html += `<style>${require('./reports/print-style')}</style>`;
                        printWindow.document.write(html);
                        printWindow.focus();
                        printWindow.print();
                    }],
                    [!value.approved ? 'fa-check' : 'fa-edit', !value.approved ? 'Aceitar' : 'Editar', () => {
                        controller.confirm({}, () => controller.call('icheques::fidc::allowedCompany::edit', value, t));
                    }],
                    ['fa-times', 'Recusar', () => {
                        controller.confirm({}, () => {
                            let modal = controller.call('modal');
                            modal.title('Motivo de Rejeição');
                            modal.subtitle('Insira o motivo do cadastro estar sendo recusado.');
                            modal.paragraph('Para poder continuar insira o motivo do cadastro estar sendo recusado.');
                            let form = modal.createForm();
                            let reason = form.addTextarea('reason', 'Por qual motivo o cadastro está sendo recusado?');
                            form.addSubmit('send', 'Recusar');
                            form.element().submit(e => {
                                e.preventDefault();
                                if (!reason.val().length) {
                                    return /* void */;
                                }
                                modal.close();
                                controller.server.call('UPDATE \'ICHEQUESFIDC\'.\'ALLOWEDCOMPANYS\'', {
                                    dataType: 'json',
                                    data: {
                                        id: value._id,
                                        approved: false,
                                        reason: reason.val(),
                                        interest: 0,
                                        limit: 0
                                    },
                                    success: () => {
                                        t.remove();
                                    }
                                });
                            });
                            modal.createActions().cancel();
                        });
                    }],
                ]);
                showing[value.company.username] = t;
            };

            controller.registerTrigger('serverCommunication::websocket::ichequesFIDCPermissionUpdate', 'fidc', (data, cb) => {
                cb();
                show(data);
            });
            controller.registerTrigger('serverCommunication::websocket::ichequesFIDCPermission', 'fidc', (data, cb) => {
                cb();
                show(data);
            });

            controller.server.call('SELECT FROM \'ICHEQUESFIDC\'.\'ALLOWEDCOMPANYS\'', {
                dataType: 'json',
                success: ret => {
                    _.each(ret, value => {
                        show(value);
                    });
                }
            });

            report.gamification('pass').css({
                background: `url(${logo}) no-repeat center`
            });

            controller.server.call('SELECT FROM \'ICHEQUESFIDC\'.\'OPERATIONS\'',
                controller.call('error::ajax', controller.call('loader::ajax', {
                    success: ret => {
                        $('BPQL > body > antecipate', ret).each((idx, node) => {
                            const args = {
                                _id: $(node).children('_id').text(),
                                cmcs: [],
                                company: {
                                    nome: $('company > nome', node).text(),
                                    username: $('company > username', node).text(),
                                    cpf: $('company > cpf', node).text(),
                                    cnpj: $('company > cnpj', node).text(),
                                    approved: $('approved', node).text(),
                                    contractAccepted: $('company > contractAccepted', node).text() === 'true',
                                    status: parseInt($('company > status', node).text()),
                                    responsavel: $('company > responsavel', node).text(),
                                    contrato: [
                                        $('company > contrato > node:eq(0)', node).text(),
                                        $('company > contrato > node:eq(1)', node).text(),
                                        $('company > contrato > node:eq(2)', node).text(),
                                        $('company > contrato > node:eq(3)', node).text(),
                                        $('company > contrato > node:eq(4)', node).text(),
                                        $('company > contrato > node:eq(5)', node).text(),
                                    ],
                                    endereco: [
                                        $('company > endereco > node:eq(0)', node).text(),
                                        $('company > endereco > node:eq(1)', node).text(),
                                        $('company > endereco > node:eq(2)', node).text(),
                                        $('company > endereco > node:eq(3)', node).text(),
                                        $('company > endereco > node:eq(4)', node).text(),
                                        $('company > endereco > node:eq(5)', node).text(),
                                        $('company > endereco > node:eq(6)', node).text(),
                                    ],
                                    email: [],
                                    telefone: []
                                },
                                created: moment.unix(parseInt($(node).children('created').text()))
                            };

                            $('cmcs node', node).each((idx, cmc) => {
                                args.cmcs.push($(cmc).text());
                            });

                            $('company telefone node', node).each((idx, phone) => {
                                args.company.telefone.push([
                                    $('node:eq(0)', phone).text(),
                                    $('node:eq(1)', phone).text(),
                                    $('node:eq(2)', phone).text(),
                                    $('node:eq(3)', phone).text(),
                                    $('node:eq(4)', phone).text(),
                                ]);
                            });

                            $('company email node', node).each((idx, email) => {
                                args.company.email.push([
                                    $('node:eq(0)', email).text(),
                                    $('node:eq(1)', email).text()
                                ]);
                            });

                            controller.call('icheques::fidc::operation::decision', args);
                        });
                    }
                })));

            controller.registerTrigger('serverCommunication::websocket::ichequesFIDCOperation', 'open', (args, call) => {
                call();
                args.created = moment.unix(args.created);
                controller.call('icheques::fidc::operation::decision', args);
            });

        } else {
            report.title('Seu cadastro de antecipador ainda não foi aprovado.');
            report.subtitle('Infelizmente ainda não é possível receber carteiras de cheques.');
            report.paragraph('Nosso prazo para validação de antecipadores parceiros é de até 7 dias úteis. Certifique que você atendeu a todas as ligações e leu todos seus e-mails, podemos entrar em contato a qualquer momento.');
            report.gamification('fail');
        }

        if (!globalReport) {
            $('.app-content').prepend(report.element());
        } else {
            globalReport.replaceWith(report.element());
        }
        globalReport = report.element();
    });

    controller.registerTrigger('serverCommunication::websocket::ichequeFIDC', 'update', (data, cb) => {
        cb();
        data.created = moment.unix(data.created);
        if (data.expire) {
            data.expire = moment.unix(data.expire);
        }
        data.expired = data.expire ? moment().diff(data.expire) > 0 : true;
        controller.call('icheques::fidc::status', data);
    });

    controller.registerTrigger('findDatabase::instantSearch', 'icheques::fidc::configure', (args, callback) => {
        callback();

        const [text, autocomplete] = args;

        if (!FIDC.test(text)) {
            return;
        }

        autocomplete.item('Antecipadora',
            'Configurar Antecipadora',
            'Habilite seu fundo a receber títulos do iCheques')
            .addClass('icheque').click(e => {
                e.preventDefault();
                controller.call('fidc::configure');
            });
    });

    controller.registerCall('fidc::configure', () => {
        controller.call('billingInformation::need', () => {
            const modal = controller.call('modal');
            const gamification = modal.gamification('moneyBag');
            let logoImage = null;

            modal.title('Configurar Antecipadora');
            modal.subtitle('Comece já a receber títulos do iCheques');
            modal.paragraph('Configurando sua antecipadora você passa a receber cheques de nossos clientes e parceiros, seu perfil estará sujeito a avaliação cadastral.');
            const form = modal.createForm();
            const logo = form.addInput('logo', 'file', 'Logomarca - 150x150');
            const multifield = form.multiField();

            const fromValue = form.addInput('value-from', 'input', 'De Faturamento (R$)', {
                append : multifield,
                labelPosition : 'before',
            }, 'De Faturamento (R$)').mask('000.000.000.000.000,00', {reverse: true}).magicLabel();

            const toValue = form.addInput('value-to', 'input', 'Até Faturamento (R$)', {
                append : multifield,
                labelPosition : 'before',
            }, 'Até Faturamento (R$)').mask('000.000.000.000.000,00', {reverse: true}).magicLabel();

            const bio = form.addTextarea('about', 'História da Empresa (200 caracteres)').attr({
                maxlength: 200
            });

            logo.on('change', () => {
                const file = event.target.files[0];
                if (!file.type.match(/image/)) {
                    toastr.warning(`O arquivo ${file.name} não é uma imagem.`, `A extensão enviada é ${file.type}.`);
                    return;
                }
                browserImageSize(file).then(size => {
                    const scale = 150 / size[size.height > size.width ? 'height' : 'width'];
                    const fileReader = new FileReader();

                    const canvas = document.createElement('canvas');
                    canvas.height = 150;
                    canvas.width = 150;

                    const canvasContext = canvas.getContext('2d');
                    const reader = new FileReader();

                    reader.onload = ({target}) => {
                        const image = new Image();
                        image.onload = () => {
                            canvasContext.drawImage(image, 0, 0, size.width * scale, size.height * scale);
                            logoImage = canvas.toDataURL('image/png');
                            gamification.css({
                                background: `url(${logoImage}) no-repeat center`
                            });
                        };
                        image.src = target.result;
                    };
                    reader.readAsDataURL(file);
                });
            });

            form.addSubmit('send', 'Continuar');
            form.element().submit(e => {
                e.preventDefault();

                const fromValueInput = numeral(fromValue.val()).value();
                const toValueInput =  numeral(toValue.val()).value();

                if (fromValueInput && toValueInput && fromValueInput >= toValueInput) {
                    toastr.warning('O valor inicial de faturamento é superior ou igual ao valor final.',
                        'Verifique as configurações de valor informadas.');
                    return;
                }

                if (!logoImage || bio.val().replace(/s+/, ' ').length < 100) {
                    toastr.warning('O campo história da empresa deve ter ao menos 100 caracteres e o logo deve estar preenchido.',
                        'Verifique o formulário e tente novamente.');
                    return;
                }

                modal.close();
                controller.call('confirm', {
                    title: 'Você aceita com o contrato de serviço?',
                    subtitle: 'Para continuar é necessário que você aceite o contrato de serviço desta ferramenta.',
                    paragraph: 'o contrato de serviço estão disponíveis <a target=\'_blank\' href=\'/legal/icheques/MINUTA___CONTRATO__ANTECIPADORA_DE_CHEQUES.pdf\' title=\'contrato de serviço\'>neste link</a>, após a leitura clique em confirmar para acessar sua conta. O aceite é fundamental para que possamos disponibilizar todos os nossos serviços e você assim desfrutar de todos os benefícios iCheques.',
                    confirmText: 'Aceitar'
                }, () => {
                    controller.call('billingInformation::need', () => {
                        controller.server.call('INSERT INTO \'ICHEQUESFIDC\'.\'COMPANY\'', controller.call('error::ajax', controller.call('loader::ajax', {
                            method: 'POST',
                            data: {
                                bio: bio.val(),
                                logo: logoImage,
                                fromValue: fromValueInput,
                                toValue: toValueInput
                            },
                            success: () => {
                                controller.call('alert', {
                                    icon: 'pass',
                                    title: 'Parabéns! Aguarde seu e-mail pela nossa aprovação.',
                                    subtitle: 'Assim que aprovado seu cadastro você já poderá transacionar com nossos clientes e parceiros.',
                                    paragraph: 'O nosso prazo é de 7 (sete) dias úteis, mas de repente podemos aprovar antes.'
                                });
                            }
                        }, true)));
                    });
                });
            });
            modal.createActions().cancel();
        }, ret => {
            if (!$('BPQL > body > company > cnpj', ret).text().length) {
                toastr.warning('É necessário um CNPJ de faturamento para poder continuar.',
                    'Você não possui um CNPJ no cadastro.');
                return false;
            }
            return true;
        });
    });

    controller.registerTrigger('admin', 'icheques', (args, callback) => {
        callback();

        controller.server.call('SELECT FROM \'ICHEQUESFIDC\'.\'LIST\'', {
            data: {
                approved: 'false'
            },
            success: ret => {
                controller.call('icheques::fidc::enable::xml', ret);
            }
        });

        controller.registerCall('icheques::fidc::enable::xml', ret => {
            const elements = [];

            $('fidc', ret).each((idx, node) => {
                elements.push(controller.call('icheques::fidc::enable', {
                    bio: $(node).children('bio').text(),
                    _id: $(node).children('_id').text(),
                    logo: $(node).children('logo').text(),
                    name: $('company nome', node).text() || $('company reponsabel', ret).text(),
                    creation: moment.unix(parseInt($(node).children('creation').text())),
                    responsible: $(node).children('bio'),
                }));
            });

            return elements;
        });

        controller.registerCall('icheques::fidc::enable', ({bio, name, _id, logo}) => {
            const report = controller.call('report',
                'Deseja habilitar a empresa?',
                'Ao habilitar a empresa você permite que todos os clientes iCheques possam enviar suas operações.',
                bio);
            report.label(`Empresa: ${name}`);
            report.button('Habilitar Fundo', () => {
                controller.call('confirm', {}, () => {
                    controller.server.call('UPDATE \'IChequesFIDC\'.\'Approve\'',
                        controller.call('loader::ajax', controller.call('error::ajax', {
                            data: {
                                fidc: _id
                            },
                            success: ret => {
                                controller.call('alert', {
                                    icon: 'pass',
                                    title: 'Antecipadora aprovada com sucesso.',
                                    subtitle: 'A antecipadora foi aprovada e já pode ser utilizada pelos clientes e parceiros iCheques.',
                                    paragraph: 'Um e-mail foi enviado avisando da aprovação.'
                                });
                                report.close();
                            }
                        }), true));
                });
            });
            report.gamification('pass').css({
                background: `url(${logo}) no-repeat center`
            });
            $('.app-content').prepend(report.element());
            return report;
        });

        controller.registerTrigger('serverCommunication::websocket::ichequeFIDC::admin', 'admin', (data, cb) => {
            cb();
            data.name = data.company.nome || data.company.responsavel;
            controller.call('icheques::fidc::enable', data);
        });

    });

    const getFiles = inputFile => {
        let files = inputFile.get(0).files;

        if (files.length) {
            for (let file = 0; file < files.length; file++) {
                if (!TEST_ITIT_EXTENSION.test(files[file].name)) {
                    throw 'A extensão recebida do arquivo não confere!';
                }
            }
        }

        return files;
    };

    const parseReceipt = ({cmcs}, files, cb) => {
        let obj = {
            file: '',
            equity: 0,
            taxes: 0,
            checkNumbers: []
        };

        if (!files.length) {
            obj.checkNumbers = cmcs.join(',');
            obj.operation = moment().format('DDMMYYYY');
            cb(obj);
            return;
        }

        const queue = async.queue((file, cb) => {
            fileReaderStream(file).pipe(concat(buffer => {
                obj.file += buffer.toString();
                const lines = buffer.toString().split('\r\n');
                for (let line of lines) {
                    let data = line.split(';');
                    switch (data[0]) {
                    case 'B':
                        obj.operation = data[4];
                        break;
                    case 'C':
                        obj.equity += data[14];
                        obj.taxes += data[21];
                        break;
                    case 'T':
                        if (data[1] === '') {
                            break;
                        }
                        for (let idx in cmcs) {
                            let cmc = cmcs[idx];
                            if (!cmc) {
                                continue;
                            }
                            if (new CMC7Parser(cmc).number == data[2]) {
                                obj.checkNumbers.push(cmc);
                                cmcs[idx] = null;
                                break;
                            }
                        }
                        break;
                    }
                }
                cb();
            }));
        });

        queue.drain = () => {
            obj.checkNumbers = obj.checkNumbers.join(',');
            cb(obj);
        };

        queue.push(Array.from(files));
    };

    const askReceipt = (data, cb) => {
        const modal = controller.call('modal');

        modal.title('iCheques');
        modal.subtitle('Apresentação de Recibo da Operação');
        modal.addParagraph('Para finalizar a operação é necessário que você apresente o recibo no formato iTit (WBA).');

        const form = modal.createForm();
        const inputFile = form.addInput('fidc-file', 'file', 'Selecionar arquivo.', {}, 'Arquivo de Fundo FIDC').attr({
            multiple: 'multiple'
        });

        form.addSubmit('submit', 'Enviar').click(e => {
            e.preventDefault();
            try {
                parseReceipt(data, getFiles(inputFile), cb);
                modal.close();
            } catch (exception) {
                toastr.warning(exception);
                inputFile.addClass('error');
            }
        });
        modal.createActions().cancel();
    };

    controller.registerCall('icheques::fidc::operation::decision', args => {
        const report = controller.call('report');
        report.title('Carteira de Antecipação');
        report.subtitle('Visualização da Carteira Recebida');
        report.paragraph('Você recebeu uma carteira de cheques para antecipação. ' +
            'Para aceitar os cheques você deve encaminhar um arquivo .iTIT para geração de fatura e conclusão.');

        report.label(`Usuário\: ${args.company.username}`);
        report.label(`Documento\: ${args.company.cnpj ? CNPJ.format(args.company.cnpj) : CPF.format(args.company.cpf)}`);
        report.label(`Nome\: ${args.company.nome || args.company.responsavel || args.company.username}`);
        report.label(`Cheques\: ${args.cmcs.length}`);

        report.newAction('fa-print', () => {
            controller.server.call('SELECT FROM \'iChequesFIDC\'.\'OPERATION\'', controller.call('error::ajax', {
                data: {
                    id: args._id
                },
                success(ret) {
                    const storage = [];
                    $(ret).find('check').each(function() {
                        storage.push(controller.call('icheques::parse::element', this));
                    });

                    let sum = 0;
                    for (let check of storage) {
                        check.name = check.cpf || check.cnpj;
                        check.protesto = check.protesto || 0;
                        check.ccf = controller.confs.ccf ? (check.ccf || 0) : 'Não Informado';
                        check.expire = moment(check.expire, 'YYYYMMDD').format('DD/MM/YYYY');
                        check.number = new CMC7Parser(check.cmc).number;
                        sum += check.ammount;
                        check.ammount = numeral(check.ammount / 100.0).format('$0,0.00');
                    }

                    const doc = require('./reports/print');

                    const input = {
                        message: `Usuário\: ${args.company.username}, Documento\: ${args.company.cnpj ? CNPJ.format(args.company.cnpj) : CPF.format(args.company.cpf)}, Nome: ${args.company.nome || args.company.responsavel || args.company.username}`,
                        checks: storage,
                        soma: numeral(sum / 100.0).format('$0,0.00')
                    };

                    let render = Mustache.render(doc, input);
                    let html =  new MarkdownIt().render(render);
                    const printWindow = window.open('about:blank', '', '_blank');

                    if (!printWindow) return;
                    html += `<style>${require('./reports/print-style')}</style>`;
                    printWindow.document.write(html);
                    printWindow.focus();
                    printWindow.print();
                }
            }));
        });

        report.newAction('fa-cloud-download', () => {
            controller.server.call('SELECT FROM \'iChequesFIDC\'.\'OPERATION\'', controller.call('error::ajax', {
                data: {
                    id: args._id
                },
                success(ret) {
                    const storage = [];
                    $(ret).find('check').each(function() {
                        storage.push(controller.call('icheques::parse::element', this));
                    });
                    controller.call('icheques::ban::generate', {
                        values: storage
                    }, args.company);
                }
            }));
        });

        report.newAction('fa-folder-open', () => {
            controller.server.call('SELECT FROM \'iChequesFIDC\'.\'OPERATION\'', controller.call('error::ajax', {
                data: {
                    id: args._id
                },
                success(ret) {
                    const storage = [];
                    $(ret).find('check').each(function() {
                        storage.push(controller.call('icheques::parse::element', this));
                    });
                    controller.call('icheques::show', storage, null, report.element());
                }
            }));
        });

        const sendAccept = (accept, obj) => {
            controller.confirm({}, () => {
                controller.server.call('UPDATE \'iChequesFIDC\'.\'Operation\'',
                    controller.call('error::ajax', controller.call('loader::ajax', {
                        data: Object.assign({
                            id: args._id,
                            approved: accept
                        }, obj),
                        method: 'POST',
                        success: () => {
                            report.close();
                        }
                    }, true)));
            });
        };

        let accept = accept => () => {
            if (accept) {
                askReceipt(args, obj => {
                    sendAccept(true, obj);
                });
                return;
            }
            let modal = controller.call('modal');
            modal.title('Qual o motivo da recusa?');
            modal.subtitle('Você precisa informar o motivo da recusa para continuar.');
            modal.paragraph('Ao informar seu cliente o motivo da recusa você evita discussões posteriores no telefone ou email.');
            let form = modal.createForm();
            let reason = form.addTextarea('textarea', 'Qual motivo da recusa?');
            form.addSubmit('continue', 'Recusar');
            form.element().submit(e => {
                e.preventDefault();
                modal.close();
                sendAccept(false, {
                    reason: reason.val()
                });
            });
        };

        report.newAction('fa-user', () => {
            const modal = controller.modal();
            modal.gamification('moneyBag');
            modal.title(args.company.nome || args.company.responsavel);
            modal.subtitle(args.company.cnpj ? `CNPJ ${CNPJ.format(args.company.cnpj)}` : `CPF ${CPF.format(args.company.cpf)}`);
            const paragraph = modal.paragraph('Dados cadastrais registrados sobre a empresa no sistema iCheques.');
            companyData(paragraph, args.company);
            modal.createActions().cancel();
        });
        report.button('Recusar Operação', accept(false));
        report.button('Aceitar Operação', accept(true));
        report.gamification('moneyBag');

        $('.app-content').append(report.element());
    });

    controller.registerCall('icheques::fidc::allowedCompany::edit', (value, t) => {
        const form = controller.call('form', formData => {
            if (!formData.processingOnes) delete formData.processingOnes;
            if (!formData.blockedBead) delete formData.blockedBead;
            if (!formData.otherOccurrences) delete formData.otherOccurrences;
            if (!formData.linkedAccount) delete formData.linkedAccount;
            formData.limit = Math.ceil(formData.limit * 100);
            controller.server.call('UPDATE \'ICHEQUESFIDC\'.\'ALLOWEDCOMPANYS\'', {
                dataType: 'json',
                data: Object.assign({
                    id: value._id,
                    approved: true
                }, formData),
                success: () => {
                    t.remove();
                }
            });
        });

        form.configure({
            title: 'Cadastro Completo',
            subtitle: 'Realize o cadastro completo de sua empresa.',
            paragraph: 'O cadastro completo permite a realização de operações de crédito.',
            gamification: 'star',
            screens: [{
                magicLabel: true,
                fields: [{
                    value: value.limit,
                    name: 'limit',
                    type: 'text',
                    placeholder: 'Limite (R$)',
                    labelText: 'Limite (R$)',
                    mask: '000.000.000.000.000,00',
                    maskOptions: {
                        reverse: true
                    },
                    numeral: true,
                    validate({element}) {
                        return numeral(element.val()).value() > 0;
                    }
                }, {
                    value: value.interest,
                    name: 'interest',
                    type: 'text',
                    placeholder: 'Taxa (%)',
                    labelText: 'Taxa (%)',
                    numeralFormat: '0.00%',
                    mask: '##0,99%',
                    maskOptions: {
                        reverse: true
                    },
                    numeral: true,
                    validate({element}) {
                        return numeral(element.val()).value() > 0;
                    }
                }, /*{
                    "value": value.otherOccurrences,
                    "checked": value.otherOccurrences,
                    "name": "other-occurrences",
                    "type": "checkbox",
                    "labelText": "Enviar Outras Ocorrências",
                    "optional": true,
                },*/ {
                    value: value.blockedBead,
                    checked: value.blockedBead,
                    name: 'blocked-bead',
                    type: 'checkbox',
                    labelText: 'Enviar Talão Bloqueado',
                    optional: true,
                }, {
                    value: value.processingOnes,
                    checked: value.processingOnes,
                    name: 'processing-ones',
                    type: 'checkbox',
                    labelText: 'Enviar em Processamento',
                    optional: true,
                }, {
                    value: value.linkedAccount,
                    checked: value.linkedAccount,
                    name: 'linked-account',
                    type: 'checkbox',
                    labelText: 'Linkar crédito',
                    optional: true,
                }, ]
            }]
        });
    });

};
