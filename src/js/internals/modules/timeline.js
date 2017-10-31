/*jshint -W083 */

var Timeline = function() {
    var timeline = $("<ul />").addClass("timeline");

    this.add = (time, header, details, actions, obj = {}) => {
        obj.item = $("<li />");

        obj.header = $("<div />").addClass("timeline-header");
        obj.details = $("<div />").addClass("timeline-details").html(details);

        if (time && !moment.isMoment(time)) {
            time = moment.unix(time);
        }

        obj.expansionIcon = $("<i />").addClass("fa fa-angle-down");
        obj.expansion = $("<span />").addClass("timeline-expand").append(obj.expansionIcon).click((e) => {
            e.preventDefault();
            if (obj.item.hasClass("expanded")) {
                obj.item.removeClass("expanded");
                obj.expansionIcon.removeClass("fa-angle-up").addClass("fa-angle-down");
            } else {
                obj.item.addClass("expanded");
                obj.expansionIcon.addClass("fa-angle-up").removeClass("fa-angle-down");
            }
        });

        if (time) {
            obj.time = $("<span />").addClass("timeline-time").text(time.fromNow());
            var interval = setInterval(function() {
                obj.time.text(time.fromNow());
            }, 60000);

            obj.time.on('remove', () => {
                clearInterval(interval);
            });
        }


        obj.headerContent = $("<span />").addClass("timeline-header-content").text(header);
        obj.actions = $("<ul />").addClass("actions");

        for (let idx in actions) {
            (function() {
                var [icon, label, action] = actions[idx];

                var id = require('node-uuid').v4(),
                    item = $("<li />").append($("<i />").addClass("fa " + icon)).click(function(e) {
                        e.preventDefault();
                        action(obj);
                    }).attr({
                        id: id
                    }),
                    materialTip = $('<div />').addClass('mdl-tooltip').attr("for", id).text(label);

                item.append(materialTip);
                obj.actions.append(item);

                var componentVisible = setInterval(function() {
                    if (!item.is(':visible')) {
                        return;
                    }

                    componentHandler.upgradeElement(materialTip.get(0), "MaterialTooltip");
                    clearInterval(componentVisible);
                }, 300);
            })();
        }

        obj.meta = $("<div />").addClass("timeline-meta");
        if (obj.time) {
            obj.meta.append(obj.time);
        }
        obj.meta.append(obj.actions);

        obj.header.append(obj.meta);
        obj.header.append(obj.expansion);
        obj.header.append(obj.headerContent);
        obj.header.append($("<div />").addClass("clear"));

        obj.item.append(obj.header);
        obj.item.append(obj.details);

        timeline.prepend(obj.item.data("object", obj));

        return obj.item;
    };

    this.length = () => {
        return timeline.find("li").length;
    };

    this.element = () => {
        return timeline;
    };

};

module.exports = (controller) => {
    controller.registerCall("timeline", () => {
        return new Timeline();
    });
};
