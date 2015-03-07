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

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Gnome = imports.gi.GnomeDesktop;
const Lang = imports.lang;

const Forecast = imports.app.forecast;
const WForecast = imports.app.weeklyForecast;
const Params = imports.misc.params;
const Util = imports.misc.util;

const SPINNER_SIZE = 128;

const WeatherWidget = new Lang.Class({
    Name: 'WeatherWidget',
    Extends: Gtk.Frame,

    _init: function(params) {
        params = Params.fill(params, { shadow_type: Gtk.ShadowType.NONE,
                                       name: 'weather-page' });
        this.parent(params);

        this._currentStyle = null;
        this._info = null;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/Weather/Application/city.ui');

        let outerBox = builder.get_object('outer-box');
        this._contentFrame = builder.get_object('content-frame');
        this._outerGrid = builder.get_object('outer-grid');
        this._wForecastFrame = builder.get_object('weekly-forecast-frame');
        this._icon = builder.get_object('conditions-image');
        this._temperature = builder.get_object('temperature-label');
        this._conditions = builder.get_object('conditions-label');
        this.timeLabel = builder.get_object('time-label');
        this.timeGrid = builder.get_object('time-grid');

        this._weeklyForecasts = new WForecast.WeeklyForecastFrame();
        this._outerGrid.attach(this._weeklyForecasts, 1, 0, 1, 2);

        this._forecasts = { };
        this._hadjustments = { };

        for (let t of ['today', 'tomorrow']) {
            let box = new Forecast.ForecastBox({ hexpand: false });

            this._forecasts[t] = box;
            builder.get_object('forecast-' + t + '-grid').add(box);

            let fsw = builder.get_object('forecast-' + t);
            let hscrollbar = fsw.get_hscrollbar();
            hscrollbar.set_opacity(0.0);
            hscrollbar.hide();
            let hadjustment = fsw.get_hadjustment();
            hadjustment.connect('changed', Lang.bind(this, this._syncLeftRightButtons));
            hadjustment.connect('value-changed', Lang.bind(this, this._syncLeftRightButtons));

            this._hadjustments[t] = hadjustment;
        }

        this._dayStack = builder.get_object('forecast-stack');
        this._leftButton = builder.get_object('left-button');
        this._rightButton = builder.get_object('right-button');

        this._dayStack.connect('notify::visible-child', Lang.bind(this, function() {
            let visible_child = this._dayStack.visible_child;
            if (visible_child == null)
                return; // can happen at destruction

            let hadjustment = visible_child.get_hadjustment();
            hadjustment.value = hadjustment.get_lower();
            this._syncLeftRightButtons();

            if (this._tickId) {
                this.remove_tick_callback(this._tickId);
                this._tickId = 0;
            }
        }));

        this._leftButton.connect('clicked', Lang.bind(this, function() {
            let hadjustment = this._dayStack.visible_child.get_hadjustment();
            this._target = hadjustment.value - hadjustment.page_size;
            if (this._target <= hadjustment.get_lower()) {
                this._leftButton.set_sensitive(false);
                this._rightButton.set_sensitive(true);
            } else
                this._rightButton.set_sensitive(true);

            this._start = new Date().getTime();
            this._end = this._start + 328;
            this._tickId = this.add_tick_callback(Lang.bind(this, this._animate));
        }));

        this._rightButton.connect('clicked', Lang.bind(this, function() {
            let hadjustment = this._dayStack.visible_child.get_hadjustment();
            this._target = hadjustment.value + hadjustment.page_size;
            if (this._target >= hadjustment.get_upper() - hadjustment.page_size) {
                this._rightButton.set_sensitive(false);
                this._leftButton.set_sensitive(true);
            } else
                this._leftButton.set_sensitive(true);

            this._start = new Date().getTime();
            this._end = this._start + 328;
            this._tickId = this.add_tick_callback(Lang.bind(this, this._animate));
        }));

        this.add(outerBox);
    },

    _syncLeftRightButtons: function() {
        let hadjustment = this._dayStack.visible_child.get_hadjustment();
        if ((hadjustment.get_upper() - hadjustment.get_lower()) == hadjustment.page_size) {
            this._leftButton.set_sensitive(false);
            this._rightButton.set_sensitive(false);
        } else if (hadjustment.value == hadjustment.get_lower()){
            this._leftButton.set_sensitive(false);
            this._rightButton.set_sensitive(true);
        } else if (hadjustment.value >= (hadjustment.get_upper() - hadjustment.page_size)){
            this._leftButton.set_sensitive(true);
            this._rightButton.set_sensitive(false);
        } else {
            this._leftButton.set_sensitive(true);
            this._rightButton.set_sensitive(true);
        }
    },

    _animate: function() {
        let hadjustment = this._dayStack.visible_child.get_hadjustment();
        let value = hadjustment.value;
        let t = 1.0;
        let now = new Date().getTime();
        if (now < this._end) {
            t = (now - this._start) / 700;
            t = this._easeOutCubic (t);
            hadjustment.value = value + t * (this._target - value);
            return true;
        } else {
            hadjustment.value = value + t * (this._target - value);
            this.remove_tick_callback(this._tickId);
            this._tickId = 0;
            return false;
        }
    },

    _easeOutCubic: function(value) {
        let temp = value - 1;
        return temp * temp * temp + 1;
    },

    clear: function() {
        for (let t of ['today', 'tomorrow'])
            this._forecasts[t].clear();

        if (this._tickId) {
            this.remove_tick_callback(this._tickId);
            this._tickId = 0;
        }
    },

    _get_style_class: function(info) {
        let icon = info.get_icon_name();
        let name = icon.replace(/(-\d{3})/, "");
        return name;
    },

    update: function(info) {
        this._info = info;

        this._conditions.label = Util.getWeatherConditions(info);
        this._temperature.label = info.get_temp_summary();

        this._icon.icon_name = info.get_symbolic_icon_name();
        let context = this._contentFrame.get_style_context();
        if (this._currentStyle)
            context.remove_class(this._currentStyle);
        this._currentStyle = this._get_style_class(info);
        context.add_class(this._currentStyle);

        let forecasts = info.get_forecast_list();
        for (let t of ['today', 'tomorrow'])
            this._forecasts[t].update(forecasts, t);

        if (forecasts.length == 0) {
            this._weeklyForecasts.hide();
        } else {
            this._weeklyForecasts.show();
            this._weeklyForecasts.update(forecasts);
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

        this.infoPage = new WeatherWidget();
        this.add_named(this.infoPage, 'info');

        this._info = null;
        this._updateId = 0;

        this.connect('destroy', Lang.bind(this, this._onDestroy));

        this._wallClock = new Gnome.WallClock();
        this._clockHandlerId = null;
    },

    get info() {
        return this._info;
    },

    set info(info) {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;

            this.infoPage.clear();
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
        this.infoPage.clear();

        getApp().model.updateInfo(this._info);
    },

    _onUpdate: function(info) {
        this.infoPage.clear();
        this.infoPage.update(info);
        this._updateTime();
        this._spinner.stop();
        this.visible_child_name = 'info';
    },

    connectClock: function() {
        this._clockHandlerId = this._wallClock.connect('notify::clock', Lang.bind(this, this._updateTime));
    },

    _updateTime: function() {
        this.infoPage.timeLabel.label = this._getTime();
    },

    _getTime: function() {
        if (this._info != null) {
            let location = this._info.location;
            let tz = GLib.TimeZone.new(location.get_timezone().get_tzid());
            let dt = GLib.DateTime.new_now(tz);
            return dt.format(_("%H:%M"));
        }
        return null;
    },

    disconnectClock: function() {
        if (this._clockHandlerId) {
            this._wallClock.disconnect(this._clockHandlerId);
            this._clockHandlerId = null;
        }
    }
});
