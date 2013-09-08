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
pkg.initResources();
pkg.require({ 'Gd': '1.0',
              'Gdk': '3.0',
              'GdkPixbuf': '2.0',
              'Gio': '2.0',
              'GLib': '2.0',
              'GObject': '2.0',
              'Gtk': '3.0',
              'GWeather': '3.0',
              'Lang': '',
              'Mainloop': '',
              'Params': '1.0',
              'System': '' });

const Util = imports.util;
const Window = imports.window;
const World = imports.world;
const SearchProvider = imports.searchProvider;

function initEnvironment() {
    window.getApp = function() {
        return Gio.Application.get_default();
    };
}

const Application = new Lang.Class({
    Name: 'WeatherApplication',
    Extends: Gtk.Application,

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

    _initAppMenu: function() {
        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/weather/app-menu.ui');

        let menu = builder.get_object('app-menu');
        this.set_app_menu(menu);
    },

    vfunc_dbus_register: function(connection, path) {
        this.parent(connection, path);

        this._searchProvider.export(connection, path);
        return true;
    },

    vfunc_dbus_unregister: function(connection, path) {
        this._searchProvider.unexport(connection);

        this.parent(connection, path);
    },

    vfunc_startup: function() {
        this.parent();
        Gd.ensure_types();

        Util.loadStyleSheet('/org/gnome/weather/application.css');

        let settings = Gtk.Settings.get_for_screen(Gdk.Screen.get_default());
        settings.gtk_application_prefer_dark_theme = true;

        this.world = GWeather.Location.get_world();
        this.model = new World.WorldModel(this.world);

        this.model.connect('notify::loading', Lang.bind(this, function() {
            if (this.model.loading)
                this.mark_busy();
            else
                this.unmark_busy();
        }));
        if (this.model.loading)
            this.mark_busy();

        Util.initActions(this,
                         [{ name: 'quit',
                            activate: this._onQuit }]);

        let gwSettings = new Gio.Settings({ schema: 'org.gnome.GWeather' });
        this.add_action(gwSettings.create_action('temperature-unit'));

        this._initAppMenu();

        this.add_accelerator("Escape", "win.selection-mode(false)", null);
        this.add_accelerator("<Primary>a", "win.select-all", null);

        if (pkg.pkgdatadir != pkg.moduledir) // running from source
            this.activate();
    },

    vfunc_activate: function() {
        let win = new Window.MainWindow({ application: this });

        if (this.model.loading) {
            let id = this.model.connect('notify::loading', function(model) {
                model.disconnect(id);
                win.show();
            });
        } else {
            win.show();
        }
    },

    vfunc_shutdown: function() {
        GWeather.Info.store_cache();

        this.parent();
    }
});

function main(argv) {
    initEnvironment();

    return (new Application()).run(argv);
}
