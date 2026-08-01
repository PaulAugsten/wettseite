#!/bin/bash

OUTPUT=/volume2/homes/Paul/projects/wettsite/output/scraper
mkdir -p "$OUTPUT"

LOG="$OUTPUT/scraper.log"
exec >> "$LOG" 2>&1

set -e
trap 'echo "FAILED at line $LINENO (exit $?)"' ERR

export HOME=/root
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

REPO=/volume2/docker/wettsite/repo
IMAGE=wettsite-scraper
CONTAINER=wettsite-matches
INTERVAL=300

echo "=== $(date -Is) daily scrape ==="

# --- rebuild the image if there are new commits -------------------------
cd "$REPO"
before=$(git rev-parse HEAD)
git pull --quiet --ff-only
if [ "$(git rev-parse HEAD)" != "$before" ]; then
    echo "new commits - rebuilding image"
    docker build -f Dockerfile.scraper -t "$IMAGE" .
fi

# --- stop the loop so it never scrapes alongside the daily pass ---------
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

# --- daily pass ---------------------------------------------------------
docker run --rm --env-file "$REPO/.env" \
    -v "$OUTPUT:/app/output/scraper" \
    "$IMAGE" pnpm scrape:tournaments --persist --recent

docker run --rm --env-file "$REPO/.env" \
    -v "$OUTPUT:/app/output/scraper" \
    "$IMAGE" pnpm scrape:matches --persist --active

# --- is anything live right now? ----------------------------------------
set -a
. "$REPO/.env"
set +a

live=$(curl -s -D - -o /dev/null \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0" \
    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/tournaments?status=eq.live&select=id" \
    | grep -i '^content-range:' | sed 's|.*/||' | tr -d '\r\n ') || true

start_loop() {
    docker run -d --name "$CONTAINER" --restart unless-stopped \
        --env-file "$REPO/.env" \
        -v "$OUTPUT:/app/output/scraper" \
        --log-opt max-size=10m --log-opt max-file=3 \
        "$IMAGE" sh -c "while true; do pnpm scrape:matches --persist --active || true; sleep $INTERVAL; done"
}

case "$live" in
    '' | *[!0-9]*)
        echo "live count unreadable ('$live') - starting the loop anyway"
        start_loop
        ;;
    0)
        echo "no live tournaments - loop stays stopped"
        ;;
    *)
        echo "$live live tournament(s) - starting the loop"
        start_loop
        ;;
esac

echo "=== $(date -Is) finished ==="

tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG" || true