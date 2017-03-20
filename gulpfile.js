var babelify = require("babelify"),
  browserify = require("browserify"),
  cleanhtml = require("gulp-cleanhtml"),
  concat = require("gulp-concat"),
  data = require("gulp-data"),
  derequire = require("gulp-derequire"),
  del = require("del"),
  eslint = require("gulp-eslint"),
  extend = require("util")._extend,
  globby = require("globby"),
  gulp = require("gulp"),
  gutil = require("gulp-util"),
  karma = require("karma"),
  merge = require("merge-stream"),
  minifycss = require("gulp-minify-css"),
  nunjucksRender = require("gulp-nunjucks-render"),
  rename = require("gulp-rename"),
  source = require("vinyl-source-stream"),
  uglify = require("gulp-uglify"),
  zip = require("gulp-zip");

var env = process.env.ENV || "development";
var srcDir = "src/";

var config = {
  buildDir: "build/",
  distDir: "dist/",
  srcDir: srcDir
};

function envData() {
  var defaultData = require("./config/env/default.js"),
      data = require("./config/env/" + env + ".js"),
      envSecret = require("./config/env/" + env + ".secret.js"),
      compiledData = extend(extend(defaultData, data), envSecret);
  return compiledData;
}

// Build all the things!
gulp.task("build", ["build:copy", "build:css", "build:html", "build:js", "build:manifest"]);

// Clean build directory
gulp.task("build:clean", function() {
  return del(["build/*", "dist/*"]);
});

// Copy files that don't require any build process
gulp.task("build:copy", ["build:clean"], function() {
  return gulp.src(["src/images/*"])
    .pipe(gulp.dest("build/images"));
});

// Build CSS
gulp.task("build:css", ["build:clean"], function() {
  return gulp.src("src/css/**/*.css").
    pipe(minifycss({root: "src/css", keepSpecialComments: 0})).
    pipe(gulp.dest("build/css"));
});

// Build extension!
gulp.task("build:dist", ["build:dist:copy", "build:dist:js"], function() {
  var manifest = require("./build/manifest.json"),
    distFileName = manifest.name + " v" + manifest.version + ".zip";

  return gulp.src(["dist/**"]).
    pipe(zip(distFileName)).
    pipe(gulp.dest("dist"));
});

gulp.task("build:dist:copy", ["build"], function() {
  return gulp.src(["build/**/*"]).
    pipe(gulp.dest("dist"));
});

gulp.task("build:dist:js", ["build:js", "build:dist:copy"], function() {
  del(["dist/js/*"]);

  return gulp.src(["build/js/**/*.js"]).
    pipe(uglify()).
    on('error', gutil.log).
    pipe(gulp.dest("dist/js"));
});

// Copy and compress HTML files
gulp.task("build:html", ["build:clean"], function() {
  return gulp.src(config.srcDir + "html/**/*.html").
    pipe(cleanhtml()).
    pipe(gulp.dest("build/html"));
});

// Build the browserify bundle including the app
gulp.task("build:js", ["lint", "build:clean"], function(done) {
  function basename(filePath) {
    var components = filePath.split(/\//);
    return components[components.length - 1];
  }

  function bundleEntry(entryFile) {
    var bundle = browserify({
      debug: true,
      entries: entryFile
    });

    return bundle.
      transform("babelify", { presets: ["es2015"] }).
      bundle().
      pipe(source(basename(entryFile))).
      pipe(derequire()).
      on("error", function(err) {
        gutil.log(err);
        this.emit("end");
      }).
      pipe(gulp.dest(config.buildDir + "js"));
  }
  var entries = globby.sync([config.srcDir + "js/entries/*.js"]),
    bundles = [],
    i;

  for (var i = 0; i < entries.length; ++i) {
    bundles.push(bundleEntry(entries[i]));
  }

  return merge.apply(this, bundles).
    on("alldone", done);
});

// Render manifest
gulp.task("build:manifest", ["build:clean"], function() {
  return gulp.src(config.srcDir + "manifest.json.njk")
    .pipe(data(envData))
    .pipe(nunjucksRender({}))
    .pipe(rename("manifest.json"))
    .pipe(gulp.dest(config.buildDir));
});

// Lint JS
gulp.task("lint", function() {
  return gulp.src("src/js/**/*.js").
    pipe(eslint()).
    pipe(eslint.format());
});

// Test for the more vanilla, transpiled build product.
gulp.task("test", ["lint"], function(done) {
  var opts = {
    configFile: __dirname + "/config/karma/build.conf.js",
    singleRun: true
  };
  new karma.Server.start(opts, done);
});

// Test task for situations where more introspection is needed.
gulp.task("test:chrome", ["lint"], function(done) {
  var opts = {
    autoWatch: true,
    browsers: ["Chrome"],
    configFile: __dirname + "/config/karma/build.conf.js"
  };
  new karma.Server.start(opts, done);
});

// Watch files and run tasks on changes
gulp.task("watch", function() {
  paths = [
    "config/**/*.js",
    "gulpfile.js",
    "src/manifest.json",
    "src/css/**/*.css",
    "src/js/**/*.js",
    "src/html/**/*.html",
    "test/**/*.js"
  ];
  gulp.watch(paths, ["build"]);
});

gulp.task("default", ["build"]);
