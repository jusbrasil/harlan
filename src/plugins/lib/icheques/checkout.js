const DATABASE_KEYS = [
    'id',
    'creation',
    'cmc',
    'cpf',
    'cnpj',
    'expire',
    'ammount',
    'status',
    'pushId',
    'observation',
    'company',
    'document',
    'queryStatus',
    'ocurrenceCode',
    'situation',
    'display',
    'ocurrence',
    'debtCollector',
    'alinea',
    'lastUpdate',
    'operation',
    'ccf',
    'protesto',
    'lastDebtCollectorMessage',
    'image'
];

import squel from 'squel';
import changeCase from 'change-case';
import async from 'async';
import _ from 'underscore';
import validCheck from './data/valid-check';
import escapeString from 'sql-string-escape';

module.exports = controller => {

    const databaseObject = (obj, type) => {

        type = type || 'constantCase';
        const n = {};
        for (const i in obj) {
            if (!DATABASE_KEYS.includes(changeCase.camelCase(i))) {
                continue;
            }
            n[changeCase[type](i)] = escapeString(obj[i].replace('\'', ''));
        }
        return n;
    };

    controller.registerCall('icheques::databaseObject', databaseObject);

    const insertDatabase = check => {
        if (Array.isArray(check)) {
            if (check.length <= 0)
                return;
            _.map(check, check => insertDatabase(check));
            return;
        }

        if (!validCheck(check.cmc)) {
            check.situation = 'Instituição bancária não monitorada';
            check.display = 'Instituição bancária não monitorada';
            check.queryStatus = 'Instituição bancária não monitorada';
            check.ocurrenceCode = 99999;
            check.ocurrence = 'Instituição bancária não monitorada';
            check.pushId = null;
        }

        controller.database.exec(squel.insert().into('ICHEQUES_CHECKS').setFields(databaseObject(check)).toString());
    };

    controller.registerCall('icheques::insertDatabase', insertDatabase);

    const calculateCheck = check => {
        if (!validCheck(check.cmc)) {
            return 0;
        }

        if (controller.call('icheques::check::alreadyExists', check)) {
            return 0;
        }

        let checkDiff = moment(check.expire, 'YYYYMMDD').diff(moment(), 'month');
        if (checkDiff <= 0) {
            return controller.confs.icheques.price;
        }
        const months = checkDiff - controller.confs.icheques.monthsIncluded;
        if (months <= 0) {
            return controller.confs.icheques.price;
        }

        return controller.confs.icheques.price + (months * controller.confs.icheques.moreMonths);
    };

    const newCheck = (check, callback) => {
        controller.serverCommunication.call('SELECT FROM \'ICHEQUES\'.\'CHECK\'',
            controller.call('error::ajax', {
                data: check,
                success(ret) {
                    if (!$('new', ret).length) {
                        toastr.warning(`O cheque ${check.cmc} informado já foi cadastrado.`, 'Efetue uma busca no sistema e tente novamente.');
                    }
                    Object.assign(check, controller.call('icheques::parse::element', $(ret).find('check').get(0)));
                    insertDatabase(check);
                },
                complete() {
                    callback();
                }
            }));
        return true;
    };

    controller.registerCall('icheques::newCheck', newCheck);
    controller.registerCall('icheques::calculateCheckValue', calculateCheck);

    controller.registerCall('icheques::checkout', storage => {
        if (!storage.length) {
            return;
        }

        controller.call('icheques::calculateBill', storage, () => {
            const q = async.queue(newCheck);
            const loaderUnregister = $.bipbopLoader.register();
            q.drain = () => {
                loaderUnregister();
                controller.call('icheques::show', storage);
            };

            for (const i in storage) {
                q.push(storage[i]);
            }
        });
    });

    controller.registerCall('icheques::calculateBill', (checks, callback) => {
        controller.server.call('SELECT FROM \'ICHEQUES\'.\'IPAYTHEBILL\'', controller.call('loader::ajax', {
            dataType: 'json',
            success: data => {
                if (data) {
                    controller.call('icheques::calculateBill::pay', checks, callback);
                } else {
                    callback();
                }
            }
        }));
    });

    controller.registerCall('icheques::calculateBill::pay', (checks, callback) => {
        let total = 0;
        for (const i in checks) {
            total += calculateCheck(checks[i]);
        }

        controller.call('credits::has', total, callback);
    });

};
