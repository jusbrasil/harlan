/* global self, moment, csv, file, require, queue */

var moment = require("moment"),
    fileReaderStream = require("filereader-stream"),
    CPF = require("cpf_cnpj").CPF,
    CNPJ = require("cpf_cnpj").CNPJ,
    csv = require("csv"),
    concat = require("concat-stream"),
    async = require("async"),
    request = require("request"),
    pad = require("pad");

var UPDATE_INTERVAL = 500;

self.onmessage = function(message) {

    var loaded = 0,
        parsed = 0;

    var queue = async.queue((data, callback) => {
        request.post({
            url: "https://irql.bipbop.com.br/",
            form: {
                q: "INSERT INTO 'DIVE'.'ENTITY'",
                apiKey: message.data.apiKey,
                documento: data.record[0],
                birthday: data.record[1]
            }
        }, (err, httpResponse, body) => {
            callback();

            if (err) {
                self.postMessage({
                    method: "error",
                    data: {
                        record: data.record,
                        response: {
                            httpResponse: httpResponse,
                            body: body,
                            error: err
                        }
                    }
                });
                return;
            }

            loaded++;
        });
        /* MAKE */

    }, 5);

    var updateInterval = setInterval(function() {
        self.postMessage({
            method: "progress",
            data: loaded / parsed
        });
    }, UPDATE_INTERVAL);

    var end = () => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        self.postMessage(null); /* EOF */
    };

    queue.drain = end;

    fileReaderStream(message.data.file)
        .pipe(csv.parse())
        .pipe(csv.transform((record) => {
            if (record[0].length < 11) {
                record[0] = pad(11, record[0], '0');
            } else if (record[0].length < 15 && record[0].length > 11) {
                record[0] = pad(15, record[0], '0');
            }

            if (!(CPF.isValid(record[0]) || CNPJ.isValid(record[0]))) {
                return;
            }

            var birthday = moment(record[1], ["DD/MM/YYYY",
                "YYYY-MM-DD",
                "YY-MM-DD",
                "DD/MM/YY"
            ]);
            
            if (!(birthday.isValid())) {
                return;
            }

            if (moment().diff(birthday, 'years') < 16) {
                /* menores de 16 anos não */
                return;
            }

            parsed++;
            record[1] = birthday.format("DD/MM/YYYY");
            queue.push({
                record: record
            });
        })).on('finish', () => {
            if (!parsed) {
                end();
            }
        });

};
