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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gnome = imports.gi.GnomeDesktop;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Forecast = imports.app.forecast;
const WForecast = imports.app.weeklyForecast;
const Params = imports.misc.params;
const Util = imports.misc.util;

const SPINNER_SIZE = 128;

const SCROLLING_ANIMATION_TIME = 400000; //us

var WeatherWidget = new Lang.Class({
    Name: 'WeatherWidget',
    Extends: Gtk.Frame,
    Template: 'resource:///org/gnome/Weather/Application/weather-widget.ui',
    InternalChildren: ['contentFrame', 'outerGrid', 'conditionsImage',
                       'temperatureLabel', 'conditionsLabel', 'windLabel',
                       'timeLabel', 'timeGrid', 'forecastStack',
                       'leftButton', 'rightButton',
                       'forecast-today-grid', 'forecast-tomorrow-grid',
                       'forecast-today', 'forecast-tomorrow'],

    _init: function(params) {
        params = Params.fill(params, { shadow_type: Gtk.ShadowType.NONE,
                                       name: 'weather-page' });
        this.parent(params);

        this._currentStyle = null;
        this._info = null;

        this._weeklyForecasts = new WForecast.WeeklyForecastFrame();
        this._outerGrid.attach(this._weeklyForecasts, 1, 0, 1, 2);

        this._forecasts = { };

        for (let t of ['today', 'tomorrow']) {
            let box = new Forecast.ForecastBox({ hexpand: false });

            this._forecasts[t] = box;
            this['_forecast_' + t + '_grid'].add(box);

            let fsw = this['_forecast_' + t];
            let hscrollbar = fsw.get_hscrollbar();
            hscrollbar.set_opacity(0.0);
            hscrollbar.hide();
            let hadjustment = fsw.get_hadjustment();
            hadjustment.connect('changed', this._syncLeftRightButtons.bind(this));
            hadjustment.connect('value-changed', this._syncLeftRightButtons.bind(this));
        }

        this._forecastStack.connect('notify::visible-child', () => {
            let visible_child = this._forecastStack.visible_child;
            if (visible_child == null)
                return; // can happen at destruction

            let hadjustment = visible_child.get_hadjustment();
            hadjustment.value = hadjustment.get_lower();
            this._syncLeftRightButtons();

            if (this._tickId) {
                this.remove_tick_callback(this._tickId);
                this._tickId = 0;
            }
        });

        this._tickId = 0;

        this._leftButton.connect('clicked', () => {
            let hadjustment = this._forecastStack.visible_child.get_hadjustment();
            let target = hadjustment.value - hadjustment.page_size;

            this._beginScrollAnimation(target);
        });

        this._rightButton.connect('clicked', () => {
            let hadjustment = this._forecastStack.visible_child.get_hadjustment();
            let target = hadjustment.value + hadjustment.page_size;

            this._beginScrollAnimation(target);
        });
    },

    _syncLeftRightButtons: function() {
        let hadjustment = this._forecastStack.visible_child.get_hadjustment();
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

    _beginScrollAnimation: function(target) {
        let start = this.get_frame_clock().get_frame_time();
        let end = start + SCROLLING_ANIMATION_TIME;

        if (this._tickId != 0)
            this.remove_tick_callback(this._tickId);

        this._tickId = this.add_tick_callback(() => this._animate(target, start, end));
    },

    _animate: function(target, start, end) {
        let hadjustment = this._forecastStack.visible_child.get_hadjustment();
        let value = hadjustment.value;
        let t = 1.0;
        let now = this.get_frame_clock().get_frame_time();

        if (now < end) {
            t = (now - start) / SCROLLING_ANIMATION_TIME;
            t = Util.easeOutCubic (t);
            hadjustment.value = value + t * (target - value);
            return true;
        } else {
            hadjustment.value = value + t * (target - value);
            this._tickId = 0;
            return false;
        }
    },

    clear: function() {
        for (let t of ['today', 'tomorrow'])
            this._forecasts[t].clear();

        if (this._tickId) {
            this.remove_tick_callback(this._tickId);
            this._tickId = 0;
        }
    },

    _getStyleClass: function(info) {
        let icon = info.get_icon_name();
        let name = icon.replace(/(-\d{3})/, "");
        return name;
    },

    setTimeVisible: function(visible) {
        this._timeGrid.visible = visible;
    },

    setTime: function(time) {
        this._timeLabel.label = time;
    },

    update: function(info) {
        this._info = info;

        this._conditionsLabel.label = Util.getWeatherConditions(info);
        this._temperatureLabel.label = info.get_temp_summary();
        this._windLabel.label = info.get_wind();

        this._conditionsImage.icon_name = info.get_symbolic_icon_name();
        let context = this._contentFrame.get_style_context();
        if (this._currentStyle)
            context.remove_class(this._currentStyle);
        this._currentStyle = this._getStyleClass(info);
        context.add_class(this._currentStyle);

        let forecasts = info.get_forecast_list();
        for (let t of ['today', 'tomorrow'])
            this._forecasts[t].update(forecasts, t);

        if (!this._forecasts['today'].hasForecastInfo() && this._forecasts['tomorrow'].hasForecastInfo())
            this._forecastStack.set_visible_child_name('tomorrow');

        // FIXME: This doesn't make sense, since the above code assumes forecasts.length != 0.
        if (forecasts.length == 0) {
            this._weeklyForecasts.hide();
        } else {
            this._weeklyForecasts.show();
            this._weeklyForecasts.update(forecasts);
        }
    }
});

var WeatherView = new Lang.Class({
    Name: 'WeatherView',
    Extends: Gtk.Stack,
    Template: 'resource:///org/gnome/Weather/Application/city.ui',
    InternalChildren: ['spinner'],

    _init: function(params) {
        this.parent(params);

        this._infoPage = new WeatherWidget();
        this.add_named(this._infoPage, 'info');

        this._info = null;
        this._updateId = 0;

        this.connect('destroy', this._onDestroy.bind(this));

        this._wallClock = new Gnome.WallClock();
        this._clockHandlerId = 0;

        this._desktopSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
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
            this._updateId = this._info.connect('updated', this._onUpdate.bind(this));
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
        this._updateTime();
        this._spinner.stop();
        this.visible_child_name = 'info';
    },

    setTimeVisible: function(visible) {
        if (this._clockHandlerId && !visible) {
            this._wallClock.disconnect(this._clockHandlerId);
            this._clockHandlerId = 0;
        }

        if (!this._clockHandlerId && visible) {
            this._clockHandlerId = this._wallClock.connect('notify::clock', this._updateTime.bind(this));
        }

        this._infoPage.setTimeVisible(visible);
    },

    _updateTime: function() {
        this._infoPage.setTime(this._getTime());
    },

    _getTime: function() {
        if (this._info != null) {
            let location = this._info.location;
            let tz = GLib.TimeZone.new(location.get_timezone().get_tzid());
            let dt = GLib.DateTime.new_now(tz);

            return this._wallClock.string_for_datetime (dt,
                                                        this._desktopSettings.get_enum('clock-format'),
                                                        false, false, false);
        }
        return null;
    }
});
