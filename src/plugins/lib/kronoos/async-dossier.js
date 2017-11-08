import VMasker from 'vanilla-masker';
import {CPF, CNPJ} from 'cpf_cnpj';
import {downloadPDF} from './parser.js';
import _ from "underscore";

const masks = ['999.999.999-99', '99.999.999/9999-99'];

module.exports = function(controller) {

    let report;
    let timeline;
    let dossiers = {};

    controller.registerCall("kronoos::async::new", () => controller.call("kronoos::contractAccepted::app", () => {
        let name;
        controller.call("form", data => controller.server.call("INSERT INTO 'DOSSIERKRONOOS'.'CAPTURE'", controller.call("error::ajax", {
            dataType: "json",
            data: Object.assign(data, {name: name}),
            success: () => toastr.success(`Um novo acompanhamento foi adicionado para o documento ${data.documento}`, "Em alguns instantes o dossiê será finalizado e as informações estarão a sua disposição")
        }))).configure({
            title: "Adicionar Acompanhamento",
            subtitle: "Preencha o formulário para acompanhar o dossiê Kronoos.",
            paragraph: "Uma vez preenchido o sistema acompanhará o target.",
            gamification: "star",
            screens: [
                {
                    magicLabel: true,
                    fields: [
                        {
                            name: "documento",
                            type: "text",
                            placeholder: "Documento do Target",
                            builder: (item) => {
                                const mask = () => {
                                    let v = item.element.val();
                                    item.element.val(VMasker.toPattern(v, masks[
                                        v.length > 14
                                            ? 1
                                            : 0
                                    ]));
                                };

                                item.element.on('paste', () => item.element.val(""));
                                item.element.on('focus', () => item.element.val(""));
                                item.element.on('keydown', mask);
                            },
                            validate: (item) => CPF.isValid(item.element.val()) || CNPJ.isValid(item.element.val()),
                            validateAsync: (callback, item) => controller.server.call("SELECT FROM 'BIPBOPJS'.'CPFCNPJ'", {
                                data: {
                                    documento: item.element.val()
                                },
                                success: data => {
                                    name = $("nome", data).text();
                                },
                                complete: () => callback(true)
                            })
                        }, {
                            name: "observation",
                            type: "text",
                            placeholder: "Observação do Target",
                            optional: true
                        }, {
                            name: "group",
                            type: "text",
                            placeholder: "Grupo do Target",
                            optional: true
                        }
                    ]
                }
            ]
        });
    }));

    function parseDossier(data) {
        let tlElement = timeline.add(
            data.lastResponse
            ? data.lastResponse.sec || data.lastResponse
            : data.created.sec || data.created,
        !data.lastResponse
            ? `Aguardando carregamento${data.name
                ? " para " + data.name
                : ""}, documento
                    ${ (
                    CPF.isValid(data.documento)
                    ? CPF
                    : CNPJ).format(data.documento)}.`
            : `Dossiê carregado${data.name
                ? " para " + data.name
                : ""}, documento
                    ${ (
                    CPF.isValid(data.documento)
                    ? CPF
                    : CNPJ).format(data.documento)}.`,
        data.lastResponse
            ? "O carregamento do dossiê foi finalizado com sucesso, nosso sistema processou com sucesso e gerou um PDF que pode ser baixado através do botão ao lado. Caso precise de um dossiê mais atualizado você pode solicitar clicando no botão refrescar ao lado deste registro."
            : "O dossiê solicitado está sendo processado e, assim que o carregamento estiver concluído, atualizaremos o registro automaticamente. Para sua comodidade, todas as atualizações são feitas automaticamente e sem a necessidade de recarregar a página em seu navegador. Caso esteja experienciando lentidão, entre em contato com nosso suporte técnico por meio do chat.",
        [
            data.lastResponse
                ? [
                    "fa-file-pdf-o", "Download do Dossiê", () => {
                        window.location = data.response;
                    }
                ]
                : [
                    "fa-spin fa-spinner", "Carregando o Dossiê", () => controller.alert({title: "O dossiê ainda não foi carregado no sistema", subtitle: "Aguarde a conclusão para poder continuar esta operação.", paragraph: "Os dossiês são preparados imediatamente, contanto podem levar alguns minutos para serem concluídos por causa da diversidade das fontes de informação."})
                ],
            [
                "fa-refresh", "Atualizar", () => controller.server.call("UPDATE 'PUSH'.'JOB'", controller.call("error::ajax", {
                    data: {
                        pushAt: moment().unix(),
                        id: data.push.$id.$id || data.push.$id || data.push
                    },
                    success: () => controller.alert({icon: 'pass', title: "Uma atualização do processo foi escalonada.", subtitle: "Aguarde alguns instantes enquanto a plataforma realiza a atualização do recurso.", paragraph: "Uma atualização demora em média 15 minutos, recomendamos voltar a plataforma para capturar o dossiê atualizado em instantes."})
                }))
            ],
            [
                "fa-trash-o", "Apagar", () => controller.call("confirm", {}, () => controller.server.call("DELETE FROM 'DOSSIERKRONOOS'.'CAPTURE'", {
                    dataType: 'json',
                    data: {
                        documento: data.documento
                    },
                    success: () => tlElement.remove()
                }))
            ]
        ]);
        return tlElement;
    }

    controller.registerTrigger("authentication::authenticated", "kronoos::async", (arg, cb) => {
        cb();
        if (report)
            report.close();
        report = controller.call("report", "Dossiês Kronoos Acompanhados", "Lista dos dossiês Kronoos acompanhados pela plataforma.", "Através deste módulo você fica sabendo em tempo real o que acontece na sua carteira de dossiês Kronoos, são informações que te ajudarão a entender sua base corporativa para compliance.", false);

        timeline = report.timeline(controller);

        controller.server.call("SELECT FROM 'DOSSIERKRONOOS'.'CAPTURE'", {
            dataType: "json",
            success: (data) => {
                dossiers = {};
                data.map(data => {
                    dossiers[data.documento] = parseDossier(data);
                });
            }
        });

        report.button("Adicionar Acompanhamento", () => controller.call("kronoos::async::new"));

        report.newAction("fa-play-circle", () => controller.interface.helpers.activeWindow(".kronoos-application"), "Pesquisa Kronoos");

        if (!controller.confs.kronoos.isKronoos) {
            report.newAction("fa-info-circle", () => window.open("https://www.kronoos.com"), "Sobre o Kronoos");
        }

        report.newAction("fa-filter", () => {
          var modal = controller.call("modal");
          modal.title("Filtro de Acompanhamentos");
          modal.subtitle("Escolha o filtro");

          var form = modal.createForm();
          let stringBuscada = form.addInput("stringBuscada", "text", "Palavra-chave para a pesquisa");
          form.addSubmit(null, "Mostrar todos os acompanhamentos").click((e) => {
            e.preventDefault();
            removerTodosOsAcompanhamentos();
            filtrar("todos", null);
            modal.close();
          });
          form.addSubmit(null, "Filtrar por observação").click((e) => {
            e.preventDefault();
            filtrar("observation", stringBuscada);
            modal.close();
          });
          form.addSubmit(null, "Filtrar por grupo").click((e) => {
            e.preventDefault();
            filtrar("group", stringBuscada);
            modal.close();
          });
          form.addSubmit(null, "Sair").click((e) => {
            e.preventDefault();
            modal.close();
          });
        }, "Filtrar Dossiês");

        function filtrar(tipoFiltro, palavraChave) {
          controller.server.call("SELECT FROM 'DOSSIERKRONOOS'.'CAPTURE'", {
            dataType: "json",
            success: (data) => {
              _.values(data).find((x) => {
                  if(tipoFiltro === "todos") {
                    controller.trigger("serverCommunication::websocket::dossierNew", x);
                  }
                  if(tipoFiltro === "observation") {
                    if(x.observation === palavraChave[0].value) {
                      dossiers[x.documento] = parseDossier(x);
                      controller.trigger("serverCommunication::websocket::dossierDelete", x);
                    } else {
                      controller.trigger("serverCommunication::websocket::dossierDelete", x);
                    }
                  }
                  if(tipoFiltro === "group") {
                    if(x.group === palavraChave[0].value) {
                      dossiers[x.documento] = parseDossier(x);
                      controller.trigger("serverCommunication::websocket::dossierDelete", x);
                    } else {
                      controller.trigger("serverCommunication::websocket::dossierDelete", x);
                    }
                  }
              });
            }
          });
        };

        function removerTodosOsAcompanhamentos() {
          $('div.app-content > div:first-child > div .content:last-child > ul').empty();
        };

        report.gamification("kronoos");
        $(".app-content").append(report.element());
    });

    controller.registerTrigger("serverCommunication::websocket::dossierNew", "dossierNew", (data, cb) => {
        cb();
        dossiers[data.documento] = parseDossier(data);
    });

    controller.registerTrigger("serverCommunication::websocket::dossierUpdate", "dossierUpdate", (data, cb) => {
        cb();
        let row = parseDossier(data);
        if (dossiers[data.documento]) {
            dossiers[data.documento].replaceWith(row);
        }
        dossiers[data.documento] = row;
    });

    controller.registerTrigger("serverCommunication::websocket::dossierDelete", "dossierDelete", (data, cb) => {
        cb();
        if (dossiers[data.documento]) {
            dossiers[data.documento].remove();
        }
    });

};
