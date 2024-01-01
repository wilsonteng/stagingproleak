#!/bin/bash

set -eo pipefail

cd /home/${USER}/git/proleak.github.io/

python3 main.py
python3 read_sql_and_output_json.py

git add assets/data.json
git commit -m "Update data $(date +%F)"
git push
