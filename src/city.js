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

const Atk = imports.gi.Atk;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Forecast = imports.forecast;
const Params = imports.params;
const Util = imports.util;

const SPINNER_SIZE = 128;

const WeatherWidget = new Lang.Class({
    Name: 'WeatherWidget',
    Extends: Gtk.Frame,

    _init: function(params) {
        params = Params.fill(params, { shadow_type: Gtk.ShadowType.NONE,
                                       name: 'weather-page' });
        this.parent(params);

        this._currentStyle = null;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/Weather/Application/city.ui');

        let outerBox = builder.get_object('outer-box');
        this._contentFrame = builder.get_object('content-frame');
        let outerGrid = builder.get_object('outer-grid');
        this._icon = builder.get_object('conditions-image');
        this._temperature = builder.get_object('temperature-label');
        this._conditions = builder.get_object('conditions-label');
        this._revealButton = builder.get_object('reveal-button');
        this._revealer = builder.get_object('revealer');

        this._forecasts = new Forecast.ForecastBox({ hexpand: true });
        outerGrid.attach(this._forecasts, 0, 1, 1, 1);

        this._today = new Forecast.TodaySidebar({ vexpand: true,
                                                  name: 'today-sidebar' });
        this._revealer.child = this._today;

        this._revealButton.connect('clicked', Lang.bind(this, function() {
            this._revealer.reveal_child = !this._revealer.reveal_child;
            this._syncRevealButton();
        }));
        this._syncRevealButton();

        this.add(outerBox);
    },

    _syncRevealButton: function() {
        let rtl = this.get_direction() == Gtk.TextDirection.RTL;

        if (this._revealer.reveal_child) {
            this._revealButton.get_child().icon_name = rtl ? 'go-next-rtl-symbolic' : 'go-next-symbolic';
            this._revealButton.get_accessible().ref_state_set().add_state(Atk.StateType.CHECKED);
        } else {
            this._revealButton.get_child().icon_name = rtl ? 'go-previous-rtl-symbolic' : 'go-previous-symbolic';
            this._revealButton.get_accessible().ref_state_set().remove_state(Atk.StateType.CHECKED);
        }
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
    Extends: Gtk.Stack,

    _init: function(params) {
        this.parent(params);
        this.get_accessible().accessible_name = _("City view");

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

        this.connect('destroy', Lang.bind(this, this._onDestroy));
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

    _onDestroy: function() {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;
        }
    },

    update: function() {
        this.visible_child_name = 'loading';
        this._spinner.start();
        this._infoPage.clear();

        getApp().model.updateInfo(this._info);
    },

    _onUpdate: function(info) {
        this._infoPage.clear();
        this._infoPage.update(info);
        this._spinner.stop();
        this.visible_child_name = 'info';
    }
});
