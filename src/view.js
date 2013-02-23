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

        let outerGrid = new Gtk.Grid();

        let alignment = new Gtk.Grid({ hexpand: true, vexpand: true,
                                       halign: Gtk.Align.CENTER,
                                       valign: Gtk.Align.CENTER });

        let innerGrid = new Gtk.Grid({ hexpand: false, vexpand: false });
        this._icon = new Gtk.Image({ pixel_size: 172,
                                     use_fallback: true,
                                     name: 'conditions-image' });
        innerGrid.attach(this._icon, 0, 0, 1, 2);

        this._temperature = new Gtk.Label({ xalign: 0.0,
                                            name: 'temperature-label',
                                            vexpand: true,
                                            valign: Gtk.Align.END });
        innerGrid.attach(this._temperature, 1, 0, 1, 1);

        this._conditions = new Gtk.Label({ xalign: 0.0,
                                           name: 'condition-label',
                                           valign: Gtk.Align.END });
        innerGrid.attach(this._conditions, 1, 1, 1, 1);

        this._attribution = new Gtk.Label({ xalign: 0.0, wrap: true,
                                            name: 'attribution-label',
                                            use_markup: true });
        innerGrid.attach(this._attribution, 1, 2, 1, 1);

        alignment.add(innerGrid);
        outerGrid.attach(alignment, 0, 0, 1, 1);

        this._forecasts = new Forecast.ForecastBox({ hexpand: true });
        outerGrid.attach(this._forecasts, 0, 1, 1, 1);

        this._revealButton = new Gd.HeaderSimpleButton({ symbolic_icon_name: 'go-previous-symbolic',
                                                         halign: Gtk.Align.CENTER,
                                                         valign: Gtk.Align.CENTER });
        outerGrid.attach(this._revealButton, 1, 0, 1, 2);

        this._today = new Forecast.TodaySidebar({ vexpand: true,
                                                  name: 'today-sidebar' });
        this._revealer = new Gd.Revealer({ child: this._today,
                                           reveal_child: false,
                                           orientation: Gtk.Orientation.VERTICAL });
        outerGrid.attach(this._revealer, 2, 0, 1, 2);

        this._revealButton.connect('clicked', Lang.bind(this, function() {
            if (this._revealer.reveal_child) {
                this._revealer.reveal_child = false;
                this._revealButton.symbolic_icon_name = 'go-previous-symbolic';
            } else {
                this._revealer.reveal_child = true;
                this._revealButton.symbolic_icon_name = 'go-next-symbolic';
            }
        }));

        this.add(outerGrid);
    },

    clear: function() {
        this._forecasts.clear();
        this._today.clear();
    },

    update: function(info) {
        let conditions = info.get_conditions();
        if (conditions == '-') // Not significant
            conditions = info.get_sky();
        this._conditions.label = conditions;
        this._temperature.label = info.get_temp_summary();

        let attr = info.get_attribution();
        if (attr) {
            this._attribution.label = attr;
            this._attribution.show();
        } else {
            this._attribution.hide();
        }

        this._icon.icon_name = info.get_symbolic_icon_name();

        let forecasts = info.get_forecast_list();
        if (forecasts.length > 0) {
            this._forecasts.update(forecasts);
            this._forecasts.show();

            this._today.update(forecasts);
            this._revealButton.show();
            this._revealer.show();
        } else {
            this._forecasts.hide();
            this._revealButton.hide();
            this._revealer.hide();
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
