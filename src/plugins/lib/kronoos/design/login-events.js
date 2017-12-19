module.exports = controller => {
    if (controller.confs.kronoos.isKronoos) {
        $("#demonstration").parent().hide();
        $("#login-about").text("Soluções na implementação de práticas relacionadas à " +
            "responsabilidade socioambiental e anticorrupção.");
    }
};
