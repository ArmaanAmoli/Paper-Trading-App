FROM python:3.12-slim

EXPOSE 8000 8001

WORKDIR /app

COPY requirement*.txt .
RUN pip install --no-cache-dir -r $(ls requirement*.txt | head -n 1)

RUN mkdir -p /var/log && \
    touch /var/log/fastapihttp.logs /var/log/fastapiws.logs && \
    chmod 666 /var/log/fastapihttp.logs /var/log/fastapiws.logs

COPY ./Main ./Main
COPY startservers.sh ./startservers.sh

RUN apt-get update && apt-get install -y dos2unix && \
    dos2unix ./startservers.sh && \
    chmod +x ./startservers.sh

# 6. Run via explicit bash execution
CMD ["/bin/bash", "./startservers.sh"]