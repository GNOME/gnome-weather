#!/usr/bin/env python3

import os
import subprocess
import sys

destdir = os.environ.get('DESTDIR', '')
datadir = sys.argv[1]
pkgdatadir = sys.argv[2]
bindir = os.path.join(destdir + os.sep + sys.argv[3])

if not os.path.exists(bindir):
    os.makedirs(bindir)

src = os.path.join(pkgdatadir, 'org.gnome.Weather')
dest = os.path.join(bindir, 'gnome-weather')
subprocess.call(['ln', '-s', '-f', src, dest])

if not destdir:
    print('Updating icon cache...')
    subprocess.call(['gtk-update-icon-cache', '-qtf', os.path.join(datadir, 'icons', 'hicolor')])
    print("Installing new Schemas")
    subprocess.call(['glib-compile-schemas', os.path.join(datadir, 'glib-2.0/schemas')])

