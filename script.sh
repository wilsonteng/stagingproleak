#!/bin/bash

set -eo pipefail

cd /home/${USER}/git/proleak.github.io/

python3 main.py
python3 read_sql_and_output_json.py

git add .
git commit -m "Update $(date +%F)"
git push