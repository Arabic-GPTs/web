#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Generate public/new_bots.json from the shared Arabic specification."""

from __future__ import annotations

import json
import re
from pathlib import Path

SPEC_TEXT = '''
