module.exports = controller => {

    controller.registerTrigger('bootstrap::end', 'smartsupp', (data, cb, _smartsupp = {}) => {
        cb();
        if (!controller.confs.smartsupp) return;
        window._smartsupp = _smartsupp;
        window._smartsupp.key = controller.confs.smartsupp;
        (window.smartsupp || ((d => {
            let s;
            let c;

            const o = window.smartsupp = function(...args) {
                o._.push(args);
            };

            o._ = [];
            s = d.getElementsByTagName('script')[0];
            c = d.createElement('script');
            c.type = 'text/javascript';
            c.charset = 'utf-8';
            c.async = true;
            c.src = '//www.smartsuppchat.com/loader.js?';
            s.parentNode.insertBefore(c, s);
        })))(document);

    });

};