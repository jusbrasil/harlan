import _ from 'underscore';
import { CPF, CNPJ } from 'cpf_cnpj';
import sprintf from 'sprintf';
import arrayToSentence from 'array-to-sentence';
import VMasker from 'vanilla-masker';

module.exports = (controller) => {

    var generateActions = (data, entity) => {

        let items = [
            ["fa-search", "Pesquisar", () => controller.call("socialprofile", entity.label)],
            ["fa-archive", "Histórico", () => controller.call("dive::history", entity)]
        ];


        if (data) {

            var update = (useful) => {
                return (obj) => {
                    obj.item.remove();
                    controller.server.call("UPDATE 'DIVE'.'EVENT'", {
                        dataType: "json",
                        type: "POST",
                        data: {
                            useful: useful,
                            id: entity._id
                        },
                        complete: () => {
                            getActions({
                                limit: 1,
                                skip: timeline.length()
                            });
                        }
                    });
                };
            };

            items.push(["fa-check", "Relevante", update(true)]);
            items.push(["fa-times", "Irrelevante", update(false)]);
        } else {
            items.push(['fa-trash', "Remover", (obj) => {
                obj.item.remove();
                controller.server.call("DELETE FROM 'DIVE'.'ENTITY'", {
                    dataType: "json",
                    type: "POST",
                    data: {
                        id: entity._id
                    },
                    complete: () => {
                        getActions({
                            limit: 1,
                            skip: timeline.length()
                        });
                    }
                });
            }]);

            items.push(['fa-list-alt', "Eventos", () => {
                var report = controller.call("report",
                    `Linha do Tempo para o Documento ${entity.label}`,
                    "Monitore de perto, e em tempo real, as ações de pessoas físicas e jurídicas.",
                    "Com essa ferramenta, informe-se em tempo real de todas as atividades de pessoas físicas e jurídicas de seu interesse. Saiba de tudo o que acontece e tenha avaliações de crédito imediatas, de forma contínua e precisa.");

                let timeline = report.timeline(controller);

                controller.server.call("SELECT FROM 'DIVE'.'EVENTS'", {
                    dataType: "json",
                    data: {
                        entity: entity._id
                    },
                    success: function(ret) {
                        for (let data of ret.events) {
                            timeline.add(data.created, data.title, data.description, generateActions(data, data.entity)).attr("data-entity", data.entity._id);
                        }
                    }
                });


                // controller.registerTrigger("serverCommunication::websocket::diveEvent", "diveEvent", (data, cb) => {
                //     cb();
                //     timeline.add(data.created, data.title, data.description, generateActions(data, data.entity)).attr("data-entity", data.entity._id);
                // });

                report.gamification("accuracy");
                $(".app-content").append(report.element());
                $(window).scrollTop(report.element().offset().top);
            }]);
        }

        return items;
    };


    controller.registerCall("dive::generateActions", generateActions);

    controller.registerTrigger("findDatabase::instantSearch", "dive::search::document", function(args, callback) {
        controller.server.call("SELECT FROM 'DIVE'.'ENTITYS'", {
            dataType: "json",
            data: {
                text: args[0],
                limit: 3
            },
            success: (data) => {
                let document;
                if (!data.count) return;
                for (let row of _.values(data.items)) {
                    document = CPF.isValid(row.label) ? CPF.format(row.label) : CNPJ.format(row.label);
                    args[1].item("Dive", "Abertura de Registro", sprintf("Nome: %s, Documento: %s", row.reduce.name, document))
                        .addClass("dive")
                        .click(e => {
                            e.preventDefault();
                            controller.call("dive::open", row);
                        });
                }
            },
            complete: () => callback()
        });
    });

    controller.registerCall("dive::open", (entity) => {
        var sectionDocumentGroup = controller.call("section", "Informações Cadastrais",
            `Informações cadastrais para o documento ${entity.label}`,
            "Dívida, telefone, endereço, e-mails e outras informações.");
        var [section, results, actions] = sectionDocumentGroup;
        $("html, body").scrollTop(section.offset().top);

        $(".app-content").prepend(section);

        controller.call("tooltip", actions, "Pesquisar").append($("<i />").addClass("fa fa-search"))
            .click(controller.click("socialprofile", entity.label, undefined, undefined, (report) => {
                report.element().append(section);
            }));


        for (let hyperlink of _.values(entity.hyperlink)) {
            controller.call("dive::plugin", hyperlink, {
                data: entity,
                section: sectionDocumentGroup
            });
        }

        controller.call("tooltip", actions, "Apagar").append($("<i />").addClass("fa fa-trash"))
            .click((e) => {
                controller.call("dive::delete", entity, () => {
                    section.remove();
                });
            });

        controller.call("tooltip", actions, "Histórico").append($("<i />").addClass("fa fa-archive"))
            .click((e) => {
                controller.call("dive::history", entity);
            });

        controller.call("tooltip", actions, "Informações Globais").append($("<i />").addClass("fa fa-database"))
            .click((e) => {
                e.preventDefault();
                for (let push of entity.push) {
                    controller.server.call("SELECT FROM 'PUSHDIVE'.'DOCUMENT'",
                        controller.call("loader::ajax", {
                            data: {
                                id: push.id
                            },
                            success: ret => results.prepend(controller.call("xmlDocument", ret))
                        }, true));
                }
            });

    });

    controller.registerCall("dive::entity::timeline", (timeline, entity) => {
        function stringTemEmpresaAcompanhamento() {
          let temEmpresa = entity.reduce.conclusions.hasCompany;
          if(temEmpresa) {
            if(entity.reduce.conclusions.totalCompany === 1) {
                return `possui relação societária com 1 CNPJ`;
            }
            return `possui relações societárias com ${entity.reduce.conclusions.totalCompany} CNPJ`;
          } else {
            return `não possui relação societária`;
          }
        }

        function stringProtestosAcompanhamento() {
          let temProtestos = entity.reduce.protestos;
          if(temProtestos >= 1) {
            if(temProtestos === 1) {
              return `há 1 protesto associado a esse CPF/MF`;
            }
            return `há ${temProtestos} protestos associados a esse CPF/MF`;
          } else {
            return `não há protestos associados a esse CPF/MF`;
          }
        }

        function gerarEndereco() {
          let endereco = entity.reduce.addresses[entity.reduce.addresses.length -1];
          return `${endereco.kind || 'não informado'} ${endereco.address || 'não informado'}, ${endereco.number || 'não informado'} - ${endereco.neighborhood || 'não informado'}, ${endereco.city || 'não informado'} - ${endereco.state || 'não informado'}`;
        }

        function stringSocios() {
          let retornoSocios = "";
          let socios = [];
          if(entity.reduce.socios.length === 1) {
            retornoSocios += `tendo como sócio ${entity.reduce.socios[0].name} - CPF/MF ${entity.reduce.socios[0].cpf}`;
          } else {
            for (let socio of entity.reduce.socios) {
              let cpfFormatado = VMasker.toPattern(socio.cpf, '999.999.999-99');
              socios.push(`${socio.name} - CPF/MF ${cpfFormatado}`);
            }
            let stringFinalSocios = arrayToSentence(socios, {lastSeparator: ' e '});
            retornoSocios += `tendo como sócios ${stringFinalSocios}`;
          }
          return retornoSocios;
        }

        function paragrafoDoAcompanhamento() {

          let retornoParagrafo = "";
          let enderecoCompleto = gerarEndereco();
          let temProtesto = stringProtestosAcompanhamento();

          if(entity.reduce.incomeTaxReturnLastYear) {
            let temEmpresa = stringTemEmpresaAcompanhamento();
            let rfb = entity.reduce.incomeTaxReturnLastYear.message.replace(".", "");

            retornoParagrafo = ` O target reside em ${enderecoCompleto}, conforme sua última atualização cadastral e ${temEmpresa}. ${rfb} e ${temProtesto}.`

            if(entity.reduce.recuperaPF.IDADE_CLUSTER !== "") {
              retornoParagrafo += ` O target é ${entity.reduce.recuperaPF.IDADE_CLUSTER} e possui uma renda ${entity.reduce.recuperaPF.RENDA_CLUSTER} de aproximadamente R$${entity.reduce.recuperaPF.RENDA}, bem como um score de risco ${entity.reduce.recuperaPF.SCORE_RISCO}.`
            } else {
              retornoParagrafo += ` O target possui uma renda ${entity.reduce.recuperaPF.RENDA_CLUSTER} de aproximadamente R$${entity.reduce.recuperaPF.RENDA} e um score de risco ${entity.reduce.recuperaPF.SCORE_RISCO}.`
            }
          } else {
            let socios = stringSocios();
            retornoParagrafo += `A empresa localiza-se em ${enderecoCompleto} ${socios}. Está ${entity.reduce["rfb-status"]}, exerce atividade de número ${entity.reduce.atividade} e há ${entity.reduce.protestos} protestos associados a esse CNPJ.`;
          }

          return retornoParagrafo;

        }
        timeline.add(entity.created, `Acompanhamento ${entity.reduce.name ? 'para ' + entity.reduce.name : ''}, documento ${(CPF.isValid(entity.label) ? CPF : CNPJ).format(entity.label)}.`,
            paragrafoDoAcompanhamento(), generateActions(null, entity)).attr("data-entity", entity._id);
    });

    controller.registerTrigger(["plugin::authenticated", "authentication::authenticated"], "dive::events", function(arg, cb) {
        cb();
        var report = controller.call("report",
            "Acompanhamento Cadastral e Análise de Crédito",
            "Monitore de perto, e em tempo real, as ações de pessoas físicas e jurídicas.",
            "Com essa ferramenta, informe-se em tempo real de todas as atividades de pessoas físicas e jurídicas de seu interesse. Saiba de tudo o que acontece e tenha avaliações de crédito imediatas, de forma contínua e precisa.",
            false);

        let watchEntityTimeline = report.timeline(controller);
        controller.server.call("SELECT FROM 'DIVE'.'ENTITYS'", {
            dataType: "json",
            success: function(ret) {
                for (let entity of _.values(ret.items)) {
                    controller.call("dive::entity::timeline", watchEntityTimeline, entity);
                }
            }
        });


        controller.registerTrigger("serverCommunication::websocket::DatabaseDive", "DatabaseDive", (entity, cb) => {
            cb();
            controller.call("dive::entity::timeline", watchEntityTimeline, entity);
        });

        report.button("Adicionar Acompanhamento", () => controller.call("dive::new"));

        report.gamification("dive");
        $(".app-content").append(report.element());
    });

};
