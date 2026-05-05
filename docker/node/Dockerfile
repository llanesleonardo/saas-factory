# Factory + workspace Node toolchain (native addons e.g. better-sqlite3).
FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
  CHOKIDAR_USEPOLLING=true

CMD ["sleep", "infinity"]
