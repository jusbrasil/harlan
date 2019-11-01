module.exports = controller => {

    controller.registerCall('icheques::buyreader', cep => {
        controller.call('credits::has', 884000, () => {
            controller.call('icheques::buyreader::go', cep);
        });
    });

    controller.registerCall('icheques::buyreader::go', cep => {
        const form = controller.call('form', obj => {
            obj.cep = cep;
            controller.serverCommunication.call('SELECT FROM \'ICHEQUESBUYREADER\'.\'ACTION\'',
                controller.call('error::ajax', {
                    data: obj,
                    success() {
                        controller.call('alert', {
                            icon: 'pass',
                            title: 'Parabéns! Você comprou com sucesso a leitora Nonus HandbanK 10 USB.',
                            subtitle: 'Em 4 dias úteis sua leitora será entregue, também estamos ansiosos.'
                        });
                    }
                }));
        });

        form.configure({
            title: 'Endereço de Entrega',
            subtitle: 'Digite o endereço de entrega da leitora.',
            paragraph: 'Preencha abaixo os campos para que a leitora seja entregue.',
            nextButton: 'Adquirir',
            gamification : 'magicWand',
            screens: [{
                magicLabel: true,
                fields: [
                    {
                        name: 'nome',
                        optional: false,
                        type: 'text',
                        placeholder: 'Nome Completo'
                    },
                    {
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
                    },
                    {
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
                    },
                    {
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
            }
            ]
        });
    });

    if (!controller.confs.isCordova)
        controller.registerTrigger('call::authentication::loggedin', 'icheques::buy-reader', (args, callback) => {
            callback();

            if (localStorage.cmc7Reader) {
                return;
            }

            const report = controller.call('report',
                'Compre uma máquina de ler cheques!',
                'Se você trabalha com muitos cheques, chega de perder tempo.',
                'O iCheques é compatível com leitoras de cheques, não perca mais seu tempo digitando o CMC7 dos cheques, use uma leitora.',
                false);

            report.button('Comprar Leitora', () => {
                const modal = controller.call('modal');
                modal.title('Adquirir Leitora de Cheques');
                modal.subtitle('Nonus HandbanK 10 USB');
                modal.imageParagraph('/images/icheques/reader.jpg', 'O HandbanK 10 USB é um leitor semi-automático (com motorização) para pagamento de contas pela Internet (boletos bancários, contas de consumo como água, luz, telefone, etc), permitindo que você faça uma leitura do código de barras de sua conta com rapidez e sem erros de digitação. Se você ainda precisar capturar o CMC-7 dos cheques (custódia de cheques, desconto de cheques, consulta de cheques ou outra operação contratada junto ao seu banco), o HandbanK 10 agilizará e acrescentará mais segurança à captura.');
                modal.addParagraph('Chame um consultor nosso e faça seu \'test-drive\'! A leitora vai muito bem com o iCheques!').addClass('sellit');
                modal.addParagraph('É um leitor compacto, ideal para pequenos espaços, perfeito para uso em escritório. Não é necessária a instalação de softwares ou drivers no seu computador, basta conectá-lo a uma porta USB livre do seu computador. Ele é compatível com todos os bancos brasileiros que tenham Internet Banking.');
                const form = modal.createForm();
                const inputCep = form.addInput('cep', 'text', 'CEP').mask('00000-000');
                form.element().submit(e => {
                    e.preventDefault();
                    if (!inputCep.val()) {
                        toastr.warning('Preencha seu CEP para entrega.');
                        return;
                    }
                    modal.close();
                    controller.call('icheques::buyreader', inputCep.val());
                });
                form.addSubmit('submit', 'Adquirir por R$ 884,00');
                const actions = modal.createActions();
                actions.observation('Garantia de 12 meses');
                actions.observation('Entrega em 4 dias úteis');
                actions.add('Cancelar').click(e => {
                    e.preventDefault();
                    modal.close();
                });
            }).addClass('credithub-button');

            report.button('Já Tenho', () => {
                localStorage.cmc7Reader = true;
                report.close();
            }).addClass('gray-button');

            report.gamification('star');

            $('.app-content').prepend(report.element());

        });

};
