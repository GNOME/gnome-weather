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

pkg.initSubmodule('libgd');
pkg.initGettext();
pkg.initFormat();
pkg.require({ 'Gd': '1.0',
              'Gio': '2.0',
              'GLib': '2.0',
              'GObject': '2.0',
              'GWeather': '3.0' });

const Gd = imports.gi.Gd;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const Util = imports.misc.util;
const SearchProvider = imports.service.searchProvider;
const World = imports.shared.world;

function initEnvironment() {
    window.getApp = function() {
        return Gio.Application.get_default();
    };
}

const BackgroundService = new Lang.Class({
    Name: 'WeatherBackgroundService',
    Extends: Gio.Application,

    _init: function() {
        this.parent({ application_id: pkg.name,
                      flags: Gio.ApplicationFlags.IS_SERVICE,
                      inactivity_timeout: 60000 });
        GLib.set_application_name(_("Weather"));

        this._searchProvider = new SearchProvider.SearchProvider(this);
    },

    _onQuit: function() {
        this.quit();
    },

    vfunc_dbus_register: function(connection, path) {
        this.parent(connection, path);

        this._searchProvider.export(connection, path);
        return true;
    },

/*
  Can't do until GApplication is fixed.

    vfunc_dbus_unregister: function(connection, path) {
        this._searchProvider.unexport(connection);

        this.parent(connection, path);
    },
*/

    vfunc_startup: function() {
        this.parent();

        this.world = GWeather.Location.get_world();
        this.model = new World.WorldModel(this.world, false);

        Util.initActions(this,
                         [{ name: 'quit',
                            activate: this._onQuit }]);
    },

    vfunc_activate: function() {
        // do nothing, this is a background service
    },

    vfunc_shutdown: function() {
        GWeather.Info.store_cache();

        this.parent();
    }
});

function main(argv) {
    initEnvironment();

    return (new BackgroundService()).run(argv);
}
