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
              'Gdk': '3.0',
              'GdkPixbuf': '2.0',
              'Gio': '2.0',
              'GLib': '2.0',
              'GObject': '2.0',
              'Gtk': '3.0',
              'GWeather': '3.0',
              'Lang': '1.0',
              'Mainloop': '1.0',
              'Params': '1.0',
              'System': '1.0' });

const Util = imports.util;
const Window = imports.window;

const Application = new Lang.Class({
    Name: 'WeatherApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: 'org.gnome.Weather.Application' });
        GLib.set_application_name(_("Weather"));
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

    vfunc_startup: function() {
        this.parent();

        let resource = Gio.Resource.load(pkg.pkgdatadir + '/gnome-weather.gresource');
        resource._register();

        Util.loadStyleSheet(Gio.file_new_for_uri('resource:///org/gnome/weather/application.css'));

        let settings = Gtk.Settings.get_for_screen(Gdk.Screen.get_default());
        settings.gtk_application_prefer_dark_theme = true;

        this.world = GWeather.Location.new_world(false);

        Util.initActions(this,
                         [{ name: 'quit',
                            callback: this._onQuit }]);

        this._initAppMenu();
    },

    vfunc_activate: function() {
        (new Window.MainWindow({ application: this })).show();
    }
});

function main(argv) {
    return (new Application()).run(argv);
}
