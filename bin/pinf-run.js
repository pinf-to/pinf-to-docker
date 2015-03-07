
require("to.pinf.lib/lib/run").for(module, function (API, callback) {

return API.getPrograms(function (err, programs) {
		if (err) return callback(err);

		var waitfor = API.WAITFOR.serial(callback);
		
		for (var programDescriptorPath in programs) {
			waitfor(programDescriptorPath, function (programDescriptorPath, done) {

				try {

					programDescriptor = programs[programDescriptorPath];

					API.ASSERT.equal(typeof programDescriptor.combined.name, "string", "name' must be set in '" + programDescriptorPath + "'");

					var programName = programDescriptor.combined.name.toLowerCase();

					console.log("Run program (" + programName + "):", programDescriptorPath);

					var config = API.getConfigFrom(programDescriptor.combined, "github.com/pinf-to/pinf-to-docker/0");

					API.ASSERT.equal(typeof config.docker, "object", "config['github.com/pinf-to/pinf-to-docker/0'].docker' must be set in '" + programDescriptorPath + "'");
					API.ASSERT.equal(typeof config.docker.username, "string", "config['github.com/pinf-to/pinf-to-docker/0'].docker.username' must be set in '" + programDescriptorPath + "'");
					API.ASSERT.equal(typeof config.docker.tag, "string", "config['github.com/pinf-to/pinf-to-docker/0'].docker.tag' must be set in '" + programDescriptorPath + "'");

					var pubPath = API.PATH.join(programDescriptorPath, "../.pub");

					var templatePath = API.PATH.join(__dirname, "../templates", config.template);
					var templateDescriptorPath = API.PATH.join(templatePath, "package.json");
					var templateDescriptor = API.FS.readJsonSync(templateDescriptorPath);

					var templateConfig = API.getConfigFrom(templateDescriptor, "github.com/pinf-to/pinf-to-docker/0");

					API.ASSERT.equal(typeof templateConfig.docker, "object", "'directories.deploy' must be set in '" + templateDescriptorPath + "'");
					API.ASSERT.equal(typeof templateConfig.docker.port, "number", "config['github.com/pinf-to/pinf-to-docker/0'].docker.port' must be set in '" + templateDescriptorPath + "'");
					API.ASSERT.equal(typeof templateConfig.docker.run, "object", "config['github.com/pinf-to/pinf-to-docker/0'].docker.run' must be set in '" + templateDescriptorPath + "'");
					API.ASSERT.equal(Array.isArray(templateConfig.docker.run.args), true, "config['github.com/pinf-to/pinf-to-docker/0'].docker.run.args' must be set in '" + templateDescriptorPath + "'");

					function runImage (callback) {

						console.log("Starting image ...");

						API.ASSERT.equal(typeof process.env.PORT, "string", "process.env.PORT' must be set");

						return API.runCommands([
							'docker run -p ' + process.env.PORT + ':' + templateConfig.docker.port + ' ' + config.docker.username + '/' + programName + ':' + config.docker.tag + ' ' + templateConfig.docker.run.args.join(' ')
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

					return runImage(done);
					
				} catch (err) {
					return done(err);
				}
			});
		}

		return waitfor();
	});
});
