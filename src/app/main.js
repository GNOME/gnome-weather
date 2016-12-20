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
pkg.require({ 'Gdk': '3.0',
              'Gio': '2.0',
              'GLib': '2.0',
              'GObject': '2.0',
              'Gtk': '3.0',
              'GWeather': '3.0' });

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const Util = imports.misc.util;
const Window = imports.app.window;
const World = imports.shared.world;
const CurrentLocationController = imports.app.currentLocationController;

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
                      flags: Gio.ApplicationFlags.CAN_OVERRIDE_APP_ID });
        GLib.set_application_name(_("Weather"));
        Gtk.Window.set_default_icon_name("org.gnome.Weather");
    },

    _onQuit: function() {
        this.quit();
    },

    _onShowLocation: function(action, parameter) {
        let location = this.world.deserialize(parameter.deep_unpack());
        let win = this._createWindow();

        let info = this.model.addNewLocation(location, false);
        win.showInfo(info, false);
        this._showWindowWhenReady(win);
    },

    _onShowSearch: function(action, parameter) {
        let text = parameter.deep_unpack();
        let win = this._createWindow();

        win.showSearch(text);
        this._showWindowWhenReady(win);
    },

    _initAppMenu: function() {
        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/Weather/Application/app-menu.ui');

        let menu = builder.get_object('app-menu');
        this.set_app_menu(menu);
    },

    vfunc_startup: function() {
        this.parent();
        // ensure the type before we call to GtkBuilder
        GWeather.LocationEntry;

        Util.loadStyleSheet('/org/gnome/Weather/Application/application.css');

        let settings = Gtk.Settings.get_for_screen(Gdk.Screen.get_default());
        settings.gtk_application_prefer_dark_theme = true;

        this.world = GWeather.Location.get_world();
        this.model = new World.WorldModel(this.world, true);
        this.model.load();
        this.currentLocationController = new CurrentLocationController.CurrentLocationController(this.model);

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
                            activate: this._onQuit },
                          { name: 'show-location',
                            activate: this._onShowLocation,
                            parameter_type: new GLib.VariantType('v') },
                          { name: 'show-search',
                            activate: this._onShowSearch,
                            parameter_type: new GLib.VariantType('s') }]);

        let gwSettings = new Gio.Settings({ schema_id: 'org.gnome.GWeather' });
        // we would like to use g_settings_create_action() here
        // but that does not handle correctly the case of 'default'
        // we would also like to use g_settings_bind_with_mapping(), but that
        // function is not introspectable (two callbacks, one destroy notify)
        // so we hand code the behavior we want
        function resolveDefaultTemperatureUnit(unit) {
            unit = GWeather.TemperatureUnit.to_real(unit);
            if (unit == GWeather.TemperatureUnit.CENTIGRADE)
                return new GLib.Variant('s', 'centigrade');
            else if (unit == GWeather.TemperatureUnit.FAHRENHEIT)
                return new GLib.Variant('s', 'fahrenheit');
            else
                return new GLib.Variant('s', 'default');
        }
        let temperatureAction = new Gio.SimpleAction({
            enabled: true,
            name: 'temperature-unit',
            state: resolveDefaultTemperatureUnit(gwSettings.get_enum('temperature-unit')),
            parameter_type: new GLib.VariantType('s')
        });
        temperatureAction.connect('activate', function(action, parameter) {
            action.change_state(parameter);
        })
        temperatureAction.connect('change-state', function(action, state) {
            gwSettings.set_value('temperature-unit', state);
        });
        gwSettings.connect('changed::temperature-unit', function() {
            temperatureAction.state = resolveDefaultTemperatureUnit(gwSettings.get_enum('temperature-unit'));
        });
        this.add_action(temperatureAction);

        this._initAppMenu();

        this.add_accelerator("Escape", "win.selection-mode", new GLib.Variant('b', false));
        this.add_accelerator("<Primary>a", "win.select-all", null);
    },

    _createWindow: function() {
        return new Window.MainWindow({ application: this });
    },

    _showWindowWhenReady: function(win) {
        let notifyId;

        if (this.model.loading) {
            let timeoutId;
            let model = this.model;

            timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, function() {
                log('Timeout during model load, perhaps the network is not available?');
                model.disconnect(notifyId);
                win.show();
                return false;
            });
            notifyId = this.model.connect('notify::loading', function(model) {
                if (model.loading)
                    return;

                model.disconnect(notifyId);
                GLib.source_remove(timeoutId);
                win.show();
            });
        } else {
            win.show();
        }

        return win;
    },

    vfunc_activate: function() {
        let win = this._createWindow();
        win.showDefault();
        this._showWindowWhenReady(win);
    },

    vfunc_shutdown: function() {
        GWeather.Info.store_cache();
        this.model.saveSettingsNow();

        this.parent();
    }
});

function main(argv) {
    initEnvironment();

    return (new Application()).run(argv);
}
