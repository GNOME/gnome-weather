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

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';

// ensure the type before we call to GtkBuilder
import './entry.js';

import * as Window from './window.js';
import * as World from '../shared/world.js';
import * as CurrentLocationController from './currentLocationController.js';

import { ShellIntegration } from './shell.js';

export class WeatherApplication extends Adw.Application {

    constructor() {
        super({
            applicationId: pkg.name,
            resourceBasePath: '/org/gnome/Weather',
        });
        let name_prefix = '';

        GLib.set_application_name(name_prefix + _("Weather"));
        Gtk.Window.set_default_icon_name(pkg.name);

        this._mainWindow = undefined;
    }

    get mainWindow() {
        return this._mainWindow;
    }

    set mainWindow(value) {
        this._mainWindow = value;
    }

    _onQuit() {
        this.quit();
    }

    _onShowLocation(action, parameter) {
        let location = this.world.deserialize(parameter.deep_unpack());
        let win = this._createWindow();

        let info = this.model.addNewLocation(location, false);
        win.showInfo(info, false);
        this._showWindowWhenReady(win);
    }

    _onShowSearch(action, parameter) {
        let text = parameter.deep_unpack();
        let win = this._createWindow();

        win.showSearch(text);
        this._showWindowWhenReady(win);
    }

    vfunc_startup() {
        super.vfunc_startup();

        this.world = GWeather.Location.get_world();
        this.model = new World.WorldModel(this.world, true);
        this.currentLocationController = new CurrentLocationController.CurrentLocationController(this.model);

        this.model.load();


        this.model.connect('notify::loading', () => {
            if (this.model.loading)
                this.mark_busy();
            else
                this.unmark_busy();
        });
        if (this.model.loading)
            this.mark_busy();

        let quitAction = new Gio.SimpleAction({
            enabled: true,
            name: 'quit'
        });
        quitAction.connect('activate', () => this._onQuit());
        this.add_action(quitAction);

        let showLocationAction = new Gio.SimpleAction({
            enabled: true,
            name: 'show-location',
            parameter_type: new GLib.VariantType('v'),
        });
        showLocationAction.connect('activate', (action, parameter) => {
            this._onShowLocation(action, parameter);
        });
        this.add_action(showLocationAction);

        let showSearchAction = new Gio.SimpleAction({
            enabled: true,
            name: 'show-search',
            parameter_type: new GLib.VariantType('v'),
        })
        showSearchAction.connect('activate', (action, parameter) => {
            this._onShowSearch(action, parameter);
        });
        this.add_action(showSearchAction);

        let gwSettings = new Gio.Settings({ schema_id: 'org.gnome.GWeather4' });
        // Sync settings changes to the legacy GTK3 GWeather interface if it is
        // available
        let legacyGwSettings;
        try {
            legacyGwSettings = new Gio.Settings({ schema_id: 'org.gnome.GWeather' });
        } catch { }

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
        temperatureAction.connect('activate', function (_, parameter) {
            gwSettings.set_value('temperature-unit', parameter);
            if (legacyGwSettings) {
                legacyGwSettings.set_value('temperature-unit', parameter);
            }
        });
        gwSettings.connect('changed::temperature-unit', function () {
            temperatureAction.state = resolveDefaultTemperatureUnit(gwSettings.get_enum('temperature-unit'));
        });
        this.add_action(temperatureAction);

        this.set_accels_for_action("win.selection-mode", ["Escape"]);
        this.set_accels_for_action("win.select-all", ["<Control>a"]);
        this.set_accels_for_action("app.quit", ["<Control>q"]);
    }

    vfunc_dbus_register(conn, path) {
        this._shellIntegration = new ShellIntegration();
        this._shellIntegration.export(conn, path);
        return true;
    }

    vfunc_dbus_unregister(conn, path) {
        this._shellIntegration.unexport(conn);
    }

    _createWindow() {
        const window = new Window.MainWindow({ application: this });

        // Store a weak reference to the window for cleanup...
        this.mainWindow = window;

        return window;
    }

    _showWindowWhenReady(win) {
        let notifyId;
        win.present();
        if (this.model.loading) {
            let timeoutId;
            let model = this.model;

            timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, function () {
                log('Timeout during model load, perhaps the network is not available?');
                model.disconnect(notifyId);

                return false;
            });
            notifyId = this.model.connect('notify::loading', function (model) {
                if (model.loading)
                    return;

                model.disconnect(notifyId);
                GLib.source_remove(timeoutId);
            });
        }

        return win;
    }

    vfunc_activate() {
        let win = this._createWindow();
        win.showDefault();
        this._showWindowWhenReady(win);
    }

    vfunc_shutdown() {
        GWeather.Info.store_cache();
        this.model.saveSettingsNow();

        // Ensure our main window is cleaned up before we exit.
        this.mainWindow?.run_dispose();
        this.mainWindow = undefined;

        super.vfunc_shutdown();
    }
};

GObject.registerClass(WeatherApplication);
