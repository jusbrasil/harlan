module.exports = controller => {

    controller.registerCall("admin::changeContract", (companyNode, username, section) => {
        var form = controller.call("form", opts => {
            opts.username = username;
            controller.serverCommunication.call("UPDATE 'BIPBOPCOMPANYS'.'CONTRACT'",
                controller.call("error::ajax", controller.call("loader::ajax", {
                    data: opts,
                    success: response => {
                        controller.call("admin::viewCompany", $(response).find("BPQL > body > company"), section, "replaceWith");
                    }
                })));
        });
        var contrato = $(companyNode).children("contrato");
        form.configure({
            "title": "Alteração de Contrato",
            "subtitle": "Preencha os dados abaixo.",
            "gamification": "magicWand",
            "paragraph": "É muito importante que os dados estejam preenchidos de maneira correta para que seja mantido um cadastro saneado.",
            "screens": [{
                "magicLabel": true,
                "fields": [
                    [{
                        "name": "roleValue",
                        "type": "text",
                        "placeholder": "Contrato (R$)",
                        "labelText": "Valor do Contrato (R$)",
                        "mask": "000.000.000.000.000,00",
                        "optional": false,
                        "value" : numeral(contrato.find("contrato:eq(1)").text() || "0.0").format('0,0.00'),
                        "maskOptions": {
                            "reverse": true
                        },
                        "numeral": true
                    }, {
                        "name": "queryValue",
                        "type": "text",
                        "placeholder": "Consulta Excedente (R$)",
                        "labelText": "Consulta Excedente (R$)",
                        "mask": "000.000.000.000.000,00",
                        "optional": false,
                        "value" : numeral(contrato.find("contrato:eq(3)").text() || "0.0").format('0,0.00'),
                        "maskOptions": {
                            "reverse": true
                        },
                        "numeral": true
                    }],
                    [{
                        "name": "dueDate",
                        "type": "text",
                        "optional": false,
                        "value": contrato.find("contrato:eq(0)").text(),
                        "placeholder": "Data de Vencimento",
                        "labelText": "Data de Vencimento",
                        "mask": "0#",
                        "numeral": true
                    }, {
                        "name": "roleType",
                        "type": "select",
                        "labelText": "Tipo de Contrato",
                        "optional": false,
                        "list": controller.call("admin::roleTypes"),
                        "value" : contrato.find("contrato:eq(4)").text()
                    }, {
                        "name": "roleQuerys",
                        "type": "text",
                        "mask": "0#",
                        "optional": false,
                        "value" : contrato.find("contrato:eq(2)").text(),
                        "placeholder": "Mínimo Consultas",
                        "labelText": "Mínimo Consultas",
                        "numeral": true
                    }]
                ]
            }]
        });

    });

};
