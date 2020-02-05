import gulp from "gulp";
import scss from "gulp-sass";
import less from "gulp-less";
import imagemin from "gulp-imagemin";
import uglify from "gulp-uglify";
import cssnano from "gulp-cssnano";
import htmlmin from "gulp-htmlmin";
import changed from "gulp-changed";
import autoprefixer from "gulp-autoprefixer";
import prettify from "gulp-jsbeautifier";
import gulpIgnore from "gulp-ignore";
import useref from "gulp-useref";
import runSequence from "run-sequence";
import serveStatic from "serve-static";
import compression from "compression";
import express from "express";
import http from "http";
import del from "del";
import fs from "file-system";
import http2 from "spdy";

require("dotenv").config();

// console log changed files using gulpIgnore

const message = function(file) {
  console.log(file.path);
  return false;
};

// server

function serverSetup(protocal) {
  var app = express();
  app.use(compression());
  app.use(
    serveStatic("./dist", {
      extensions: ["html"],
      maxAge: 3600000
    })
  );
  if (protocal === "https") {
    http2
      .createServer(
        {
          key: fs.readFileSync(
            process.env.HOME + process.env.SSL_KEY_PATH,
            "utf8"
          ),
          cert: fs.readFileSync(
            process.env.HOME + process.env.SSL_CRT_PATH,
            "utf8"
          )
        },
        app
      )
      .listen(8888);
  } else {
    http.createServer(app).listen(8888);
  }
  console.log(protocal + "://localhost:8888");
}

gulp.task("server", function() {
  fs.open("./.env", "r", err => {
    if (err) {
      if (err.code === "ENOENT") {
        console.log("no .env file found");
        serverSetup("http");
      }
    } else {
      fs.readFile("./.env", "utf8", (err, data) => {
        if (
          data.indexOf("SSL_CRT_PATH") < 0 ||
          data.indexOf("SSL_KEY_PATH") < 0
        ) {
          console.log("no SSL_CRT_PATH and/or SSL_KEY_PATH found in .env file");
          serverSetup("http");
        } else {
          serverSetup("https");
        }
      });
    }
  });
});

// scss compilation + minification

gulp.task("scss", function() {
  return gulp
    .src("src/scss/**/*.scss")
    .pipe(changed("dist/css", { extension: ".css" }))
    .pipe(gulpIgnore(message))
    .pipe(scss())
    .pipe(
      autoprefixer({
        browsers: [">1%"],
        cascade: false
      })
    )
    .pipe(cssnano())
    .pipe(gulp.dest("dist/css"));
});

// css minification

gulp.task("css", function() {
  return gulp
    .src("src/**/*.css")
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(
      autoprefixer({
        browsers: [">1%"],
        cascade: false
      })
    )
    .pipe(cssnano())
    .pipe(gulp.dest("dist"));
});

// js minification + uglification

gulp.task("js", function() {
  return gulp
    .src("src/**/*.js")
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(uglify())
    .pipe(gulp.dest("dist"));
});

// image optimization

gulp.task("images", function() {
  return gulp
    .src("src/**/*.{png,jpg,jpeg,gif,svg}")
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

gulp.task("html", function() {
  return gulp
    .src("src/**/*.html")
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

gulp.task("other", function() {
  return gulp
    .src([
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
    ])
    .pipe(changed("dist"))
    .pipe(gulpIgnore(message))
    .pipe(gulp.dest("dist"));
});

// Prettify css js html

gulp.task("prettify:src", function() {
  return gulp
    .src("src/**/*.+(html|css|js|less|scss)")
    .pipe(prettify())
    .pipe(gulp.dest("src"));
});

// Cleaning

gulp.task("clean", function() {
  return del.sync("dist");
});

gulp.task("clean:code", function() {
  return del.sync([
    "dist/**/*.*",
    "!dist/**/*.png",
    "!dist/**/*.jpg",
    "!dist/**/*.jpeg",
    "!dist/**/*.gif",
    "!dist/**/*.svg"
  ]);
});

// Build

gulp.task("build", function(callback) {
  runSequence("scss", "less", "css", "js", "images", "html", "other", callback);
});

// Watch

gulp.task("watch", function() {
  gulp.watch("src/**/*", ["build"]);
});

// Gulp - Build + Watch + start-servers

gulp.task("default", function(callback) {
  runSequence("build", "watch", "server", callback);
});
