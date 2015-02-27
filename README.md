PINF to Docker
==============

Publish PINF JavaScript Bundles to a docker image.

Any portable bundle may be published.



Install
-------

### MAC:

One-time:

  * Install docker: http://docs.docker.com/installation/mac/

    boot2docker init
    # https://github.com/boot2docker/boot2docker/blob/master/doc/WORKAROUNDS.md
    VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port49000,tcp,,49000,,49000";
    boot2docker start

Activate:

    bin/activate.sh

Examples:

    cd demos/PHP
    npm run-script publish --ignore-dirty
    npm run-script run
    open http://localhost:49000/
