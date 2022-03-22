import streamqueue from 'streamqueue';
import browserify from 'browserify';
import browserSync from 'browser-sync';
import buffer from 'vinyl-buffer';
import crypto from 'crypto';
import fs from 'fs';
import glob from 'glob';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import merge from 'merge-stream';
import path from 'path';
import runSequence from 'run-sequence';
import source from 'vinyl-source-stream';
import basename from 'basename';
import readJsonSync from 'read-json-sync';

const appify = (s, browserifyArgs = {}, babelArgs = {}) => browserify(browserifyArgs)
    .transform('babelify', Object.assign(babelArgs, readJsonSync('.babelrc')))
    .bundle()
    .pipe(source(s)).pipe(buffer())
    .pipe($.babel({
        babelrc: false,
        presets: ['es2015', 'stage-0']
    }));

const $ = gulpLoadPlugins();
const reload = browserSync.reload;
const dist = 'Server/web';
const src = 'src';
const plugins = `${src}/plugins`;
const extensions = './extensions';
const vendors = 'bower_components';
const PRODUCTION = typeof $.util.env.production !== 'undefined' ? true : false;
const DEVEL = !PRODUCTION;

const PREPROCESSOR_CONTEXT = {
    context: {
        CONTEXT: PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'
    }
};

const externalJsSources = [
    `${vendors}/twin-bcrypt/twin-bcrypt.min.js`,
    `${vendors}/jquery/dist/jquery.js`,
    `${vendors}/enjoyhint/enjoyhint.min.js`,
    `${vendors}/jquery.bipbop/dist/jquery.bipbop.js`,
    `${vendors}/jquery.payment/lib/jquery.payment.js`,
    `${vendors}/jquery-mask-plugin/src/jquery.mask.js`,
    `${vendors}/oauth.io/dist/oauth.min.js`,
    `${vendors}/toastr/toastr.js`,
    `${vendors}/mustache/mustache.js`,
    `${vendors}/moment/min/moment-with-locales.js`,
    `${vendors}/numeral/numeral.js`,
    `${vendors}/numeral/locales/pt-br.js`,
    `${vendors}/material-design-lite/material.js`,
    `${vendors}/pikaday/pikaday.js`,
    `${vendors}/vis/dist/vis.js`,
    `${vendors}/pikaday/plugins/pikaday.jquery.js`,
    `${vendors}/jszip/dist/jszip.min.js`,
    `${vendors}/html-docx-js/dist/html-docx.js`,
    `${vendors}/jdataview/dist/browser/jdataview.js`,
    `${vendors}/react/react.production.min.js`,
    `${vendors}/react/react-dom.production.min.js`,
];

const ichequesKeystore = 'icheques.keystore';

const i18n = (locale) => gulp.src(`src/js/internals/i18n/${locale}/**/*.json`)
    .pipe($.messageformat({
        locale: locale,
        module: 'commonJS'
    }))
    .pipe(gulp.dest('src/js/internals/i18n'))
    .pipe($.size({title: `>>> i18n-${locale}`}));

require('gulp-task-list')(gulp);

gulp.task('assets', () => gulp.src([
    'src/assets/**/*'
])
    .pipe(gulp.dest(`${dist}/assets`))
    .pipe($.size({title: '>>> assets'})));

gulp.task('legal', () => gulp.src([
    'legal/**/*.pdf'
])
    .pipe(gulp.dest(`${dist}/legal`))
    .pipe($.size({title: '>>> legal'})));

gulp.task('manifest', () => gulp.src([
    'manifest*.json',
    'CNAME',
    `${src}/robots.txt`
])
    .pipe(gulp.dest(dist))
    .pipe($.size({title: '>>> manifest'})));

gulp.task('templates', () => gulp.src(`${src}/templates/**/*.tpl`)
    .pipe(gulp.dest(`${dist}/templates`))
    .pipe($.size({title: '>>> templates'})));

gulp.task('html', () => gulp.src(`${src}/**/*.html`)
    .pipe($.fileInclude({
        prefix: '@@',
        basepath: '@file'
    }))
    .pipe($.hashSrc({
        build_dir: dist,
        src_path: src
    }))
    .pipe($.htmlMinifier({
        collapseWhitespace: true,
        removeComments: true
    }))
    .pipe(gulp.dest(dist))
    .pipe($.size({title: '>>> html'})));

gulp.task('i18n-en', () => {
    i18n('en');
});

gulp.task('i18n-pt', () => {
    i18n('pt');
});

