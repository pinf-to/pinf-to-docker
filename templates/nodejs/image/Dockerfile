
# Use phusion/baseimage as base image. To make your builds reproducible, make
# sure you lock down to a specific version, not to `latest`!
# See https://github.com/phusion/baseimage-docker/blob/master/Changelog.md for
# a list of version numbers.

FROM phusion/baseimage:0.9.16

MAINTAINER Christoph Dorn <christoph@christophdorn.com>


# Use baseimage-docker's init system.

CMD ["/sbin/my_init"]


RUN DEBIAN_FRONTEND=noninteractive apt-get -qy update
RUN DEBIAN_FRONTEND=noninteractive apt-get -qy install build-essential libssl-dev git man curl


# https://github.com/creationix/nvm
# https://brainsiqdeveloper.wordpress.com/2013/11/21/docker-from-development-to-release/
RUN git clone https://github.com/creationix/nvm.git /.nvm
RUN echo '. /.nvm/nvm.sh' >> /etc/bash.bashrc
RUN /bin/bash -c '. /.nvm/nvm.sh && nvm install 0.10 && nvm use 0.10 && nvm alias default 0.10 && ln -s /.nvm/v0.10.*/bin/node /usr/bin/node && ln -s /.nvm/v0.10.*/bin/npm /usr/bin/npm'


EXPOSE 5000
ADD /etc/service /etc/service
ADD /opt/services /opt/services


# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*


ENTRYPOINT ["/bin/bash", "--login", "-i", "-c"]
