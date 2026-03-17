#!/bin/bash
set -e

npm install --ignore-scripts 2>/dev/null || true

npm run db:migrate 2>/dev/null || true
