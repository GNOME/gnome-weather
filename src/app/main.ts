// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
//
// Gnome Weather is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by the
// Free Software Foundation; either version 2 of the License, or (at your
// option) any later version.
//
// Gnome Weather is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
// for more details.
//
// You should have received a copy of the GNU General Public License along
// with Gnome Weather; if not, write to the Free Software Foundation,
// Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

import 'gi://Gdk?version=4.0';
import 'gi://Gio?version=2.0';
import 'gi://GLib?version=2.0';
import 'gi://GObject?version=2.0';
import 'gi://Gtk?version=4.0';
import 'gi://Adw?version=1';
import 'gi://GWeather?version=4.0';

import * as system from 'system';

import Gio from 'gi://Gio';

import {WeatherApplication} from './application.js';

pkg.initFormat();
pkg.initGettext();

declare global {
    function ngettext(msgid: string, msgid_plural: string, n: number): string;
    function getApp(): WeatherApplication | undefined;
}

globalThis.ngettext = imports.gettext.ngettext;
globalThis.getApp = function (): WeatherApplication | undefined {
    const app = Gio.Application.get_default();
    return app ? (app as WeatherApplication) : undefined;
};

const application = new WeatherApplication();

setTimeout(() => {
    imports.mainloop.quit('gnome-weather');

    const code = application.run([
        system.programInvocationName,
        ...system.programArgs,
    ]);

    if (code !== 0) system.exit(code);
});

imports.mainloop.run('gnome-weather');