gulp.task('i18n', ['i18n-en', 'i18n-pt']);

gulp.task('build:plugins:template', () => gulp.src(`${plugins}/templates/**/*.html`)
    .pipe($.htmlMinifier({
        collapseWhitespace: true,
        removeComments: true
    }))
    .pipe($.htmlToJs())
    .pipe(gulp.dest(`${plugins}/templates`))
    .pipe($.size({title: '>>> build:plugins:template'})));

gulp.task('build:plugins:markdown', () => gulp.src(`${plugins}/markdown/**/*.md`)
    .pipe($.markdown())
    .pipe($.htmlMinifier({
        collapseWhitespace: true,
        removeComments: true
    }))
    .pipe($.htmlToJs())
    .pipe(gulp.dest(`${plugins}/markdown`))
    .pipe($.size({title: '>>> build:plugins:markdown'})));

gulp.task('build:plugins:sql', () => gulp.src(`${plugins}/sql/**/*.sql`)
    .pipe($.texttojs({
        template: 'module.exports = function (controller) { return controller.database.exec(<%= content %>); };'
    }))
    .pipe(gulp.dest(`${plugins}/sql`))
    .pipe($.size({title: '>>> build:plugins:sql'})));

gulp.task('build:plugins:css', ['styles'], () => gulp.src(`${plugins}/styles/**/*.css`)
    .pipe($.autoprefixer())
    .pipe($.importCss())
    .pipe($.cssnano({
        reduceIdents: false,
        mergeIdents: false
    }))
    .pipe($.css2js())
    .pipe(gulp.dest(`${plugins}/styles/`))
    .pipe($.size({title: '>>> build:plugins:css'})));

gulp.task('build:plugins:sass', () => gulp.src(`${plugins}/styles/**/*.scss`)
    .pipe($.sass())
    .pipe($.autoprefixer())
    .pipe($.importCss())
    .pipe($.cssnano({
        reduceIdents: false,
        mergeIdents: false
    }))
    .pipe($.css2js())
    .pipe(gulp.dest(`${plugins}/styles`))
    .pipe($.size({title: '>>> build:plugins:sass'})));

gulp.task('build:plugins:styles', ['build:plugins:sass', 'build:plugins:css']);

gulp.task('build:extensions', [
    'build',
], () => {
    let files = glob.sync(`${extensions}/*.json`);
    return merge(files.map((entry) => {
        entry = `./${entry}`;
        let extensionName = basename(entry);
        let buildDir = `${extensions}/build/${extensionName}`;
        return streamqueue({ objectMode: true },
            gulp.src(['${dist}/**/*', '!manifest*.json'], {base: '${dist}'}),
            gulp.src(entry).pipe($.concat('manifest.json')))
            .pipe($.size({title: '>>> build:extensions'}))
            .pipe(gulp.dest(buildDir));
    }));
});

gulp.task('build:plugins', [
    'build:plugins:template',
    'build:plugins:markdown',
    'build:plugins:styles',
    'build:plugins:sql',
], () => {
    let files = glob.sync(`${plugins}/*.js`);

    return merge(files.map((entry) => {
        entry = `./${entry}`;
        return appify(path.basename(entry), { entries: entry })
            .pipe($.uglify())
            .pipe(gulp.dest(`${dist}/js`))
            .pipe($.size({title: '>>> build:plugins'}));
    }));
});

gulp.task('deploy', () => gulp.src(`${dist}/**/*`)
    .pipe($.ghPages())
    .pipe($.size({title: 'deploy'})));

// Compila os testes da aplicação
gulp.task('build:tests', () => appify('index.js', { entries: `${src}/js/tests/index.js` })
    .pipe($.addSrc(externalJsSources.concat([
        `${vendors}/chai/chai.js`,
        `${vendors}/mocha/mocha.js`
    ])))
    .pipe($.concat('index.js'))
    .pipe(gulp.dest('test/spec')));

// Monta o desempacotador da aplicação
gulp.task('inflate', () => appify('app-inflate.js', { entries: `${src}/js/app-inflate.js` })
    .pipe($.uglify())
    .pipe($.concat('app-inflate.js'))
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.size({title: '>>> inflate'})));

// Monta o Worker-Service do Chrome
gulp.task('service-worker', () => appify('service-worker.js', { entries: `${src}/js/service-worker.js` })
    .pipe($.uglify())
    .pipe($.concat('service-worker.js'))
    .pipe(gulp.dest(dist))
    .pipe($.size({title: '>>> service-worker'})));

