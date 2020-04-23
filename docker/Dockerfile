FROM node:8-stretch-slim

# setup env
ENV LANG="C.UTF-8" APP="/srv/app" USER="node" INST="/srv"

# remove existing user and create new one
RUN deluser ${USER} && \
    adduser --home ${APP} --shell /bin/bash --disabled-login --gecos "user" ${USER}

# install deps
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 4B7C549A058F8B6B && \
    echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.2 main" > /etc/apt/sources.list.d/mongodb.list && \
    apt-get update && \
    apt-get -y install git mongodb-org-shell && \
    rm /etc/apt/sources.list.d/mongodb.list && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# copy all files
COPY app ${APP}/cexplorer/app
COPY bin ${APP}/cexplorer/bin
COPY config ${APP}/cexplorer/config
COPY routes ${APP}/cexplorer/routes
COPY app.js nodemon.json package.json run.sh startup.js yarn.lock ${APP}/cexplorer/

# install cexplorer
WORKDIR ${APP}/cexplorer
RUN yarn install && \
    yarn cache clean

# set permissions
RUN chown -R ${USER}:${USER} ${APP}

USER ${USER}
EXPOSE 8081
# run cexplorer
CMD /bin/bash run.sh
