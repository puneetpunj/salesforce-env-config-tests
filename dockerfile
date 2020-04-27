FROM node

RUN mkdir -p mnt

COPY . mnt/
RUN cd mnt && npm i

CMD cd mnt && npm run comparison && echo "Check detailed execution report in \"execution-report\" folder."