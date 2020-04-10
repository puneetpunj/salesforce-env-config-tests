FROM node

RUN mkdir -p mnt

COPY . mnt/
RUN cd mnt && npm i

CMD cd mnt && npm run comparison