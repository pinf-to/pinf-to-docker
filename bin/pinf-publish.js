
require("to.pinf.lib/lib/publish").for(module, function (API, callback) {

	return API.getPrograms(function (err, programs) {
		if (err) return callback(err);

		var waitfor = API.WAITFOR.serial(callback);
		
		for (var programDescriptorPath in programs) {
			waitfor(programDescriptorPath, function (programDescriptorPath, done) {

				try {

					programDescriptor = programs[programDescriptorPath];

					API.ASSERT.equal(typeof programDescriptor.combined.name, "string", "name' must be set in '" + programDescriptorPath + "'");

					var programName = programDescriptor.combined.name.toLowerCase();

					console.log("Publish program (" + programName + "):", programDescriptorPath);

					var config = API.getConfigFrom(programDescriptor.combined, "github.com/pinf-to/pinf-to-docker/0");

					API.ASSERT.equal(typeof config.template, "string", "config['github.com/pinf-to/pinf-to-docker/0'].template' must be set in '" + programDescriptorPath + "'");
					API.ASSERT.equal(typeof config.docker, "object", "config['github.com/pinf-to/pinf-to-docker/0'].docker' must be set in '" + programDescriptorPath + "'");
					API.ASSERT.equal(typeof config.docker.username, "string", "config['github.com/pinf-to/pinf-to-docker/0'].docker.username' must be set in '" + programDescriptorPath + "'");
					API.ASSERT.equal(typeof config.docker.tag, "string", "config['github.com/pinf-to/pinf-to-docker/0'].docker.tag' must be set in '" + programDescriptorPath + "'");

					var fromPath = API.PATH.dirname(programDescriptorPath);
					var pubPath = API.PATH.join(programDescriptorPath, "../.pub");

					var templatePath = API.PATH.join(__dirname, "../templates", config.template);
					var templateDescriptorPath = API.PATH.join(templatePath, "package.json");
					var templateDescriptor = API.FS.readJsonSync(templateDescriptorPath);

					API.ASSERT.equal(typeof templateDescriptor.directories.deploy, "string", "'directories.deploy' must be set in '" + templateDescriptorPath + "'");

					function copyFiles (fromPath, toPath, callback) {

						console.log("Copying and transforming program from", fromPath, "to", toPath, "using config", config);

						return API.FS.remove(toPath, function (err) {
							if (err) return callback(err);

							function copy (fromPath, toPath, callback) {

								console.log("Copying and transforming fileset", fromPath, "to", toPath, "...");

								var domain = require('domain').create();
								domain.on('error', function(err) {
									// The error won't crash the process, but what it does is worse!
									// Though we've prevented abrupt process restarting, we are leaking
									// resources like crazy if this ever happens.
									// This is no better than process.on('uncaughtException')!
									console.error("UNHANDLED DOMAIN ERROR:", err.stack, new Error().stack);
									process.exit(1);
								});
								domain.run(function() {

									try {

										var destinationStream = API.GULP.dest(toPath);

										destinationStream.once("error", function (err) {
											return callback(err);
										});

										destinationStream.once("end", function () {

											console.log("... done");

											return callback();
										});

										var filter = API.GULP_FILTER(['index.php']);

										// TODO: Respect gitignore by making pinf walker into gulp plugin. Use pinf-package-insight to load ignore rules.
										var stream = API.GULP.src([
											"**",
											"!.pub/",
											"!.pub/**",
											"!npm-debug.log",
											"!node_modules/",
											"!node_modules/**"
										], {
											cwd: fromPath
										})
											.pipe(API.GULP_PLUMBER())
											.pipe(API.GULP_DEBUG({
												title: '[pinf-to-docker]',
												minimal: true
											}))
											.pipe(filter)
											// TODO: Add generic variables here and move to `to.pinf.lib`.
											.pipe(API.GULP_REPLACE(/\{\{message\}\}/g, 'Hello World'))
											.pipe(filter.restore())
											.pipe(API.GULP_RENAME(function (path) {
												const re = /(^|\/)(_NAME_)(\/|$)/;
												if (path.basename === "_NAME_") {
													path.basename = programName;
												} else
												if (re.test(path.dirname)) {
													path.dirname = path.dirname.replace(re, "$1" + programName + "$3");
												}
											}))
											.pipe(destinationStream);

										return stream.once("error", function (err) {
											err.message += " (while running gulp)";
											err.stack += "\n(while running gulp)";
											return callback(err);
										});
									} catch (err) {
										return callback(err);
									}
								});
							}

							return copy(API.PATH.join(templatePath, "image"), toPath, function (err) {
								if (err) return callback(err);

								return copy(fromPath, API.PATH.join(toPath, templateDescriptor.directories.deploy), callback);
							});
						});
					}

					function buildImage (callback) {

						console.log("Building image ...");

						return API.runCommands([
							'docker build -t ' + config.docker.username + '/' + programName + ':' + config.docker.tag + ' .'
						], {
							cwd: pubPath
						}, function (err, response) {
							if (err) {
								if (/\/var\/run\/docker\.sock: no such file or directory/.test(err.stderr)) {
									if (
										process.platform === "darwin" &&
										!process.env.DOCKER_HOST
									) {
										console.error("\n\n  NOTE: Have you started boot2docker?:\n\n    boot2docker start\n\n");
									}
								}
								return callback(err);
							}

							return callback(null);
						});
					}

					return copyFiles(fromPath, pubPath, function (err) {
						if (err) return done(err);

						return buildImage(done);
					});
					
				} catch (err) {
					return done(err);
				}
			});
		}

		return waitfor();
	});
});
