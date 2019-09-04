harlan.addPlugin(/** @type {import('../js/internals/controller')} */controller => {

    controller.confs.accuracy = {
        webserver: 'https://app.accuracyapp.com.br/api/v2/', /* local da API */
        geofenceLimit: 150, /* metros*/
        ajaxTimeout: 25000
    };

    controller.confs.phoneLabelPosition = 'before';

    require('./lib/accuracy/question')(controller);
    require('./lib/accuracy/authentication')(controller);
    require('./lib/accuracy/campaign')(controller);
    require('./lib/accuracy/checkin')(controller);
    require('./lib/accuracy/controller')(controller);
    require('./lib/accuracy/server')(controller);
    require('./lib/accuracy/design')(controller);
    require('./lib/accuracy/create-store')(controller);

});
