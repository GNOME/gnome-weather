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

const Conditions = imports.conditions;
const Forecast = imports.forecast;
const Util = imports.util;

const SPINNER_SIZE = 128;

const WeatherWidget = new Lang.Class({
    Name: 'WeatherWidget',
    Extends: Gtk.Frame,

    _init: function(params) {
        params = Params.fill(params, { shadow_type: Gtk.ShadowType.NONE,
                                       name: 'weather-page' });
        this.parent(params);

        let grid = new Gtk.Grid();
        this._icon = new Gtk.Image({ pixel_size: 256,
                                     halign: Gtk.Align.CENTER,
                                     valign: Gtk.Align.CENTER,
                                     hexpand: true,
                                     vexpand: true });
        grid.attach(this._icon, 0, 0, 1, 1);

        this._conditions = new Conditions.ConditionsSidebar();
        grid.attach(this._conditions, 1, 0, 1, 1);

        this._forecasts = new Forecast.ForecastBox();
        grid.attach(this._forecasts, 0, 1, 2, 1);

        this.add(grid);
    },

    clear: function() {
        this._forecasts.clear();
    },

    update: function(info) {
        this._conditions.update(info);

        this._icon.icon_name = info.get_icon_name();

        let forecasts = info.get_forecast_list();
        if (forecasts.length > 0) {
            this._forecasts.update(forecasts);
            this._forecasts.show();
        } else {
            this._forecasts.hide();
        }
    }
});

const WeatherView = new Lang.Class({
    Name: 'WeatherView',
    Extends: Gd.Stack,

    _init: function(params) {
        let filtered = Params.filter(params, { info: null });
        this.parent(params);

        let loadingPage = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
                                         halign: Gtk.Align.CENTER,
                                         valign: Gtk.Align.CENTER });

        this._spinner = new Gtk.Spinner({ height_request: SPINNER_SIZE,
                                          width_request: SPINNER_SIZE });
        loadingPage.add(this._spinner);
        loadingPage.add(new Gtk.Label({ label: _("Loading..."),
                                        name: "loading-label" }));
        this.add_named(loadingPage, 'loading');

        this._infoPage = new WeatherWidget();
        this.add_named(this._infoPage, 'info');

        this._info = filtered.info;
        this._updateId = this._info.connect('updated',
                                            Lang.bind(this, this._onUpdate));
    },

    vfunc_destroy: function() {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;
        }

        this.parent();
    },

    beginUpdate: function() {
        this.visible_child_name = 'loading';
        this._spinner.start();
        this._infoPage.clear();
    },

    _onUpdate: function(info) {
        this._infoPage.update(info);
        this._spinner.stop();
        this.visible_child_name = 'info';
    }
});
