
exports.for = function (API) {

	var dockerVarNames = [
		"DOCKER_TLS_VERIFY",
		"DOCKER_HOST",
		"DOCKER_CERT_PATH",
	];

	var exports = {};

	exports.resolve = function (resolver, config, previousResolvedConfig) {

		return resolver({}).then(function (resolvedConfig) {

			var programDescriptorPath = API.getRootPath();

			API.ASSERT.equal(typeof resolvedConfig.name, "string", "config['github.com/pinf-to/pinf-to-docker/0'].name' must be set in '" + programDescriptorPath + "'");
			API.ASSERT.equal(typeof resolvedConfig.sourcePath, "string", "config['github.com/pinf-to/pinf-to-docker/0'].sourcePath' must be set in '" + programDescriptorPath + "'");
			API.ASSERT.equal(typeof resolvedConfig.template, "string", "config['github.com/pinf-to/pinf-to-docker/0'].template' must be set in '" + programDescriptorPath + "'");
			API.ASSERT.equal(typeof resolvedConfig.docker, "object", "config['github.com/pinf-to/pinf-to-docker/0'].docker' must be set in '" + programDescriptorPath + "'");
			API.ASSERT.equal(typeof resolvedConfig.docker.username, "string", "config['github.com/pinf-to/pinf-to-docker/0'].docker.username' must be set in '" + programDescriptorPath + "'");
			API.ASSERT.equal(typeof resolvedConfig.docker.tag, "string", "config['github.com/pinf-to/pinf-to-docker/0'].docker.tag' must be set in '" + programDescriptorPath + "'");
			API.ASSERT.equal(typeof resolvedConfig.docker.port !== "undefined", true, "config['github.com/pinf-to/pinf-to-docker/0'].docker.port' must be set in '" + programDescriptorPath + "'");

			function ensureBootToDocker (verify) {
				// TODO: Bypass this if we can call docker directly.
				// TODO: Get this working on all OSes.

				// OSX
				var lookup = false;
				dockerVarNames.forEach(function (name) {
					if (lookup) return;
					if (resolvedConfig.docker[name] === "") {
						lookup = true;
					}
				});
				if (!lookup) {
					return API.Q.resolve();
				}
				if (verify) {
					return API.Q.reject(new Error("Unable to discover docker environment!"));
				}
				return API.Q.nbind(API.runCommands, API)([
					"boot2docker shellinit"
				], {}).then(function (stdout) {
					stdout.split("\n").forEach(function (line) {
						var m = line.match(/^\s*export\s*([A-Z_]+)=(.*)$/);
						if (m) {
							resolvedConfig.docker[m[1]] = m[2];
						}
					});
					return ensureBootToDocker(true);
				});
			}

			return ensureBootToDocker().then(function () {

				return resolvedConfig;
			});
		});
	}

	exports.turn = function (resolvedConfig) {

		return API.ASYNC([
			"GULP",
			"GULP_DEBUG",
			"GULP_PLUMBER",
			"GULP_RENAME",
			"GULP_REPLACE"
		], function (GULP, GULP_DEBUG, GULP_PLUMBER, GULP_RENAME, GULP_REPLACE) {

			return API.Q.denodeify(function (callback) {

				var programDescriptorPath = API.getRootPath();
				var programDescriptor = API.programDescriptor;

				var programName = resolvedConfig.name;

				var fromPath = resolvedConfig.sourcePath;
				var pubPath = API.getTargetPath();

				var templatePath = API.PATH.join(__dirname, "templates", resolvedConfig.template);
				var templateDescriptorPath = API.PATH.join(templatePath, "package.json");
				var templateDescriptor = API.FS.readJsonSync(templateDescriptorPath);

				API.ASSERT.equal(typeof templateDescriptor.directories.deploy, "string", "'directories.deploy' must be set in '" + templateDescriptorPath + "'");

				function copyFiles (fromPath, toPath, callback) {

					console.log("Copying and transforming program from", fromPath, "to", toPath);

					// TODO: Use generic copy and transform function that respects ignore rules.

					return API.FS.remove(toPath, function (err) {
						if (err) return callback(err);

						function copy (fromPath, toPath, callback) {

							console.log("Copying fileset", fromPath, "to", toPath, "...");

							return API.FS.copy(fromPath, toPath, callback);
						}

						return copy(API.PATH.join(templatePath, "image"), toPath, function (err) {
							if (err) return callback(err);

							return copy(fromPath, API.PATH.join(toPath, templateDescriptor.directories.deploy), callback);
						});
					});
				}

				function buildImage (callback) {

					console.log("Building image ...");

					var env = {};
					for (var name in process.env) {
						env[name] = process.env[name];
					}
					dockerVarNames.forEach(function (name) {
						env[name] = resolvedConfig.docker[name];
					});
					return API.runCommands([
						'docker build -t ' + resolvedConfig.docker.username + '/' + programName + ':' + resolvedConfig.docker.tag + ' .'
	//					'docker build --no-cache -t ' + resolvedConfig.docker.username + '/' + programName + ':' + resolvedConfig.docker.tag + ' .'
					], {
						cwd: pubPath,
						env: env
					}, function (err, response) {
						if (err) {
							if (
								/\/var\/run\/docker\.sock: no such file or directory/.test(err.stderr) ||
								/\not running/.test(err.stderr)
							) {
								if (
									process.platform === "darwin" &&
									!process.env.DOCKER_HOST
								) {
									console.error("\n\n  NOTE: Have you started boot2docker?:\n\n    boot2docker up\n\n");
								}
							}
							return callback(err);
						}

						return callback(null);
					});
				}

				return copyFiles(fromPath, pubPath, function (err) {
					if (err) return callback(err);

					return buildImage(callback);
				});
			})();
		});
	}

	exports.spin = function (resolvedConfig) {

console.log("pinf to docker spin", resolvedConfig);

		return API.Q.denodeify(function (callback) {

			var programDescriptorPath = API.getRootPath();
			var programDescriptor = API.programDescriptor;

			var programName = resolvedConfig.name;

			var fromPath = resolvedConfig.sourcePath;
			var pubPath = API.getTargetPath();

			var templatePath = API.PATH.join(__dirname, "templates", resolvedConfig.template);
			var templateDescriptorPath = API.PATH.join(templatePath, "package.json");
			var templateDescriptor = API.FS.readJsonSync(templateDescriptorPath);

			var templateConfig = templateDescriptor.config["github.com/pinf-to/pinf-to-docker/0"];


			function runImage (callback) {

				var env = {};
				for (var name in process.env) {
					env[name] = process.env[name];
				}
				dockerVarNames.forEach(function (name) {
					env[name] = resolvedConfig.docker[name];
				});

				function startPortForwarding (callback) {
					// TODO: Bypass this if not needed.

					var proc = API.SPAWN("boot2docker", [
				        "ssh",
				        "-vnNTL",
				        resolvedConfig.docker.port + ":localhost:" + resolvedConfig.docker.port
				    ], {
				    	env: env
				    });
				    proc.on("error", function(err) {
				    	return callback(err);
				    });
				    proc.stdout.on('data', function (data) {
						if (API.DEBUG) {
							process.stdout.write(data);
						}
				    });
				    proc.stderr.on('data', function (data) {
				    	if (/Local forwarding listening on 127\.0\.0\.1 port/.test(data.toString())) {
						    // TODO: Timeout if callback does not get triggered!
							callback(null, function () {
						    	proc.kill();
						    });
					    }
						if (API.DEBUG) {
							process.stderr.write(data);
						}
				    });
				}

				return startPortForwarding(function (err, stopPortForwarding) {
					if (err) return callback(err);

					var command = [];
					command.push('docker -D run');
					if (resolvedConfig.bindSourcePath) {

						function syncSourceAndWatch () {
							// boot2docker only shares /Users so we need to create a symlink.
							// TODO: Skip this if not needed.
							var linkName = API.CRYPTO.createHash("sha1").update(fromPath).digest("hex");
							var linkPath = API.PATH.join(process.env.HOME, ".pgs_short_links", linkName);
							if (!API.FS.existsSync(API.PATH.dirname(linkPath))) {
								API.FS.mkdirsSync(API.PATH.dirname(linkPath));
							}
							if (API.FS.existsSync(linkPath)) {
								API.FS.removeSync(linkPath);
							}
							API.FS.copySync(fromPath, linkPath);
							command.push('-v ' + linkPath + ':' + templateDescriptor.directories.mount);

							// TODO: Re-sync files on change. Until then we crudly re-copy them!
							setInterval(function () {
								API.EXEC('cp -Rf "' + fromPath + '" "' + linkPath + '.tmp"; rm -Rf "' + linkPath + '" ; mv "' + linkPath + '.tmp" "' + linkPath + '"');
							}, 5 * 1000);
						}

						syncSourceAndWatch();
					}
					command.push('-p ' + resolvedConfig.docker.port + ':' + templateConfig.docker.port);
					command.push(resolvedConfig.docker.username + '/' + programName + ':' + resolvedConfig.docker.tag);
					command.push(templateConfig.docker.run.args.join(' '));


					return API.runProgramProcess({
						label: API.getDeclaringPathId() + "/" + resolvedConfig.$to,
						commands: [
							command.join(" ")
						],
						cwd: pubPath,
						env: env
					}, function (err) {

						stopPortForwarding();

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
				});
			}

			return runImage(callback);
		})();
	}

	return exports;
}
