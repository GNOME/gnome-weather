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

pkg.initGettext();
pkg.initFormat();
pkg.require({ 'Gio': '2.0',
              'GLib': '2.0',
              'GObject': '2.0',
              'GWeather': '3.0' });

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GWeather = imports.gi.GWeather;

const Util = imports.misc.util;
const SearchProvider = imports.service.searchProvider;
const World = imports.shared.world;

function initEnvironment() {
    window.getApp = function() {
        return Gio.Application.get_default();
    };
}

const BackgroundService = GObject.registerClass(
    class WeatherBackgroundService extends Gio.Application {

    _init() {
        super._init({ application_id: pkg.name,
                      flags: Gio.ApplicationFlags.IS_SERVICE,
                      inactivity_timeout: 60000 });
        GLib.set_application_name(_("Weather"));

        this._searchProvider = new SearchProvider.SearchProvider(this);

        if (!pkg.moduledir.startsWith('resource://'))
            this.debug = true;
    }

    _onQuit() {
        this.quit();
    }

    vfunc_dbus_register(connection, path) {
        super.vfunc_dbus_register(connection, path);

        this._searchProvider.export(connection, path);
        return true;
    }

/*
  Can't do until GApplication is fixed.

    vfunc_dbus_unregister(connection, path) {
        this._searchProvider.unexport(connection);

        super.vfunc_dbus_unregister(connection, path);
    },
*/

    vfunc_startup() {
        super.vfunc_startup();

        this.world = GWeather.Location.get_world();
        this.model = new World.WorldModel(this.world, false);
        this.model.load();

        if (this.debug) {
            this.model.getAll().forEach(function(info) {
                log(info.location.get_city_name());
            });
        }

        let quitAction = new Gio.SimpleAction({
            enabled: true,
            name: 'quit'
        });
        quitAction.connect('activate', () => this._onQuit());
        this.add_action(quitAction);
    }

    vfunc_activate() {
        // do nothing, this is a background service
    }

    vfunc_shutdown() {
        GWeather.Info.store_cache();

        super.vfunc_shutdown();
    }
});

function main(argv) {
    initEnvironment();

    return (new BackgroundService()).run(argv);
}