gulp.task('build:installer', ['build:installer:client', 'build:installer:main']);

// Cria o loader da aplicação Harlan
gulp.task('build:installer:client', ['build:application'], () => appify('app-client-installer.js', { entries: `${src}/js/app-client-installer.js` })
    .pipe($.uglify())
    .pipe($.concat('app-client-installer.js'))
    .pipe($.preprocess({context: {
        CLIENT_COMPRESSED_SIZE: fs.statSync(`${dist}/js/app-client.js.gz`).size,
        CLIENT_APP_SIZE: fs.statSync(`${dist}/js/app-client.js`).size,
        CLIENT_MD5: crypto.createHash('md5').update(fs.readFileSync(`${dist}/js/app-client.js`)).digest('hex')
    }}))
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.size({title: '>>> build:installer'})));

// Cria o loader da aplicação Harlan
gulp.task('build:installer:main', ['build:application'], () => appify('app-installer.js', { entries: `${src}/js/app-installer.js` })
    .pipe($.uglify())
    .pipe($.concat('app-installer.js'))
    .pipe($.preprocess({context: {
        COMPRESSED_SIZE: fs.statSync(`${dist}/js/app.js.gz`).size,
        APP_SIZE: fs.statSync(`${dist}/js/app.js`).size,
        MD5: crypto.createHash('md5').update(fs.readFileSync(`${dist}/js/app.js`)).digest('hex')
    }}))
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.size({title: '>>> build:installer'})));

// Compila as aplicações mobile
gulp.task('build:cordova', ['build:app:icheques']);

gulp.task('build:application:main:deps', [], () => gulp.src(externalJsSources)
    .pipe($.ignore.exclude(fs.existsSync(`${dist}/js/deps.js`)))
    // .pipe($.babel({
    //     babelrc: false,
    //     presets: ['es2015', 'stage-0']
    // }))
    .pipe(gulp.dest(`${dist}/js/deop`))
    .pipe($.uglify())
    .pipe($.addSrc([`${vendors}/sql.js/js/sql.js`]))
    .pipe($.size({title: '>>> build:plugins'}))
    .pipe($.concat('deps.js'))
    .pipe(gulp.dest(`${dist}/js/deop`))
    .pipe($.size({title: '>>> build:plugins:all'})));

// Compila a aplicação Harlan
gulp.task('build:application:main', ['i18n', 'build:application:main:deps'], () => appify('app.js', { entries: `${src}/js/app.js` })
    .pipe($.preprocess(PREPROCESSOR_CONTEXT))
    .pipe(gulp.dest(`${dist}/js/deop/`))
    .pipe($.uglify())
    .pipe($.addSrc(`${dist}/js/deop/deps.js`))
    .pipe($.concat('app.js'))
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.pako.gzip())
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.size({title: '>>> build:application'})));

// Compila a aplicação Harlan
gulp.task('build:application:client', ['i18n'], () => appify('app-client.js', { entries: `${src}/js/app-client.js` })
    .pipe($.preprocess(PREPROCESSOR_CONTEXT))
    .pipe($.uglify())
    .pipe($.concat('app-client.js'))
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.pako.gzip())
    .pipe(gulp.dest(`${dist}/js`))
    .pipe($.size({title: '>>> build:application'})));

// Compila as aplicações JavaScript
gulp.task('build:application', ['build:application:main', 'build:application:client']);

// Compila as imagens do tipo vetor
gulp.task('build:images:vector', () => gulp.src([
    `${src}/**/*.svg`
])
    .pipe($.newer(dist))
    .pipe(gulp.dest(dist))
    .pipe($.size({title: '>>> build:images:vector'})));

// Compila as imagens de fundo JPEG
gulp.task('build:images:backgrounds', () => gulp.src([
    `${src}/images/bg/**/*.{jpg,jpeg}`
])
    .pipe($.newer(`${dist}/images/bg`))
    .pipe($.imageResize({
        width: 4096,
        quality: 0.8,
        format: 'jpg'
    }))
    .pipe(gulp.dest(`${dist}/images/bg`))
    .pipe($.size({title: '>>> build:images:backgrounds'})));

// Compila as imagens PNG, JPG, GIF e JPEG
gulp.task('build:images:no-vector', () => gulp.src([
    `${src}/**/*.{png,jpg,gif,jpeg}`,
    `!${src}/images/bg/*.{jpg,jpeg}`
])
    .pipe(gulp.dest(dist))
    .pipe($.size({title: '>>> build:images:no-vector'})));

