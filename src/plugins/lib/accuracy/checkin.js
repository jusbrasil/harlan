import { DistanceMeter } from './distance-meter';
import Guid from 'guid';

function basename(str){
    var base = new String(str).substring(str.lastIndexOf('/') + 1);
    if(base.lastIndexOf(".") != -1)
    base = base.substring(0, base.lastIndexOf("."));
    return base;
}

module.exports = function (controller) {

    controller.registerCall("accuracy::checkin::init", (campaign, store, callback, geolocationErrorCallback, type='checkin') =>
        controller.call("accuracy::checkin::object", campaign, store, (obj) =>
            controller.call("accuracy::checkin::picture", obj, callback, cameraErrorCallback), geolocationErrorCallback, type));

    controller.registerCall("accuracy::checkin::picture", (obj, callback, cameraErrorCallback) => {
        if (!navigator.camera || !navigator.camera.getPicture) {
            callback(obj);
            return;
        }

        navigator.camera.getPicture((imageURI) => {
            obj[0].file = basename(imageURI);
            obj[0].uri = imageURI;
            callback(obj);
        }, cameraErrorCallback, {
            quality: 50,
            targetWidth: 600,
            targetHeight: 600,
            sourceType: Camera.PictureSourceType.CAMERA,
            destinationType: Camera.DestinationType.FILE_URI,
            saveToPhotoAlbum: false,
            correctOrientation: true
        });
    });

    var getBlob = (uri, cb) => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (this.readyState == 4) cb(this.response);
        }
        xhr.open('GET', uri, true);
        xhr.responseType = 'blob';
        xhr.send();
    };

    controller.registerCall("accuracy::checkin::sendImage", (cb, obj) => {
        getBlob(obj[0].uri, imageBlob => {
            let formdata = new FormData();
            formdata.append('file', imageBlob, obj[0].file + ".jpg");
            formdata.append('token', obj[0].file);
            formdata.append('employee_id', obj[0].employee_id);
            controller.accuracyServer.call("saveImages", {}, {
                type: 'POST',
                data: formdata,
                cache: false,
                contentType: false,
                processData: false,
                success: () => cb(),
                error: () => cb("O envio fracassou, verifique sua conexão com a internet e entre em contato com o suporte")
            });
        });
    });

    controller.registerCall("accuracy::checkin::send", (cb, obj) => {
        controller.accuracyServer.call("saveAnswer", obj, {
            success: () => {
                cb();
                if (obj[0].uri) {
                    controller.sync.job("accuracy::checkin::sendImage", obj);
                }
            },
            error: () => cb("O envio fracassou, verifique sua conexão com a internet e entre em contato com o suporte")
        });
    });

    controller.registerCall("accuracy::checkin::object", (campaign, store, callback, geolocationErrorCallback, type="checkIn") => {
        let blockui = controller.call("blockui", {
            icon: "fa-location-arrow",
            message: "Aguarde enquanto capturamos sua localização."
        });

        let timeout = setTimeout(() => {
            blockui.message.text("Estamos demorando para capturar sua localização. Experimente ir para um local aberto, certifique de ativar o Wi-Fi, dados e GPS.");
        }, 6000);


        navigator.geolocation.getCurrentPosition((position) => {
            clearTimeout(timeout);
            blockui.mainContainer.remove();
            let distance = DistanceMeter(store.coordinates, position.coords);
            callback([{
                type: type,
                time: moment().format("HH:mm"),
                created_date: moment().format("DD/MM/YYYY"),
                store_id: store.id,
                campaign_id: campaign.id,
                employee_id: controller.call("accuracy::authentication::data")[0].id,
                token: Guid.raw(),
                file: Guid.raw(),
                questions: [],
                verifyCoordinates: {
                    local: `${position.coords.latitude},${position.coords.longitude}`,
                    store: store.coordinates
                },
                approved: store.coordinates ? (distance >
                    controller.confs.accuracy.geofenceLimit ? "N" : "Y") : "Y"
            }]);
        }, (...args) => {
            clearTimeout(timeout);
            blockui.mainContainer.remove();
            geolocationErrorCallback(...args);
        });
    });

};
