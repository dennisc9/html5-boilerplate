import gulp from "gulp";
import scss from "gulp-sass";
import browserSync from "browser-sync";
import clean from "gulp-clean";
import imagemin from "gulp-imagemin";
import uglify from "gulp-uglify";
import cssnano from "gulp-cssnano";
import htmlmin from "gulp-htmlmin";
import changed from "gulp-changed";
import autoprefixer from "gulp-autoprefixer";
import prettify from "gulp-jsbeautifier";
import gulpIgnore from "gulp-ignore";
import useref from "gulp-useref";
import del from "del";
import path from "path";

require("dotenv").config();

const globs = {
  scss: "src/scss/**/*.scss",
  css: "src/**/*.css",
  js: "src/**/*.js",
  images: "src/**/*.{png,jpg,jpeg,gif,svg}",
  html: "src/**/*.html",
  other: [
    "src/**/*.*",
    "!src/**/*.html",
    "!src/**/*.css",
    "!src/**/*.js",
    "!src/**/*.less",
    "!src/**/*.scss",
    "!src/**/*.png",
    "!src/**/*.jpg",
    "!src/**/*.jpeg",
    "!src/**/*.gif",
    "!src/**/*.svg"
  ]
};

gulp.task("serve", done => {
  browserSync({
    server: "./dist",
    online: true,
    notify: false,
    open: false,
    port: 4001
  });
  done();
});

// console log changed files using gulpIgnore
const message = file => {
  console.log(file.path);
  return false;
};

// scss compilation + minification
gulp.task("scss", () => {
  return gulp
    .src(globs.scss)
    .pipe(changed("dist/css", { extension: ".css" }))
    .pipe(gulpIgnore(message))
    .pipe(scss())
    .pipe(
      autoprefixer({
        cascade: false
      })
    )
    .pipe(cssnano())
    .pipe(gulp.dest("dist/css"));
});

// css minification
gulp.task("css", () => {
  return gulp
    .src(globs.css)
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(
      autoprefixer({
        cascade: false
      })
    )
    .pipe(cssnano())
    .pipe(gulp.dest("dist"));
});

// js minification + uglification
gulp.task("js", () => {
  return gulp
    .src(globs.js)
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(uglify())
    .pipe(gulp.dest("dist"));
});

// image optimization
gulp.task("images", () => {
  return gulp
    .src(globs.images)
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(
      imagemin(
        [
          imagemin.gifsicle(),
          imagemin.mozjpeg(),
          imagemin.optipng(),
          imagemin.svgo()
        ],
        {
          verbose: true
        }
      )
    )
    .pipe(gulp.dest("dist"));
});

// html minification and combination off css/js assets
gulp.task("html", () => {
  return gulp
    .src(globs.html)
    .pipe(gulpIgnore(message))
    .pipe(useref())
    .pipe(
      htmlmin({
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true
      })
    )
    .pipe(gulp.dest("dist"));
});

// copy everything else
gulp.task("other", () => {
  return gulp
    .src(globs.other)
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(gulp.dest("dist"));
});

// Prettify css js html
gulp.task("prettify:src", () => {
  return gulp
    .src("src/**/*.+(html|css|js|scss)")
    .pipe(prettify())
    .pipe(gulp.dest("src"));
});

// Cleaning
gulp.task("clean", () => {
  return gulp.src(["dist/*"], { read: false }).pipe(clean());
});

// Build
gulp.task("build", gulp.series("scss", "css", "js", "images", "html", "other"));

// Watch
const watchDeletedFiles = watcher => {
  watcher.on("unlink", function(_path) {
    console.log("event = ", _path);

    const filePathFromSrc = path.relative(path.resolve("src"), _path);
    const destFilePath = path.resolve("dist", filePathFromSrc);
    del.sync(destFilePath);
  });
};

gulp.task("watch", () => {
  const watcher = gulp.watch("src/**/*");
  watchDeletedFiles(watcher);

  gulp.watch(globs.scss, gulp.series("scss", "bs-reload"));
  gulp.watch(globs.css, gulp.series("css", "bs-reload"));
  gulp.watch(globs.js, gulp.series("js", "bs-reload"));
  gulp.watch(globs.images, gulp.series("images", "bs-reload"));
  gulp.watch(globs.html, gulp.series("html", "bs-reload"));
  gulp.watch(globs.other, gulp.series("other", "bs-reload"));
});

gulp.task("bs-reload", done => {
  browserSync.reload();
  done();
});

gulp.task("server-reload", gulp.series("build", "bs-reload"));

// Gulp - Build + Watch + start-servers
gulp.task("default", gulp.series("clean", "build", "serve", "watch"));