gulp.task('build:images', ['build:images:no-vector', 'build:images:vector', 'build:images:backgrounds']);

gulp.task('fonts', () => gulp.src([
    `${vendors}/font-awesome/fonts/**/*`,
    'fonts/**/*'
])
    .pipe(gulp.dest(`${dist}/fonts`))
    .pipe($.size({title: '>>> fonts'})));

gulp.task('styles:client', () => gulp.src([
    `${src}/scss/client.scss`
])
    .pipe($.compass({
        css: `${dist}/css`,
        sass: `${src}/scss`,
        image: `${dist}/images`
    }))
    .pipe(buffer())
    .pipe($.autoprefixer())
    .pipe($.importCss())
    .pipe($.concat('client.css'))
    .pipe($.cssnano({
        reduceIdents: false,
        mergeIdents: false
    }))
    .pipe(gulp.dest(`${dist}/css`))
    .pipe($.size({title: '>>> styles'}))
    .pipe(reload({stream: true})));

gulp.task('styles:main', () => gulp.src([
    `${src}/scss/screen.scss`
])
    .pipe($.compass({
        css: `${dist}/css`,
        sass: `${src}/scss`,
        image: `${dist}/images`
    }))
    .pipe(buffer())
    .pipe($.autoprefixer())
    .pipe($.importCss())
    .pipe($.concat('app.css'))
    .pipe($.cssnano({
        reduceIdents: false,
        mergeIdents: false
    }))
    .pipe(gulp.dest(`${dist}/css`))
    .pipe($.size({title: '>>> styles'}))
    .pipe(reload({stream: true})));

gulp.task('styles', ['styles:client', 'styles:main']);

gulp.task('default', cb => runSequence('build', 'watch', cb));

gulp.task('clean', () => gulp.src(['cordova/*/www'])
    .pipe($.clean({force:true})));

gulp.task('build', cb => {
    const leaves = [
        'service-worker',
        'manifest',
        'legal',
        'fonts',
        'assets',
        'styles',
        'templates',
        'html',
        'inflate'
    ];

    return runSequence('clean', 'build:images',
        ['build:plugins', 'build:installer'],
        leaves,
        cb
    );
});

gulp.task('watch', () => {
    browserSync({
        notify: true,
        open: false,
        port: 3000,
        server: {
            baseDir: [dist]
        }
    });
    gulp.watch('src/js/internals/i18n/**/*.json', () => runSequence('build:installer', reload));
    gulp.watch(['src/scss/*', 'src/scss/*.scss'], ['styles']);
    gulp.watch(['src/js/service-worker.js'], () => runSequence('service-worker', reload));
    gulp.watch([
        'src/js/*.js',
        'src/js/internals/**/*.js',
        '!src/js/service-worker.js',
        '!src/js/app-installer.js',
        '!src/js/app-inflate.js',
        '!src/js/internals/i18n/**/*.js'
    ], () => runSequence('build:installer', reload));
    gulp.watch('src/js/app-inflate.js', () => runSequence('inflate', reload));
    gulp.watch('src/js/app-installer.js', () => runSequence('build:installer', reload));
    gulp.watch(['src/**/*.html', 'src/**/*.tpl'], () => runSequence('html', 'templates', reload));
    gulp.watch([
        'src/plugins/styles/**/*.{css,scss}',
        'src/plugins/templates/**/*.html',
        'src/plugins/sql/**/*.sql',
        'src/plugins/**/*.js',
        'src/plugins/markdown/**/*.md',
        '!src/plugins/markdown/**/*.js',
        '!src/plugins/templates/**/*.js',
        '!src/plugins/sql/**/*.js',
        '!src/plugins/styles/**/*.js'
    ], () => runSequence('build:plugins', reload));
});

gulp.task('build:app:icheques', ['app:copy-files'],
    $.shell.task(`cordova build android --release -- "--keystore=${ichequesKeystore}" --alias=icheques --password=icheques`, {
        cwd: './cordova/icheques'
    }));

gulp.task('build:app', ['build:app:icheques']);

gulp.task('release:app:icheques', () => runSequence('build', 'build:app:icheques'));

gulp.task('install:app:icheques', ['app:copy-files'],
    $.shell.task('cordova run android', {
        cwd: './cordova/icheques'
    }));

gulp.task('watch:app:icheques', ['watch'], () => gulp.watch([`${dist}/**/*`], event => runSequence('app:copy-files', 'install:app:icheques')));
