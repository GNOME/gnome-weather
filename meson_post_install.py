#!/usr/bin/env python3

import os
import subprocess
import sys

destdir = os.environ.get('DESTDIR', '')
pkgdatadir = sys.argv[1]
bindir = os.path.join(destdir + os.sep + sys.argv[2])
app_id = sys.argv[3]

if not os.path.exists(bindir):
    os.makedirs(bindir)

src = os.path.join(pkgdatadir, app_id)
dest = os.path.join(bindir, 'gnome-weather')
subprocess.call(['ln', '-s', '-f', src, dest])
