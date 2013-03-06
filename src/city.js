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

        let outerBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL });

        this._currentStyle = null;
        this._contentFrame = new Gtk.Frame({ shadow_type: Gtk.ShadowType.NONE,
                                             name: 'weather-page-content-view' });
        outerBox.add(this._contentFrame);

        let outerGrid = new Gtk.Grid();
        this._contentFrame.add(outerGrid);

        let alignment = new Gtk.Grid({ hexpand: true, vexpand: true,
                                       halign: Gtk.Align.CENTER,
                                       valign: Gtk.Align.CENTER });

        let innerGrid = new Gtk.Grid({ column_spacing: 20,
                                       hexpand: false,
                                       vexpand: false });
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

        alignment.add(innerGrid);
        outerGrid.attach(alignment, 0, 0, 1, 1);

        this._forecasts = new Forecast.ForecastBox({ hexpand: true });
        outerGrid.attach(this._forecasts, 0, 1, 2, 1);

        this._revealButton = new Gd.HeaderSimpleButton({ symbolic_icon_name: 'go-previous-symbolic',
                                                         halign: Gtk.Align.CENTER,
                                                         valign: Gtk.Align.CENTER });
        let context = this._revealButton.get_style_context();
        context.add_class('osd');

        outerGrid.attach(this._revealButton, 1, 0, 1, 2);

        this._today = new Forecast.TodaySidebar({ vexpand: true,
                                                  name: 'today-sidebar' });
        this._revealer = new Gd.Revealer({ child: this._today,
                                           reveal_child: false,
                                           orientation: Gtk.Orientation.VERTICAL });
        outerBox.add(this._revealer);

        this._revealButton.connect('clicked', Lang.bind(this, function() {
            if (this._revealer.reveal_child) {
                this._revealer.reveal_child = false;
                this._revealButton.symbolic_icon_name = 'go-previous-symbolic';
            } else {
                this._revealer.reveal_child = true;
                this._revealButton.symbolic_icon_name = 'go-next-symbolic';
            }
        }));

        this.add(outerBox);
    },

    clear: function() {
        this._forecasts.clear();
        this._today.clear();
    },

    _get_style_class: function(info) {
        let icon = info.get_icon_name();
        let name = icon.replace(/(-\d{3})/, "");
        return name;
    },

    update: function(info) {
        this._conditions.label = Util.getWeatherConditions(info);
        this._temperature.label = info.get_temp_summary();

        this._icon.icon_name = info.get_symbolic_icon_name();
        let context = this._contentFrame.get_style_context();
        if (this._currentStyle)
            context.remove_class(this._currentStyle);
        this._currentStyle = this._get_style_class(info);
        context.add_class(this._currentStyle);

        let forecasts = info.get_forecast_list();
        if (forecasts.length > 0) {
            this._forecasts.update(forecasts);
            this._forecasts.show();

            this._today.update(info);
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
        this.parent(params);

        let loadingPage = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
                                         halign: Gtk.Align.CENTER,
                                         valign: Gtk.Align.CENTER });

        this._spinner = new Gtk.Spinner({ height_request: SPINNER_SIZE,
                                          width_request: SPINNER_SIZE });
        loadingPage.add(this._spinner);
        loadingPage.add(new Gtk.Label({ label: _("Loading…"),
                                        name: "loading-label" }));
        this.add_named(loadingPage, 'loading');

        this._infoPage = new WeatherWidget();
        this.add_named(this._infoPage, 'info');

        this._info = null;
        this._updateId = 0;
    },

    get info() {
        return this._info;
    },

    set info(info) {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;

            this._infoPage.clear();
        }

        this._info = info;

        if (info) {
            this._updateId = this._info.connect('updated',
                                                Lang.bind(this, this._onUpdate));
            if (info.is_valid())
                this._onUpdate(info);
        }
    },

    vfunc_destroy: function() {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;
        }

        this.parent();
    },

    update: function() {
        this.visible_child_name = 'loading';
        this._spinner.start();
        this._infoPage.clear();

        this._info.update();
    },

    _onUpdate: function(info) {
        this._infoPage.update(info);
        this._spinner.stop();
        this.visible_child_name = 'info';
    }
});
