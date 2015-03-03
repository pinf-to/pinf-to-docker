PINF to Docker
==============

Publish PINF JavaScript Bundles to a docker image.

Any portable bundle may be published.



Install
=======

### OSX:

#### One-time:

Install docker: http://docs.docker.com/installation/mac/

    boot2docker init
    # https://github.com/boot2docker/boot2docker/blob/master/doc/WORKAROUNDS.md
    VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port49000,tcp,,49000,,49000";

Activate:

    bin/activate.sh    # runs boot2docker start

Examples:

    cd demos/PHP
    npm run-script publish --ignore-dirty
    npm run-script run
    open http://localhost:49000/


NOTES
=====

  * Docker
    * http://docs.docker.com/userguide/
    * https://docs.docker.com/reference/builder/

  * `templates/php`
    * https://github.com/phusion/baseimage-docker
    * https://github.com/pinf-to/docker-nginx-php
