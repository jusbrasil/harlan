/* global toastr, BIPBOP_FREE, module */
import localForage from "localforage";

module.exports = function(controller) {

    /**
     * Captura o Session ID
     */
    var getSessionId = function(callback) {
        if (controller.query.apiKey) callback(controller.query.apiKey);
        else if (sessionStorage.apiKey) callback(sessionStorage.apiKey);
        else localForage.getItem('sessionId', (err, value) => callback(err ? null : value));
    };

    /**
     * Define um Session ID
     */
    var setSessionId = function(value, cb) {
        if (!value) localForage.removeItem('sessionId', cb);
        else localForage.setItem('sessionId', value, cb);
    };

    controller.registerCall("authentication::unsetSessionId", cb => setSessionId(null, cb));

    /**
     * Set the default page! \m/
     */
    controller.registerCall("default::page", function() {
        controller.interface.helpers.activeWindow(".site");
    });


    // controller.registerTrigger("bootstrap::end", "authentication::centralized", (obj, callback) => {
    //     const loginElement = $(".login");
    //
    //     let centralizedLogin = () => {
    //         if (loginElement.height() < $(window).height())
    //             loginElement.css({top: '50%', 'margin-top' : (loginElement.height() / 2) * - 1});
    //     };
    //
    //     callback();
    //
    //     let loginVisible = setInterval(() => {
    //         if (loginElement.is(":visible"))
    //             clearInterval(loginVisible);
    //         centralizedLogin();
    //         $(window).on('resize', centralizedLogin);
    //     }, 500); /* @TODO verifica a cada 500ms, substituir no futuro por evento de login */
    // });

    /**
     * Registra o formulário
     */
    controller.registerTrigger("bootstrap::end", "authentication::bootstrap", function(obj, callback) {
        callback();

        if (!authenticate()) {
            if (window.location.hash == "#/login") {
                controller.interface.helpers.activeWindow(".login");
            } else {
                controller.call("default::page");
            }
        }

        $("#action-logout").click(function(e) {
            e.preventDefault();
            controller.call("authentication::logout");
        });

        $("#form-login").submit(function(e) {
            e.preventDefault();
            controller.call("authentication::authenticate");
        });

    });


    /**
     * Chama pelo logout
     */
    controller.registerCall("authentication::logout", function() {
        var modal = controller.call("modal");
        modal.title("Você está saindo da conta.");
        modal.subtitle("Aguarde enquanto a página é recarregada para sua segurança.");
        modal.addParagraph("Esperamos que sua visita tenha sido proveitosa e sua experiência incrível.");

        var loggedout = false,
            logout = function() {
                loggedout = true;
                controller.serverCommunication.apiKey(BIPBOP_FREE);
                controller.call("default::page");
                $("#input-username").val("");
                $("#input-password").val("");
                $("#input-save-password").removeAttr("checked");
                setSessionId(null, () => {
                    controller.trigger("authentication::logout::end");
                    if (navigator.serviceWorker && navigator.serviceWorker.controller)
                        navigator.serviceWorker.controller.postMessage(null);
                    location.reload(true); /* prevent information leak */
                });
            },
            timeout = setTimeout(logout, 10000);

        controller.trigger("authentication::logout", null, function() {
            if (loggedout) {
                return;
            }
            clearTimeout(timeout);
            logout();
        });
    });

    controller.registerCall("authentication::loggedin", function() {
        controller.interface.helpers.activeWindow(".app");
    });

    var authenticate = (key, ret, cb) => getSessionId(storedKey => {
        cb = cb || (s => console.debug(`authentication ${s ? "success" : "failed"}`));
        key = key || storedKey;
        if (!key) {
            cb(false);
            return;
        }
        controller.serverCommunication.apiKey(key);
        sessionStorage.apiKey = key;

        controller.trigger("authentication::authenticated", ret, function(err) {
            if (err) {
                controller.call("default::page");
                return;
            }
            controller.call("authentication::loggedin");
            controller.trigger("authentication::authenticated::end");
        });

        cb(true);
    });

    /**
     * Força uma autenticação
     */
    controller.registerCall("authentication::force", function(apiKey, ret, cb) {
        authenticate(apiKey, ret, cb);
    });

    controller.registerTrigger("serverCommunication::websocket::authentication", "username", (data, callback) =>  {
        $("#logged-user").text(data.username);
        controller.confs.user = data;
        controller.trigger("serverCommunication::websocket::authentication::end", data);
        callback();
    });


    /**
     * Chama pela autenticação
     */
    controller.registerCall("authentication::authenticate", function(inputUsername, inputPassword, savePassword, callback) {

        savePassword = typeof savePassword !== "undefined" ?
            savePassword :
            $("#input-save-password").is(":checked");

        inputUsername = inputUsername || $("#input-username");
        inputPassword = inputPassword || $("#input-password");

        if (/^\s*$/.test(inputUsername.val()) || inputPassword.val() === "") {
            toastr.error("Para acessar o sistema você precisa inserir seu usuário e senha.", "Insira seu nome de usuário e senha.");
            return;
        }

        controller.serverCommunication.call("SELECT FROM 'HarlanAuthentication'.'Authenticate'",
            controller.call("loader::ajax", controller.call("error::ajax", {
                error: function() {
                    inputUsername.addClass("error");
                    inputPassword.addClass("error");
                },
                success: function(domDocument) {
                    $("#logged-user").text($("BPQL > body username", domDocument).text());


                    var apiKey = $("BPQL > body apiKey", domDocument).text();
                    authenticate(apiKey, domDocument);

                    if (savePassword) {
                        setSessionId(apiKey, () => {
                            if (callback)
                                callback();
                        });
                    }
                },
                method: 'POST',
                data: {
                    username: inputUsername.val().trim(),
                    password: inputPassword.val()
                }
            })));
    });

    controller.registerBootstrap("authentication::cordova::clear", callback => {
        callback();
        $("#form-login").trigger("reset");
    });

    controller.registerCall("authentication::need", function(callback) {
        if (controller.serverCommunication.freeKey()) {
            controller.interface.helpers.activeWindow(".login");
            var modal = controller.call("modal");
            modal.title("Você precisa estar autenticado");
            modal.subtitle("Essa operação exige que você esteja autenticado.");
            modal.addParagraph("Reinicie a operação após autenticar-se.");
            var form = modal.createForm();
            form.element().submit(function(e) {
                e.preventDefault();
                modal.close();
            });
            form.addSubmit("ok", "Entendido");
            return true;
        }

        if (callback) {
            callback();
        }

        return false;
    });

};
