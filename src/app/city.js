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

const Mainloop = imports.mainloop;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gnome = imports.gi.GnomeDesktop;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const GWeather = imports.gi.GWeather;

const WorldView = imports.app.world;
const HourlyForecast = imports.app.hourlyForecast;
const DailyForecast = imports.app.dailyForecast;
const Util = imports.misc.util;

const SPINNER_SIZE = 128;

const SCROLLING_ANIMATION_TIME = 400000; //us

var WeatherWidget = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/weather-widget.ui',
    InternalChildren: ['contentFrame', 'outerGrid', 'conditionsImage',
                       'placesButton', 'placesLabel','temperatureLabel',
                       'forecastStack','leftButton', 'rightButton',
                       'forecast-hourly', 'forecast-hourly-alignment',
                       'forecast-daily', 'forecast-daily-alignment',
                       'updatedTimeLabel'],
}, class WeatherWidget extends Gtk.Frame {

    _init(application, window, params) {
        super._init(Object.assign({
            shadow_type: Gtk.ShadowType.NONE,
            name: 'weather-page'
        }, params));

        this._info = null;

        this._worldView = new WorldView.WorldContentView(application, window);
        this._placesButton.set_popover(this._worldView);

        this._dailyForecasts = new DailyForecast.DailyForecastFrame();

        this._forecasts = { };

        for (let t of ['hourly', 'daily']) {
            let box;
            if (t == 'hourly') {
                box = new HourlyForecast.HourlyForecastFrame();
            } else {
                box = new DailyForecast.DailyForecastFrame();
            }

            this._forecasts[t] = box;
            this['_forecast_' + t + '_alignment'].add(box);

            let fsw = this['_forecast_' + t];
            let hscrollbar = fsw.get_hscrollbar();
            hscrollbar.set_opacity(0.0);
            hscrollbar.hide();
            let hadjustment = fsw.get_hadjustment();
            hadjustment.connect('changed', () => this._syncLeftRightButtons());
            hadjustment.connect('value-changed', () => this._syncLeftRightButtons());
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

        this._updatedTime = null;
        Mainloop.timeout_add(1000, () => {
            this._updatedTimeLabel.label = this._formatUpdatedTime();
            return true;
        }, null);
    }

    _syncLeftRightButtons() {
        let hadjustment = this._forecastStack.visible_child.get_hadjustment();
        if ((hadjustment.get_upper() - hadjustment.get_lower()) == hadjustment.page_size) {
            this._leftButton.hide();
            this._rightButton.hide();
        } else if (hadjustment.value == hadjustment.get_lower()){
            this._leftButton.hide();
            this._rightButton.show();
        } else if (hadjustment.value >= (hadjustment.get_upper() - hadjustment.page_size)){
            this._leftButton.show();
            this._rightButton.hide();
        } else {
            this._leftButton.show();
            this._rightButton.show();
        }
    }

    _beginScrollAnimation(target) {
        let start = this.get_frame_clock().get_frame_time();
        let end = start + SCROLLING_ANIMATION_TIME;

        if (this._tickId != 0)
            this.remove_tick_callback(this._tickId);

        this._tickId = this.add_tick_callback(() => this._animate(target, start, end));
    }

    _animate(target, start, end) {
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
    }

    clear() {
        for (let t of ['hourly', 'daily'])
            this._forecasts[t].clear();

        if (this._tickId) {
            this.remove_tick_callback(this._tickId);
            this._tickId = 0;
        }
    }

    getForecastStack() {
        return this._forecastStack;
    }

    update(info) {
        this._info = info;

        let location = info.location;
        let city = location;
        if (location.get_level() == GWeather.LocationLevel.WEATHER_STATION)
            city = location.get_parent();

        let country = city.get_parent();
        while (country && country.get_level() > GWeather.LocationLevel.COUNTRY)
            country = country.get_parent();

        if (country)
            this._placesLabel.set_text(city.get_name() + ', ' + country.get_name());
        else
            this._placesLabel.set_text(city.get_name());

        this._worldView.refilter();

        this._conditionsImage.icon_name = info.get_symbolic_icon_name();
        this._temperatureLabel.label = Util.getTempString(info);

        let forecasts = info.get_forecast_list();
        let tz = GLib.TimeZone.new(info.location.get_timezone().get_tzid());
        for (let t of ['hourly', 'daily'])
            this._forecasts[t].update(forecasts, tz);

        this._updatedTime = Date.now();
        this._updatedTimeLabel.label = this._formatUpdatedTime();
    }

    _formatUpdatedTime() {
        if (this._updatedTime == null)
            return '';

        const milliseconds = Date.now() - this._updatedTime;

        const seconds = milliseconds / 1000;
        if (seconds < 60)
            return _('Updated just now.');

        const minutes = seconds / 60;
        if (minutes < 60)
            return ngettext(
                'Updated %d minute ago.',
                'Updated %d minutes ago.', minutes).format(minutes);

        const hours = minutes / 60;
        if (hours < 24)
            return ngettext(
                'Updated %d hour ago.',
                'Updated %d hours ago.', hours).format(hours);

        const days = hours / 24;
        if (days < 7)
            return ngettext(
                'Updated %d day ago.',
                'Updated %d days ago.', days).format(days);

        const weeks = days / 7;
        if (days < 30)
            return ngettext(
                'Updated %d week ago.',
                'Updated %d weeks ago.', weeks).format(weeks);

        const months = days / 30;
        return ngettext(
            'Updated %d month ago.',
            '%d months ago.', months).format(months);
    }
});

var WeatherView = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/city.ui',
    InternalChildren: ['spinner']
}, class WeatherView extends Gtk.Stack {

    _init(application, window, params) {
        super._init(params);

        this._infoPage = new WeatherWidget(application, window);
        this.add_named(this._infoPage, 'info');

        this._info = null;
        this._updateId = 0;

        this.connect('destroy', () => this._onDestroy());

        this._wallClock = new Gnome.WallClock();
        this._clockHandlerId = 0;

        this._desktopSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
    }

    get info() {
        return this._info;
    }

    set info(info) {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;

            this._infoPage.clear();
        }

        this._info = info;

        if (info) {
            this._updateId = this._info.connect('updated', (info) => {
                this._onUpdate(info)
            });
            if (info.is_valid())
                this._onUpdate(info);
        }
    }

    _onDestroy() {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;
        }
    }

    update() {
        this.visible_child_name = 'loading';
        this._spinner.start();
        this._infoPage.clear();

        getApp().model.updateInfo(this._info);
    }

    _onUpdate(info) {
        this._infoPage.clear();
        this._infoPage.update(info);
        this._spinner.stop();
        this.visible_child_name = 'info';
    }

    getInfoPage() {
        return this._infoPage;
    }
});
