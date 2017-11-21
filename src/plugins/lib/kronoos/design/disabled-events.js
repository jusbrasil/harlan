module.exports = controller => {
    if (controller.confs.kronoos.isKronoos) {
        controller.unregisterTrigger(["authentication::authenticated", "kronoos::init"], "welcomeScreen::authenticated");
        controller.unregisterTrigger("serverCommunication::websocket::authentication", "accountOverview");
    }
};
